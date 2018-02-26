import * as MsSql from 'mssql';
import { Query } from 'tfso-repository/lib/repository/db/query';
import { IRecordSet } from 'tfso-repository/lib/repository/db/recordset';
export declare enum IsolationLevel {
    ReadUncommitted = 0,
    ReadCommitted = 1,
    RepeatableRead = 2,
    Snapshot = 3,
    Serializable = 4,
}
export default class Connection {
    private _connectionString;
    private _connection;
    private _transaction;
    private _rolledback;
    constructor(connectionString: MsSql.config | PromiseLike<MsSql.config>);
    beginTransaction(isolationLevel?: IsolationLevel): Promise<void>;
    commitTransaction(): Promise<void>;
    rollbackTransaction(): Promise<void>;
    execute<U>(query: Query<U>): Promise<IRecordSet<U>>;
    execute<U>(work: (connection: MsSql.ConnectionPool) => IRecordSet<U> | PromiseLike<IRecordSet<U>>): Promise<IRecordSet<U>>;
    private getIsolationLevel(isolationLevel);
    private delay(ms);
}
