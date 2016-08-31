"use strict";
const MsSql = require('mssql');
const query_1 = require('tfso-repository/dist/lib/repository/db/query');
const recordset_1 = require('tfso-repository/dist/lib/repository/db/recordset');
exports.RecordSet = recordset_1.RecordSet;
class QueryRecordSet extends query_1.Query {
    constructor(connection) {
        super();
        this._request = new MsSql.Request();
        if (connection != null)
            this.connection = connection;
    }
    set connection(connection) {
        if (connection instanceof MsSql.Transaction) {
            this._request.transaction = connection;
            this._request.connection = connection.connection;
        }
        else {
            this._request.connection = connection;
        }
    }
    input(name, type, value) {
        if (arguments.length == 2) {
            this._request.input(name, value = type);
            type = null;
        }
        else {
            this._request.input(name, type, value);
        }
        this.parameters[name] = { name: name, type: type, value: value };
    }
    set commandText(query) {
        super.commandText = query;
    }
    get commandText() {
        return super.commandText;
    }
    executeQuery() {
        return new Promise((resolve, reject) => {
            try {
                let timed = Date.now();
                this._request.query(this.commandText, (err, recordset, rowsAffected) => {
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