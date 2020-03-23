import * as MsSql from 'mssql';
import { Query } from 'tfso-repository/lib/repository/db/query';
import { IRecordSet, RecordSet } from 'tfso-repository/lib/repository/db/recordset';
import { IsolationLevel } from './connection';
export declare abstract class QueryStream<TEntity> extends Query<TEntity> {
    private _connection;
    private _transaction;
    private _ignoreReadLocks;
    constructor(connection?: MsSql.Connection | MsSql.Transaction, ignoreReadLock?: Array<IsolationLevel>);
    constructor(ignoreReadLock?: Array<IsolationLevel>);
    set connection(connection: MsSql.Transaction | MsSql.Connection);
    protected get readLock(): boolean;
    protected input(name: string, value: any): void;
    protected input(name: string, type: any, value: any): void;
    protected createRequest(): MsSql.Request;
    protected executeQuery(): Promise<IRecordSet<TEntity>>;
    protected abstract transform(record: any): TEntity;
    private transformError;
}
export default QueryStream;
export { RecordSet };
