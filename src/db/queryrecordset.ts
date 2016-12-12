﻿import * as MsSql from 'mssql';
import { Query } from 'tfso-repository/lib/repository/db/query';
import { IRecordSet, RecordSet } from 'tfso-repository/lib/repository/db/recordset';

import { WhereOperator } from 'tfso-repository/lib/linq/operators/whereoperator';

export abstract class QueryRecordSet<TEntity> extends Query<TEntity> {
    private _connection: MsSql.Connection;
    private _transaction: MsSql.Transaction;

    constructor(connection?: MsSql.Connection | MsSql.Transaction) {
        super();

        if (connection != null)
            this.connection = connection;
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
                    timed = Date.now();

                request.connection = this._connection;
                request.transaction = this._transaction;

                for (let key in this.parameters) {
                    let param = this.parameters[key];

                    if(param.type == null)
                        request.input(param.name, param.value);
                    else
                        request.input(param.name, param.type, param.value);
                }

                request.query(this.commandText, (err, recordset, rowsAffected) => {
                    if (err)
                        return reject(err);

                    resolve(new RecordSet(recordset ? this.query.toArray(recordset.map(this.transform)) : [], rowsAffected, Date.now() - timed));
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