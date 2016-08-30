"use strict";
const MsSql = require('mssql');
class Connection {
    constructor(connectionString) {
        this._connection = null;
        this._transaction = null;
        this._rolledback = false;
        this._connectionString = connectionString;
    }
    beginTransaction() {
        return new Promise((resolve, reject) => {
            try {
                if (this._transaction)
                    reject(new Error('SqlConnection has a active transaction'));
                this._connection = new MsSql.Connection(this._connectionString);
                this._transaction = new MsSql.Transaction(this._connection);
                this._rolledback = false;
                this._transaction.on('rollback', (aborted) => {
                    this._rolledback = true;
                });
                this._connection.connect()
                    .then(() => {
                    return this._transaction.begin();
                })
                    .then(() => {
                    resolve();
                })
                    .catch((err) => {
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
                    this._transaction.rollback(function (err) {
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
                    var connection = new MsSql.Connection(this._connectionString);
                    connection.connect()
                        .then(() => {
                        if (typeof executable == 'function') {
                            return executable(connection);
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
                        .catch(function (ex) {
                        if (connection.connected)
                            connection.close();
                        reject(ex);
                    });
                }
            }
            catch (ex) {
                reject(ex);
            }
        });
    }
}
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = Connection;
//# sourceMappingURL=connection.js.map