"use strict";
const MsSql = require('mssql');
const query_1 = require('tfso-repository/lib/repository/db/query');
const recordset_1 = require('tfso-repository/lib/repository/db/recordset');
class QueryStream extends query_1.Query {
    constructor(connection) {
        super();
        if (connection != null)
            this.connection = connection;
    }
    set connection(connection) {
        if (connection instanceof MsSql.Transaction) {
            this._transaction = connection;
            this._connection = connection.connection;
        }
        else {
            this._connection = connection;
        }
    }
    input(name, type, value) {
        if (arguments.length == 2) {
            value = type;
            type = null;
        }
        this.parameters[name] = { name: name, type: type, value: value };
    }
    executeQuery() {
        return new Promise((resolve, reject) => {
            let request = new MsSql.Request(), // thread safe as we have a request object for each promise
            error = null, records = [], predicate, timed;
            request.stream = true;
            request.connection = this._connection;
            request.transaction = this._transaction;
            predicate = this.predicate;
            for (let key in this.parameters) {
                let param = this.parameters[key];
                request.input(param.name, param.type, param.value);
            }
            request.on('row', (row) => {
                var entity = this.transform(row);
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
            request.query(this.commandText);
        });
    }
}
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = QueryStream;
//# sourceMappingURL=querystream.js.map