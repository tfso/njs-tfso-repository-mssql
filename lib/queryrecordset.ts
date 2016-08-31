import * as MsSql from 'mssql';
import { Query } from 'tfso-repository/dist/lib/repository/db/query';
import { IRecordSet, RecordSet } from 'tfso-repository/dist/lib/repository/db/recordset';

export abstract class QueryRecordSet<TEntity> extends Query<TEntity> {
    private _request: MsSql.Request;

    constructor(connection?: MsSql.Connection | MsSql.Transaction) {
        super();

        this._request = new MsSql.Request();

        if (connection != null)
            this.connection = connection;
    }

    public set connection(connection: MsSql.Transaction | MsSql.Connection) {
        if (connection instanceof MsSql.Transaction) {
            this._request.transaction = connection;
            this._request.connection = connection.connection;
        }
        else {
            this._request.connection = connection;
        }
    }

    protected input(name: string, value: any): void
    protected input(name: string, type: any, value: any): void
    protected input(name: string, type: any, value?: any): void {
        if (arguments.length == 2) {
            this._request.input(name, value = type); type = null;
        }
        else {
            this._request.input(name, type, value);
        }

        this.parameters[name] = { name: name, type: type, value: value };
    }

    protected set commandText(query: string) {
        super.commandText = query;
    }

    protected get commandText(): string {
        return super.commandText;
    }

    protected executeQuery(): Promise<RecordSet<TEntity>> {
        return new Promise((resolve, reject) => {
            try {
                let timed = Date.now();

                this._request.query(this.commandText, (err, recordset, rowsAffected) => {
                    if (err)
                        return reject(err);

                    resolve(new RecordSet(recordset ? recordset.map(this.transform).filter(this.predicate) : [], rowsAffected, Date.now() - timed));
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