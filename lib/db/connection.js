"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
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
    async close() {
        if (this._connection && this._connection.connected)
            await this._connection.close();
    }
    async beginTransaction(isolationLevel) {
        if (this._transaction)
            throw new Error('SqlConnection has a active transaction');
        let connectionString = await this._connectionString;
        this._connection = new MsSql.ConnectionPool(connectionString);
        this._transaction = new MsSql.Transaction(this._connection);
        this._rolledback = false;
        this._transaction.on('rollback', (aborted) => {
            this._rolledback = true;
        });
        await this._connection.connect();
        await this._transaction.begin(this.getIsolationLevel(isolationLevel));
    }
    async commitTransaction() {
        if (this._transaction == null)
            throw new Error('SqlConnection has no active transaction');
        await this._transaction.commit();
        this._transaction = null;
        // if (this._connection && this._connection.connected)
        //     await this._connection.close();
    }
    async rollbackTransaction() {
        if (this._transaction == null)
            throw new Error('SqlConnection has no active transaction');
        if (!this._rolledback) {
            let error;
            for (let tries = 0; tries < 5; tries++) {
                try {
                    error = null; // reset it for each try
                    await this._transaction.rollback();
                    break;
                }
                catch (ex) {
                    error = ex;
                    if (ex.name == 'TransactionError') {
                        await this.delay(200);
                        continue;
                    }
                    throw ex;
                }
            }
            this._transaction = null;
            // if (this._connection && this._connection.connected)
            //     await this._connection.close();
            if (error)
                throw error;
        }
        else {
            this._transaction = null;
            // if (this._connection && this._connection.connected)
            //     await this._connection.close();
        }
    }
    async execute(executable) {
        try {
            if (this._transaction != null) {
                if (this._connection.connected == false)
                    throw new Error('SqlConnection is missing an active connection for this transaction');
                if (typeof executable == 'function') {
                    return Promise.resolve(executable(this._transaction || this._connection));
                }
                else {
                    executable.connection = this._transaction || this._connection;
                    return Promise.resolve(executable);
                }
            }
            else {
                let connectionString = await this._connectionString, connection = new MsSql.ConnectionPool(Object.assign(connectionString));
                try {
                    await connection.connect();
                    let result;
                    if (typeof executable == 'function') {
                        result = await Promise.resolve(executable(connection));
                    }
                    else {
                        executable.connection = connection;
                        result = await Promise.resolve(executable);
                    }
                    if (connection.connected)
                        await connection.close();
                    return result;
                }
                catch (ex) {
                    if (connection.connected)
                        await connection.close();
                    throw ex;
                }
            }
        }
        catch (ex) {
            throw ex;
        }
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
    delay(ms) {
        return new Promise((resolve) => {
            setTimeout(resolve, ms || 1);
        });
    }
}
exports.default = Connection;
//# sourceMappingURL=connection.js.map