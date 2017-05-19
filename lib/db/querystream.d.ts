import * as MsSql from 'mssql';
import { Query } from 'tfso-repository/lib/repository/db/query';
import { IRecordSet, RecordSet } from 'tfso-repository/lib/repository/db/recordset';
export declare abstract class QueryStream<TEntity> extends Query<TEntity> {
    private _connection;
    private _transaction;
    constructor(connection?: MsSql.Connection | MsSql.Transaction);
    connection: MsSql.Transaction | MsSql.Connection;
    protected readonly readLock: boolean;
    protected input(name: string, value: any): void;
    protected input(name: string, type: any, value: any): void;
    protected createRequest(): MsSql.Request;
    protected executeQuery(): Promise<IRecordSet<TEntity>>;
    protected abstract transform(record: any): TEntity;
}
export default QueryStream;
export { RecordSet };
