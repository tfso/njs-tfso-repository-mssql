"use strict";
const MsSql = require("mssql");
var IsolationLevel;
(function (IsolationLevel) {
    IsolationLevel[IsolationLevel["ReadUncommitted"] = 0] = "ReadUncommitted";
    IsolationLevel[IsolationLevel["ReadCommitted"] = 1] = "ReadCommitted";
    IsolationLevel[IsolationLevel["RepeatableRead"] = 2] = "RepeatableRead";
    IsolationLevel[IsolationLevel["Snapshot"] = 3] = "Snapshot";
    IsolationLevel[IsolationLevel["Serializable"] = 4] = "Serializable";
})(IsolationLevel = exports.IsolationLevel || (exports.IsolationLevel = {}));
class Connection {
    constructor(connectionString) {
        this._connection = null;
        this._transaction = null;
        this._rolledback = false;
        this._connectionString = Promise.resolve(connectionString);
    }
    beginTransaction(isolationLevel) {
        return new Promise((resolve, reject) => {
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
        });
    }
    commitTransaction() {
        return new Promise((resolve, reject) => {
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
    rollbackTransaction() {
        return new Promise((resolve, reject) => {
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
        });
    }
    execute(executable) {
        return new Promise((resolve, reject) => {
            try {
                if (this._transaction != null) {
                    if (this._connection.connected == false)
                        throw new Error('SqlConnection is missing an active connection for this transaction');
                    if (typeof executable == 'function') {
                        Promise.resolve(executable(this._transaction || this._connection)).then(resolve).catch(reject);
                    }
                    else {
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
                                return Promise.resolve(executable(connection));
                            }
                            else {
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
                        });
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
    getIsolationLevel(isolationLevel) {
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
                return MsSql.ISOLATION_LEVEL.SNAPSHOT;
            default:
                return MsSql.ISOLATION_LEVEL.READ_COMMITTED;
        }
    }
}
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = Connection;
//# sourceMappingURL=connection.js.map