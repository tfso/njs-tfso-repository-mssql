import * as MsSql from 'mssql';
import { Query, IRecordSet, RecordSet } from 'tfso-repository';

abstract class QueryStream<TEntity> extends Query<TEntity> {
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

    protected executeQuery(): Promise<IRecordSet<TEntity>> {
        return new Promise((resolve, reject) => {
            let request = new MsSql.Request(), // thread safe as we have a request object for each promise
                error: Error = null,
                records: Array<TEntity> = [],
                predicate: (entity: TEntity) => boolean,
                timed: number;

            request.stream = true;
            request.connection = this._connection;
            request.transaction = this._transaction;

            predicate = this.predicate;

            for (let key in this.parameters) {
                let param = this.parameters[key];

                request.input(param.name, param.type, param.value);
            }

            request.on('row', (row) => {
                var entity = this.transform(row);

                if (predicate(entity) === true)
                    records.push(entity);
            });

            request.on('error', function (err) {
                error = err;
            });

            request.on('done', function (affected) {
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