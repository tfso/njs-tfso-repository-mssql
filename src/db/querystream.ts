import * as MsSql from 'mssql';
import Enumerable from 'tfso-repository'

import { Query } from 'tfso-repository/lib/repository/db/query';
import { IRecordSet, RecordSet } from 'tfso-repository/lib/repository/db/recordset';

import { WhereOperator } from 'tfso-repository/lib/linq/operators/whereoperator';
import { SkipOperator } from 'tfso-repository/lib/linq/operators/skipoperator';
import { TakeOperator } from 'tfso-repository/lib/linq/operators/takeoperator';

import Connection, { IsolationLevel } from './connection'

export abstract class QueryStream<TEntity> extends Query<TEntity> {
    private _connection: MsSql.Connection;
    private _transaction: MsSql.Transaction;

    private _ignoreReadLocks: Array<MsSql.IIsolationLevel> = []

    constructor(connection?: MsSql.Connection | MsSql.Transaction, ignoreReadLock?: Array<IsolationLevel>) 
    constructor(ignoreReadLock?: Array<IsolationLevel>) 
    constructor() {
        super();

        let connection: MsSql.Connection | MsSql.Transaction,
            ignoreReadLock = []

        switch(arguments.length) {
            case 2:
                if(arguments[0] instanceof MsSql.Connection || arguments[0] instanceof MsSql.Transaction)
                    connection = arguments[0]

                if(Array.isArray(arguments[1])) 
                    ignoreReadLock = arguments[1]

                break

            default:
                if(arguments[0] instanceof MsSql.Connection || arguments[0] instanceof MsSql.Transaction)
                    connection = arguments[0]

                if(Array.isArray(arguments[0]))
                    ignoreReadLock = arguments[0]

                break
        }

        if (connection != null)
            this.connection = connection;

        this._ignoreReadLocks.push(...ignoreReadLock.map(level => Connection.getIsolationLevel(level)))
    }

    public set connection(connection: MsSql.Transaction | MsSql.Connection) {
        if (connection instanceof MsSql.Transaction) {
            this._transaction = connection;
            this._connection = connection.connection;
        }
        else {
            this._connection = connection;
        }
    }

    protected get readLock(): boolean {
        if(this._transaction) {
            if(this._ignoreReadLocks && this._ignoreReadLocks.includes(this._transaction.isolationLevel))
                return false

            return true
        }
        
        return false
    }

    protected input(name: string, value: any): void
    protected input(name: string, type: any, value: any): void
    protected input(name: string, type: any, value?: any): void {
        if (arguments.length == 2) {
            value = type; type = null;
        }

        this.parameters[name] = { name: name, type: type, value: value };
    }

    protected createRequest(): MsSql.Request {
        return new MsSql.Request();
    }

    protected executeQuery(): Promise<IRecordSet<TEntity>> {
        return new Promise((resolve, reject) => {
            try {
                let request = this.createRequest(), // thread safe as we have a request object for each promise
                    error: Error = null,
                    records: Array<TEntity> = [],
                    totalRecords: number = -1,
                    totalPredicateIterations: number = 0,
                    predicate: (entity: TEntity) => boolean,
                    timed: number,
                    cancelled: boolean = false,
                    completed: boolean = false;

                request.stream = true;
                request.multiple = true;
                request.connection = this._connection;
                request.transaction = this._transaction;

                var skip: number = undefined, skipped: number = 0, skipOperator: SkipOperator<TEntity> = null,
                    take: number = undefined, taken: number = 0, takeOperator: TakeOperator<TEntity> = null;

                for (let operator of this.query.operations.values())
                {
                    if (operator instanceof WhereOperator)
                    {
                        if (predicate == null)
                            predicate = operator.predicate;
                        else
                            break;
                    }

                    else if (skip == null && operator instanceof SkipOperator)
                    {
                        skipOperator = operator;
                        skip = (<SkipOperator<TEntity>>operator).count;
                    }

                    else if (take == null && operator instanceof TakeOperator)
                    {
                        takeOperator = operator;
                        take = (<TakeOperator<TEntity>>operator).count;
                    }
                }

                if (skipOperator != null) this.query.operations.remove(skipOperator); // we are manually skipping, remove it from enumerable
                if (takeOperator != null) this.query.operations.remove(takeOperator); // we are manually taking, remove it from enumerable


                if (predicate == null)
                    predicate = (entity) => true;

                for (let key in this.parameters) {
                    let param = this.parameters[key];

                    if (param.type == null)
                        request.input(param.name, param.value);
                    else
                        request.input(param.name, param.type, param.value);
                }

                request.on('recordset', (columns) => {
                    if (totalRecords < 0)
                        totalRecords = -1; // reset totalRecords if it isn't set

                    records.length = 0;
                    skipped = 0;
                    taken = 0;
                });

                request.on('row', (row) => {
                    var entity: TEntity = null;

                    if (cancelled)
                        return;

                    try {
                        if (totalRecords == -1) {
                            // only go here at first row in any recordset if it isn't set
                            if (row['pagingTotalCount'] && isNaN(row['pagingTotalCount']) == false)
                                totalRecords = Number(row['pagingTotalCount'])
                            else
                                totalRecords = -2;
                        }

                        if (completed == false || (completed == true && skip != null)) { // if completed and query is trying to get paging total count we have to count them as predicate will narrow down result even more
                            entity = this.transform(row);

                            if (predicate(entity) === true) {
                                if (skip == null || ++skipped > skip) {
                                    if (take == null || ++taken <= take)
                                        records.push(entity);
                                    else
                                        completed = true;
                                }

                                totalPredicateIterations++;
                            }
                        }
                    }
                    catch (ex) {
                        cancelled = true;
                        error = ex;
                    }
                });

                request.on('error', (err) => {
                    error = err;
                });

                request.on('done', (affected) => {
                    if (error != null)
                        reject(this.transformError(error));
                    else
                        resolve(new RecordSet(records, affected, (Date.now() - timed), skip != null ? totalPredicateIterations : (totalRecords >= 0 ? totalRecords : undefined) ));
                });

                timed = Date.now();
                request.query(this.commandText);
            }
            catch (ex) {
                reject(this.transformError(ex));
            }
        })
    }

    protected abstract transform(record: any): TEntity;

    private transformError(err: Error): Error {
        try {
            return Object.assign(err, { 
                _sql: this.commandText, 
                _parameters: Object
                    .entries(this.parameters)
                    .reduce((out, [key, { value }]) => { 
                        out[key] = value; 
                        return out 
                    }, {}) 
            })
        }
        catch(ex) {
            return err
        }
    }
}

export default QueryStream

export { RecordSet }