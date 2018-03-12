import * as MsSql from 'mssql';
import Repository from 'tfso-repository'

import { Query } from 'tfso-repository/lib/repository/db/query';
import { IRecordSet, RecordSet } from 'tfso-repository/lib/repository/db/recordset';

import { WhereOperator } from 'tfso-repository/lib/linq/operators/whereoperator';
import { SkipOperator } from 'tfso-repository/lib/linq/operators/skipoperator';
import { TakeOperator } from 'tfso-repository/lib/linq/operators/takeoperator';

export abstract class QueryStream<TEntity> extends Query<TEntity> {
    private _connection: MsSql.ConnectionPool;
    private _transaction: MsSql.Transaction;

    constructor(connection?: MsSql.ConnectionPool | MsSql.Transaction) {
        super();

        if (connection != null)
            this.connection = connection;
    }

    public set connection(connection: MsSql.Transaction | MsSql.ConnectionPool) {
        if (connection instanceof MsSql.Transaction) {
            this._transaction = connection;
            this._connection = null;
        }
        else {
            this._connection = connection;
            this._transaction = null;
        }
    }

    protected get readLock(): boolean {
        return this._transaction ? true : false;
    }

    protected input(name: string, value: any): void
    protected input(name: string, type: any, value: any): void
    protected input(name: string, type: any, value?: any): void {
        if (arguments.length == 2) {
            value = type; type = null;
        }

        this.parameters[name] = { name: name, type: type, value: value };
    }


    protected createRequest(): MsSql.Request
    protected createRequest(connection: MsSql.ConnectionPool): MsSql.Request
    protected createRequest(transaction: MsSql.Transaction): MsSql.Request
    protected createRequest(): MsSql.Request {
        return new MsSql.Request(arguments[0]);
    }

    protected executeQuery(): Promise<IRecordSet<TEntity>> {
        return new Promise((resolve, reject) => {
            try {
                let request: MsSql.Request,
                    error: Error = null,
                    records: Array<TEntity> = [],
                    totalRecords: number = -1,
                    totalPredicateIterations: number = 0,
                    predicate: (entity: TEntity) => boolean,
                    timed: number,
                    cancelled: boolean = false,
                    completed: boolean = false;

                // thread safe as we have a request object for each promise
                if(this._transaction != null)
                    request = this.createRequest(this._transaction);
                else
                    request = this.createRequest(this._connection);


                request.stream = true;
                

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

                request.on('done', (result: MsSql.IResult<TEntity>) => {
                    if (error != null)
                        reject(error);
                    else
                        resolve(new RecordSet(records, result.rowsAffected.reduce( (total, affected) => total += affected, 0), (Date.now() - timed), skip != null ? totalPredicateIterations : (totalRecords >= 0 ? totalRecords : undefined) ));
                });

                timed = Date.now();
                request.query(this.commandText);
            }
            catch (ex) {
                reject(ex);
            }
        })
    }

    protected abstract transform(record: any): TEntity;
}

export default QueryStream

export { RecordSet }