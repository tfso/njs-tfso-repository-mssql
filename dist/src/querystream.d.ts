import * as MsSql from 'mssql';
import { Query, IRecordSet } from 'tfso-repository';
declare abstract class QueryStream<TEntity> extends Query<TEntity> {
    private _connection;
    private _transaction;
    constructor(connection?: MsSql.Connection | MsSql.Transaction);
    connection: MsSql.Transaction | MsSql.Connection;
    protected input(name: string, value: any): void;
    protected input(name: string, type: any, value: any): void;
    protected executeQuery(): Promise<IRecordSet<TEntity>>;
    protected abstract transform(record: any): TEntity;
}
export default QueryStream;
