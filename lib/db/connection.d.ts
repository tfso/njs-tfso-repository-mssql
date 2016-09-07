import * as MsSql from 'mssql';
export default class Connection {
    private _connectionString;
    private _connection;
    private _transaction;
    private _rolledback;
    constructor(connectionString: MsSql.config | PromiseLike<MsSql.config>);
    beginTransaction(): Promise<void>;
    commitTransaction(): Promise<void>;
    rollbackTransaction(): Promise<void>;
    execute<U>(query: PromiseLike<U>): Promise<U>;
    execute<U>(work: (connection: MsSql.Connection) => U | PromiseLike<U>): Promise<U>;
}
