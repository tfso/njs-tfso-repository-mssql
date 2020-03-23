import * as MsSql from 'mssql';
import { Query } from 'tfso-repository/lib/repository/db/query';
import { IRecordSet, RecordSet } from 'tfso-repository/lib/repository/db/recordset';

export enum IsolationLevel {
    ReadUncommitted,
    ReadCommitted,
    RepeatableRead,
    Snapshot,
    Serializable
}

export default class Connection {
    private static connectionPool: Map<string, MsSql.Connection> = new Map()

    private _connectionString: PromiseLike<MsSql.config>;
    
    private _connection: MsSql.Connection = null;
    private _transaction: MsSql.Transaction = null;

    private _rolledback = false;

    constructor(connectionString: MsSql.config | PromiseLike<MsSql.config>) {
        this._connectionString = Promise.resolve(connectionString);
    }

    public async beginTransaction(isolationLevel?: IsolationLevel): Promise<void> {
        
        if (this._transaction)
            throw new Error('SqlConnection has a active transaction');

        let connectionString = await this._connectionString
            
        this._connection = new MsSql.Connection(connectionString);
        this._transaction = new MsSql.Transaction(this._connection);
        this._rolledback = false;

        this._transaction.on('rollback', (aborted) => {
            this._rolledback = true;
        });

        await this._connection.connect();
        await this._transaction.begin(this.getIsolationLevel(isolationLevel));           
    }

    public async commitTransaction(): Promise<void> {
        
        if (this._transaction == null)
            throw new Error('SqlConnection has no active transaction');

        await this._transaction.commit();

        this._transaction = null;

        if (this._connection && this._connection.connected)
            await this._connection.close();
    }

    public async rollbackTransaction(): Promise<void> {       
        if (this._transaction == null)
            throw new Error('SqlConnection has no active transaction');

        if (!this._rolledback)
        {
            let error: Error;

            for (let tries = 0; tries < 5; tries++)
            {
                try
                {
                    error = null; // reset it for each try

                    await this._transaction.rollback();

                    break;
                }
                catch (ex)
                {
                    error = ex;

                    if (ex.name == 'TransactionError')
                    {
                        await this.delay(200);

                        continue;
                    }

                    throw ex;
                }
            }

            this._transaction = null;

            if (this._connection && this._connection.connected)
                await this._connection.close();

            if(error)
                throw error;
        }
        else {
            this._transaction = null;

            if (this._connection && this._connection.connected)
                await this._connection.close();
        }
            
    }

    private async getConnection(connectionString: MsSql.config): Promise<MsSql.Connection> { 
        let pool: MsSql.Connection,
            key = `${connectionString.server};${connectionString.port || -1};${connectionString.database};${connectionString.user}`

        if( (pool = Connection.connectionPool.get(key)) == null) {
            Connection.connectionPool.set(key, pool = new MsSql.Connection(connectionString))

            pool.on('error', () => {
                Connection.connectionPool.delete(key)
            })
        }

        await this.assertConnected(pool, connectionString.connectionTimeout || 15000)

        return pool
    }

    private async assertConnected(pool: MsSql.Connection, timeout: number = 15000): Promise<void> {
        if(pool.connecting == true) {
            return new Promise<void>(async (resolve, reject) => {
                let time = Number(timeout) || 15000,
                    interval = 100,
                    thread: NodeJS.Timer

                try {
                    let asserter = async() => {
                        try {
                            if(pool.connected == true) {
                                if(thread)
                                    clearTimeout(thread)

                                resolve()
                            }
                            else if( (time -= interval) < 0) {
                                if(thread)
                                    clearTimeout(thread)

                                reject(new Error(`Connection could not be established within timeout`))
                            }
                        }
                        catch(ex) {
                            reject(ex)
                        }
                    }

                    thread = setInterval(asserter, interval)
                }
                catch(ex) {
                    if(thread)
                        clearTimeout(thread);

                    reject(ex)
                }
            })
        }
        else if(pool.connected == false) {
            await pool.connect()
        }
    }

    public execute<U>(query: Query<U>): Promise<IRecordSet<U>>
    public execute<U>(work: (connection: MsSql.Connection) => IRecordSet<U> | PromiseLike<IRecordSet<U>>): Promise<IRecordSet<U>>
    public execute<U>(executable: any): Promise<IRecordSet<U>> {
        return new Promise((resolve, reject) => {
            try {
                if (this._transaction != null) {
                    if (this._connection.connected == false)
                        throw new Error('SqlConnection is missing an active connection for this transaction');

                    if (typeof executable == 'function') {
                        Promise.resolve(executable(this._transaction || this._connection)).then(resolve).catch(reject);
                    } else {
                        executable.connection = this._transaction || this._connection;
                        Promise.resolve(executable).then(resolve).catch(reject);
                    }
                }
                else {
                    Promise.resolve(this._connectionString)
                        .then((connectionString) => {
                            try {
                                return this.getConnection(connectionString)
                                    .then((connection) => {
                                        if (typeof executable == 'function') {
                                            return Promise.resolve(executable(connection))
                                        } else {
                                            executable.connection = connection;
                                            return executable;
                                        }
                                    })
                                    .then((result) => {
                                        // if (connection.connected)
                                        //     connection.close();

                                        resolve(result);
                                    })
                                    .catch((ex) => {
                                        // if (connection.connected)
                                        //     connection.close();

                                        reject(ex);
                                    })
                                    
                            }
                            catch(ex) {
                                reject(ex);
                            }
                        }, (err) => {
                            reject(err);
                        })
                        .catch(err => {
                            reject(err)
                        })
                }
            }
            catch (ex) {
                reject(ex);
            }
        });
    }

    private getIsolationLevel(isolationLevel: IsolationLevel): MsSql.IIsolationLevel {

        switch (isolationLevel) {
            case IsolationLevel.ReadCommitted:
                return MsSql.ISOLATION_LEVEL.READ_COMMITTED;

            case IsolationLevel.ReadUncommitted:
                return MsSql.ISOLATION_LEVEL.READ_UNCOMMITTED;

            case IsolationLevel.RepeatableRead:
                return MsSql.ISOLATION_LEVEL.REPEATABLE_READ;

            case IsolationLevel.Serializable:
                return MsSql.ISOLATION_LEVEL.SERIALIZABLE;

            case IsolationLevel.Snapshot:
                return MsSql.ISOLATION_LEVEL.SNAPSHOT
            
            default:
                return MsSql.ISOLATION_LEVEL.READ_COMMITTED;
        }
    }

    private delay(ms: number): Promise<void> {
        return new Promise<void>((resolve, reject) => {
            try
            {
                setTimeout(resolve, ms || 1);
            }
            catch (ex)
            {
                reject(ex);
            }
        })
    }
}