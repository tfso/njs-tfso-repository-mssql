import * as MsSql from 'mssql';
import Enumerable from 'tfso-repository'

import { Query } from 'tfso-repository/lib/repository/db/query';
import { IRecordSet, RecordSet } from 'tfso-repository/lib/repository/db/recordset';

import { WhereOperator } from 'tfso-repository/lib/linq/operators/whereoperator';
import { SkipOperator } from 'tfso-repository/lib/linq/operators/skipoperator';
import { TakeOperator } from 'tfso-repository/lib/linq/operators/takeoperator';

export abstract class QueryRecordSet<TEntity> extends Query<TEntity> {
    private _connection: MsSql.Connection;
    private _transaction: MsSql.Transaction;

    private _ignoreReadLocks: Array<MsSql.IIsolationLevel> = []

    constructor(connection?: MsSql.Connection | MsSql.Transaction, ignoreReadLock?: Array<MsSql.IIsolationLevel>) 
    constructor(ignoreReadLock?: Array<MsSql.IIsolationLevel>) 
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

        this._ignoreReadLocks.push(...ignoreReadLock)
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

    protected executeQuery(): Promise<RecordSet<TEntity>> {
        return new Promise((resolve, reject) => {
            try {
                let request = this.createRequest(), // thread safe as we have a request object for each promise
                    predicate: (entity: TEntity) => boolean,
                    timed = Date.now(),
                    totalRecords = -1;

                request.multiple = true;
                request.connection = this._connection;
                request.transaction = this._transaction;

                for (let key in this.parameters) {
                    let param = this.parameters[key];

                    if(param.type == null)
                        request.input(param.name, param.value);
                    else
                        request.input(param.name, param.type, param.value);
                }

                request.query<any>(this.commandText, (err, recordset, rowsAffected) => {
                    if (err)
                        return reject(this.transformError(err));

                    try {
                        let results: Array<any> = [];

                        for (let i = 0; i < recordset.length; i++) {
                            // go through each recordset and check for totalRecords
                            if (totalRecords == -1) {
                                let row: any = null;

                                if (Array.isArray(recordset[i]) && recordset[i].length > 0)
                                    row = recordset[i][0];

                                if (row) {
                                    if (row['pagingTotalCount'] && isNaN(row['pagingTotalCount']) == false) {
                                        totalRecords = Number(row['pagingTotalCount'])
                                    }
                                }
                            }

                            // set last recordset as the result recordset
                            results = recordset[i];
                        }

                        // should really validate this.query to see if operators Where, Skip, Take, OrderBy etc comes in correct order otherwhise it's not supported for this kind of database
                        let where = this.query.operations.first(WhereOperator),
                            predicate: (entity: TEntity) => boolean,
                            entities: Array<TEntity>;

                        if (where) {
                            this.query.operations.remove(where);

                            predicate = where.predicate;
                        }

                        entities = results.map(this.transform);
                        if (predicate) {
                            entities = entities.filter(predicate);

                            if (this.query.operations.first(SkipOperator) || this.query.operations.first(TakeOperator))
                                totalRecords = entities.length;
                        }

                        resolve(new RecordSet(recordset ? this.query.toArray(entities) : [], rowsAffected, Date.now() - timed, totalRecords >= 0 ? totalRecords : undefined));
                    }
                    catch (ex) {
                        reject(this.transformError(ex));
                    }
                });
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

export default QueryRecordSet

export { RecordSet }