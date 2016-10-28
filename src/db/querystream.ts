import * as MsSql from 'mssql';
import { Query } from 'tfso-repository/lib/repository/db/query';
import { IRecordSet, RecordSet } from 'tfso-repository/lib/repository/db/recordset';

import { WhereOperator } from 'tfso-repository/lib/linq/operators/whereoperator';
import { SkipOperator } from 'tfso-repository/lib/linq/operators/skipoperator';
import { TakeOperator } from 'tfso-repository/lib/linq/operators/takeoperator';

export abstract class QueryStream<TEntity> extends Query<TEntity> {
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

    protected executeQuery(): Promise<IRecordSet<TEntity>> {
        return new Promise((resolve, reject) => {
            let request = this.createRequest(), // thread safe as we have a request object for each promise
                error: Error = null,
                records: Array<TEntity> = [],
                predicate: (entity: TEntity) => boolean,
                timed: number;

            request.stream = true;
            request.connection = this._connection;
            request.transaction = this._transaction;

            var skip: number = undefined, skipped: number = 0,
                take: number = undefined, taken: number = 0;

            predicate = (entity) => true;
            for (let operator of this.query.operations.values()) {

                if (predicate == null && operator instanceof WhereOperator)
                    predicate = ((op: WhereOperator<TEntity>) => {
                        return (entity: TEntity) => {
                            return op.predicate.apply({}, [entity].concat(op.parameters));
                        }
                    })(<WhereOperator<TEntity>>operator);

                else if (skip == null && operator instanceof SkipOperator)
                    skip = (<SkipOperator<TEntity>>operator).count;

                else if (take == null && operator instanceof TakeOperator)
                    take = (<TakeOperator<TEntity>>operator).count;
            }

            for (let key in this.parameters) {
                let param = this.parameters[key];

                if (param.type == null)
                    request.input(param.name, param.value);
                else
                    request.input(param.name, param.type, param.value);
            }

            request.on('row', (row) => {
                var entity = this.transform(row);

                if (predicate(entity) === true) {
                    if (skip == null || ++skipped > skip) {
                        if (take == null || ++taken <= take)
                            records.push(entity);
                    }
                }
            });

            request.on('error', (err) => {
                error = err;
            });

            request.on('done', (affected) => {
                if (error != null)
                    reject(error);
                else
                    resolve(new RecordSet(records, affected, (Date.now() - timed)));
            });

            timed = Date.now();
            request.query(this.commandText);
        })
    }

    protected abstract transform(record: any): TEntity;
}

export default QueryStream

export { RecordSet }