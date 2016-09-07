"use strict";
var __extends = (this && this.__extends) || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
};
var MsSql = require('mssql');
var query_1 = require('tfso-repository/lib/repository/db/query');
var recordset_1 = require('tfso-repository/lib/repository/db/recordset');
var QueryStream = (function (_super) {
    __extends(QueryStream, _super);
    function QueryStream(connection) {
        _super.call(this);
        if (connection != null)
            this.connection = connection;
    }
    Object.defineProperty(QueryStream.prototype, "connection", {
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
    QueryStream.prototype.input = function (name, type, value) {
        if (arguments.length == 2) {
            value = type;
            type = null;
        }
        this.parameters[name] = { name: name, type: type, value: value };
    };
    QueryStream.prototype.executeQuery = function () {
        var _this = this;
        return new Promise(function (resolve, reject) {
            var request = new MsSql.Request(), // thread safe as we have a request object for each promise
            error = null, records = [], predicate, timed;
            request.stream = true;
            request.connection = _this._connection;
            request.transaction = _this._transaction;
            predicate = _this.predicate;
            for (var key in _this.parameters) {
                var param = _this.parameters[key];
                request.input(param.name, param.type, param.value);
            }
            request.on('row', function (row) {
                var entity = _this.transform(row);
                if (predicate(entity) === true)
                    records.push(entity);
            });
            request.on('error', function (err) {
                error = err;
            });
            request.on('done', function (affected) {
                if (error != null)
                    reject(error);
                else
                    resolve(new recordset_1.RecordSet(records, affected, (Date.now() - timed)));
            });
            timed = Date.now();
            request.query(_this.commandText);
        });
    };
    return QueryStream;
}(query_1.Query));
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = QueryStream;
//# sourceMappingURL=querystream.js.map