"use strict";
var __extends = (this && this.__extends) || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
};
var MsSql = require('mssql');
var query_1 = require('tfso-repository/lib/repository/db/query');
var recordset_1 = require('tfso-repository/lib/repository/db/recordset');
exports.RecordSet = recordset_1.RecordSet;
var QueryRecordSet = (function (_super) {
    __extends(QueryRecordSet, _super);
    function QueryRecordSet(connection) {
        _super.call(this);
        if (connection != null)
            this.connection = connection;
    }
    Object.defineProperty(QueryRecordSet.prototype, "connection", {
        set: function (connection) {
            if (connection instanceof MsSql.Transaction) {
                this._transaction = connection;
                this._connection = connection.connection;
            }
            else {
                this._connection = connection;
            }
        },
        enumerable: true,
        configurable: true
    });
    QueryRecordSet.prototype.input = function (name, type, value) {
        if (arguments.length == 2) {
            value = type;
            type = null;
        }
        this.parameters[name] = { name: name, type: type, value: value };
    };
    QueryRecordSet.prototype.executeQuery = function () {
        var _this = this;
        return new Promise(function (resolve, reject) {
            try {
                var request = new MsSql.Request(), // thread safe as we have a request object for each promise
                timed_1 = Date.now();
                request = new MsSql.Request();
                request.connection = _this._connection;
                request.transaction = _this._transaction;
                for (var key in _this.parameters) {
                    var param = _this.parameters[key];
                    request.input(param.name, param.type, param.value);
                }
                request.query(_this.commandText, function (err, recordset, rowsAffected) {
                    if (err)
                        return reject(err);
                    resolve(new recordset_1.RecordSet(recordset ? recordset.map(_this.transform).filter(_this.predicate) : [], rowsAffected, Date.now() - timed_1));
                });
            }
            catch (ex) {
                reject(ex);
            }
        });
    };
    return QueryRecordSet;
}(query_1.Query));
exports.QueryRecordSet = QueryRecordSet;
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = QueryRecordSet;
//# sourceMappingURL=queryrecordset.js.map