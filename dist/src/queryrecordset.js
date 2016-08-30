"use strict";
const MsSql = require('mssql');
const tfso_repository_1 = require('tfso-repository');
exports.RecordSet = tfso_repository_1.RecordSet;
class QueryRecordSet extends tfso_repository_1.Query {
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
    executeQuery() {
        return new Promise((resolve, reject) => {
            try {
                let timed = Date.now();
                this._request.query(this.commandText, (err, recordset, rowsAffected) => {
                    if (err)
                        return reject(err);
                    resolve(new tfso_repository_1.RecordSet(recordset ? recordset.map(this.transform).filter(this.predicate) : [], rowsAffected, Date.now() - timed));
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