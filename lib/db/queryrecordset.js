"use strict";
const MsSql = require('mssql');
const query_1 = require('tfso-repository/lib/repository/db/query');
const recordset_1 = require('tfso-repository/lib/repository/db/recordset');
exports.RecordSet = recordset_1.RecordSet;
class QueryRecordSet extends query_1.Query {
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
            try {
                let request = new MsSql.Request(), // thread safe as we have a request object for each promise
                timed = Date.now();
                request = new MsSql.Request();
                request.connection = this._connection;
                request.transaction = this._transaction;
                for (let key in this.parameters) {
                    let param = this.parameters[key];
                    request.input(param.name, param.type, param.value);
                }
                request.query(this.commandText, (err, recordset, rowsAffected) => {
                    if (err)
                        return reject(err);
                    resolve(new recordset_1.RecordSet(recordset ? recordset.map(this.transform).filter(this.predicate) : [], rowsAffected, Date.now() - timed));
                });
            }
            catch (ex) {
                reject(ex);
            }
        });
    }
}
exports.QueryRecordSet = QueryRecordSet;
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = QueryRecordSet;
//# sourceMappingURL=queryrecordset.js.map