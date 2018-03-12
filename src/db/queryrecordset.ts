import * as MsSql from 'mssql';
import Repository from 'tfso-repository'

import { Query } from 'tfso-repository/lib/repository/db/query';
import { IRecordSet, RecordSet } from 'tfso-repository/lib/repository/db/recordset';

import { WhereOperator } from 'tfso-repository/lib/linq/operators/whereoperator';
import { SkipOperator } from 'tfso-repository/lib/linq/operators/skipoperator';
import { TakeOperator } from 'tfso-repository/lib/linq/operators/takeoperator';

export abstract class QueryRecordSet<TEntity> extends Query<TEntity> {
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
        }
        else {
            this._connection = connection;
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

    protected createRequest(connection?: MsSql.ConnectionPool): MsSql.Request
    protected createRequest(transaction?: MsSql.Transaction): MsSql.Request
    protected createRequest(): MsSql.Request {
        return new MsSql.Request(arguments[0]);
    }

    protected executeQuery(): Promise<RecordSet<TEntity>> {
        return new Promise((resolve, reject) => {
            try {
                let request: MsSql.Request,
                    predicate: (entity: TEntity) => boolean,
                    timed = Date.now(),
                    totalRecords = -1;

                // thread safe as we have a request object for each promise
                if(this._transaction != null)
                    request = this.createRequest(this._transaction);
                else
                    request = this.createRequest(this._connection);

                for (let key in this.parameters) {
                    let param = this.parameters[key];

                    if(param.type == null)
                        request.input(param.name, param.value);
                    else
                        request.input(param.name, param.type, param.value);
                }

                request.query<TEntity>(this.commandText, (err, result) => {
                    if (err)
                        return reject(err);

                    try {
                        let results: Array<TEntity> = [],
                            rowsAffected = 0;

                        for (let i = 0; i < result.recordsets.length; i++) {
                            // go through each recordset and check for totalRecords
                            if (totalRecords == -1) {
                                let row: any = null;

                                if (Array.isArray(result.recordsets[i]) && result.recordsets[i].length > 0)
                                    row = result.recordsets[i][0];

                                if (row) {
                                    if (row['pagingTotalCount'] && isNaN(row['pagingTotalCount']) == false) {
                                        totalRecords = Number(row['pagingTotalCount'])
                                    }
                                }
                            }

                            // set last recordset as the result recordset
                            results = result.recordsets[i];
                            rowsAffected = result.rowsAffected[i];
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

                        resolve(new RecordSet(result ? this.query.toArray(entities) : [], rowsAffected, Date.now() - timed, totalRecords >= 0 ? totalRecords : undefined));
                    }
                    catch (ex) {
                        reject(ex);
                    }
                });
            }
            catch (ex) {
                reject(ex);
            }

        })
    }

    protected abstract transform(record: any): TEntity;
}

export default QueryRecordSet

export { RecordSet }