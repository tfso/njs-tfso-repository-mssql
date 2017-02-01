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
    private _connectionString: PromiseLike<MsSql.config>;
    
    private _connection: MsSql.Connection = null;
    private _transaction: MsSql.Transaction = null;

    private _rolledback = false;

    constructor(connectionString: MsSql.config | PromiseLike<MsSql.config>) {
        this._connectionString = Promise.resolve(connectionString);
    }

    public beginTransaction(isolationLevel?: IsolationLevel): Promise<void> {
        return new Promise<void>((resolve, reject) => {
            try {
                if (this._transaction)
                    reject(new Error('SqlConnection has a active transaction'));

                this._connectionString
                    .then((connectionString) => {
                        this._connection = new MsSql.Connection(connectionString);
                        this._transaction = new MsSql.Transaction(this._connection);

                        this._rolledback = false;

                        this._transaction.on('rollback', (aborted) => {
                            this._rolledback = true;
                        });

                        this._connection.connect()
                            .then(() => {
                                return this._transaction.begin(this.getIsolationLevel(isolationLevel));
                            })
                            .then(() => {
                                resolve();
                            })
                            .catch((err) => {
                                reject(err);
                            });
                    }, (err) => {
                        reject(err);
                    });
            }
            catch (ex) {
                reject(ex);
            }
        })
    }

    public commitTransaction(): Promise<void> {
        return new Promise<void>((resolve, reject) => {
            try {
                if (this._transaction == null)
                    reject(new Error('SqlConnection has no active transaction'));


                this._transaction.commit((err) => {
                    this._transaction = null;

                    if (this._connection && this._connection.connected)
                        this._connection.close();

                    return err ? reject(err) : resolve();
                });
            }
            catch (ex) {
                reject(ex);
            }
        });
    }

    public rollbackTransaction(): Promise<void> {
        return new Promise<void>((resolve, reject) => {
            try {
                if (this._transaction == null)
                    reject(new Error('SqlConnection has no active transaction'));

                if (!this._rolledback) {
                    this._transaction.rollback((err) => {
                        this._transaction = null;

                        if (this._connection && this._connection.connected)
                            this._connection.close();

                        return err ? reject(err) : resolve();
                    });
                }
                else {
                    this._transaction = null;

                    if (this._connection && this._connection.connected)
                        this._connection.close();

                    resolve();
                }
            }
            catch (ex) {
                reject(ex);
            }

        })
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
                    this._connectionString
                        .then((connectionString) => {
                            var connection = new MsSql.Connection(connectionString);

                            connection.connect()
                                .then(() => {
                                    if (typeof executable == 'function') {
                                        return Promise.resolve(executable(connection))
                                    } else {
                                        executable.connection = connection;
                                        return executable;
                                    }
                                })
                                .then((result) => {
                                    if (connection.connected)
                                        connection.close();

                                    resolve(result);
                                })
                                .catch((ex) => {
                                    if (connection.connected)
                                        connection.close();

                                    reject(ex);
                                })
                        }, (err) => {
                            reject(err);
                        });
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
}