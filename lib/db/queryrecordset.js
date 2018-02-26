"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const MsSql = require("mssql");
const query_1 = require("tfso-repository/lib/repository/db/query");
const recordset_1 = require("tfso-repository/lib/repository/db/recordset");
exports.RecordSet = recordset_1.RecordSet;
const whereoperator_1 = require("tfso-repository/lib/linq/operators/whereoperator");
const skipoperator_1 = require("tfso-repository/lib/linq/operators/skipoperator");
const takeoperator_1 = require("tfso-repository/lib/linq/operators/takeoperator");
class QueryRecordSet extends query_1.Query {
    constructor(connection) {
        super();
        if (connection != null)
            this.connection = connection;
    }
    set connection(connection) {
        if (connection instanceof MsSql.Transaction) {
            this._transaction = connection;
        }
        else {
            this._connection = connection;
        }
    }
    get readLock() {
        return this._transaction ? true : false;
    }
    input(name, type, value) {
        if (arguments.length == 2) {
            value = type;
            type = null;
        }
        this.parameters[name] = { name: name, type: type, value: value };
    }
    createRequest() {
        return new MsSql.Request(arguments[0]);
    }
    executeQuery() {
        return new Promise((resolve, reject) => {
            try {
                let request, predicate, timed = Date.now(), totalRecords = -1;
                // thread safe as we have a request object for each promise
                if (this._transaction != null)
                    request = this.createRequest(this._transaction);
                else
                    request = this.createRequest(this._connection);
                for (let key in this.parameters) {
                    let param = this.parameters[key];
                    if (param.type == null)
                        request.input(param.name, param.value);
                    else
                        request.input(param.name, param.type, param.value);
                }
                request.query(this.commandText, (err, result) => {
                    if (err)
                        return reject(err);
                    try {
                        let results = [], rowsAffected = 0;
                        for (let i = 0; i < result.recordsets.length; i++) {
                            // go through each recordset and check for totalRecords
                            if (totalRecords == -1) {
                                let row = null;
                                if (Array.isArray(result.recordsets[i]) && result.recordsets[i].length > 0)
                                    row = result.recordsets[i][0];
                                if (row) {
                                    if (row['pagingTotalCount'] && isNaN(row['pagingTotalCount']) == false) {
                                        totalRecords = Number(row['pagingTotalCount']);
                                    }
                                }
                            }
                            // set last recordset as the result recordset
                            results = result.recordsets[i];
                            rowsAffected = result.rowsAffected[i];
                        }
                        // should really validate this.query to see if operators Where, Skip, Take, OrderBy etc comes in correct order otherwhise it's not supported for this kind of database
                        let where = this.query.operations.first(whereoperator_1.WhereOperator), predicate, entities;
                        if (where) {
                            this.query.operations.remove(where);
                            predicate = where.predicate;
                        }
                        entities = results.map(this.transform);
                        if (predicate) {
                            entities = entities.filter(predicate);
                            if (this.query.operations.first(skipoperator_1.SkipOperator) || this.query.operations.first(takeoperator_1.TakeOperator))
                                totalRecords = entities.length;
                        }
                        resolve(new recordset_1.RecordSet(result ? this.query.toArray(entities) : [], rowsAffected, Date.now() - timed, totalRecords >= 0 ? totalRecords : undefined));
                    }
                    catch (ex) {
                        reject(ex);
                    }
                });
            }
            catch (ex) {
                reject(ex);
            }
        });
    }
}
exports.QueryRecordSet = QueryRecordSet;
exports.default = QueryRecordSet;
//# sourceMappingURL=queryrecordset.js.map