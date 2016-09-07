"use strict";
var MsSql = require('mssql');
var Connection = (function () {
    function Connection(connectionString) {
        this._connection = null;
        this._transaction = null;
        this._rolledback = false;
        if (typeof connectionString == 'object') {
            this._connectionString = Promise.resolve(connectionString);
        }
        else {
            this._connectionString = connectionString;
        }
    }
    Connection.prototype.beginTransaction = function () {
        var _this = this;
        return new Promise(function (resolve, reject) {
            try {
                if (_this._transaction)
                    reject(new Error('SqlConnection has a active transaction'));
                _this._connectionString
                    .then(function (connectionString) {
                    _this._connection = new MsSql.Connection(connectionString);
                    _this._transaction = new MsSql.Transaction(_this._connection);
                    _this._rolledback = false;
                    _this._transaction.on('rollback', function (aborted) {
                        _this._rolledback = true;
                    });
                    _this._connection.connect()
                        .then(function () {
                        return _this._transaction.begin();
                    })
                        .then(function () {
                        resolve();
                    })
                        .catch(function (err) {
                        reject(err);
                    });
                }, function (err) {
                    reject(err);
                });
            }
            catch (ex) {
                reject(ex);
            }
        });
    };
    Connection.prototype.commitTransaction = function () {
        var _this = this;
        return new Promise(function (resolve, reject) {
            try {
                if (_this._transaction == null)
                    reject(new Error('SqlConnection has no active transaction'));
                _this._transaction.commit(function (err) {
                    _this._transaction = null;
                    if (_this._connection && _this._connection.connected)
                        _this._connection.close();
                    return err ? reject(err) : resolve();
                });
            }
            catch (ex) {
                reject(ex);
            }
        });
    };
    Connection.prototype.rollbackTransaction = function () {
        var _this = this;
        return new Promise(function (resolve, reject) {
            try {
                if (_this._transaction == null)
                    reject(new Error('SqlConnection has no active transaction'));
                if (!_this._rolledback) {
                    _this._transaction.rollback(function (err) {
                        this._transaction = null;
                        if (this._connection && this._connection.connected)
                            this._connection.close();
                        return err ? reject(err) : resolve();
                    });
                }
                else {
                    _this._transaction = null;
                    if (_this._connection && _this._connection.connected)
                        _this._connection.close();
                    resolve();
                }
            }
            catch (ex) {
                reject(ex);
            }
        });
    };
    Connection.prototype.execute = function (executable) {
        var _this = this;
        return new Promise(function (resolve, reject) {
            try {
                if (_this._transaction != null) {
                    if (_this._connection.connected == false)
                        throw new Error('SqlConnection is missing an active connection for this transaction');
                    if (typeof executable == 'function') {
                        Promise.resolve(executable(_this._transaction || _this._connection)).then(resolve).catch(reject);
                    }
                    else {
                        executable.connection = _this._transaction || _this._connection;
                        Promise.resolve(executable).then(resolve).catch(reject);
                    }
                }
                else {
                    _this._connectionString
                        .then(function (connectionString) {
                        var connection = new MsSql.Connection(connectionString);
                        connection.connect()
                            .then(function () {
                            if (typeof executable == 'function') {
                                return executable(connection);
                            }
                            else {
                                executable.connection = connection;
                                return executable;
                            }
                        })
                            .then(function (result) {
                            if (connection.connected)
                                connection.close();
                            resolve(result);
                        })
                            .catch(function (ex) {
                            if (connection.connected)
                                connection.close();
                            reject(ex);
                        });
                    }, function (err) {
                        reject(err);
                    });
                }
            }
            catch (ex) {
                reject(ex);
            }
        });
    };
    return Connection;
}());
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = Connection;
//# sourceMappingURL=connection.js.map