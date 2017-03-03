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
    createRequest() {
        return new MsSql.Request();
    }
    executeQuery() {
        return new Promise((resolve, reject) => {
            try {
                let request = this.createRequest(), // thread safe as we have a request object for each promise
                predicate, timed = Date.now(), totalRecords = -1;
                request.multiple = true;
                request.connection = this._connection;
                request.transaction = this._transaction;
                for (let key in this.parameters) {
                    let param = this.parameters[key];
                    if (param.type == null)
                        request.input(param.name, param.value);
                    else
                        request.input(param.name, param.type, param.value);
                }
                request.query(this.commandText, (err, recordset, rowsAffected) => {
                    if (err)
                        return reject(err);
                    try {
                        let results = [];
                        for (let i = 0; i < recordset.length; i++) {
                            // go through each recordst and check for totalRecords
                            if (totalRecords == -1) {
                                let row = null;
                                if (Array.isArray(recordset[i]) && recordset[i].length > 0)
                                    row = recordset[i][0];
                                if (row) {
                                    if (row['pagingTotalCount'] && isNaN(row['pagingTotalCount']) == false) {
                                        totalRecords = Number(row['pagingTotalCount']);
                                    }
                                }
                            }
                            // set last recordset as the result recordset
                            results = recordset[i];
                        }
                        // should really validate this.query to see if operators Where, Skip, Take, OrderBy etc comes in correct order otherwhise it's not supported for this kind of database
                        let where = this.query.operations.first(whereoperator_1.WhereOperator), predicate, entities;
                        if (where) {
                            this.query.operations.remove(where);
                            predicate = ((op) => {
                                return (entity) => {
                                    return op.predicate.apply({}, [entity].concat(op.parameters));
                                };
                            })(where);
                        }
                        entities = results.map(this.transform);
                        if (predicate) {
                            entities = entities.filter(predicate);
                            if (this.query.operations.first(skipoperator_1.SkipOperator) || this.query.operations.first(takeoperator_1.TakeOperator))
                                totalRecords = entities.length;
                        }
                        resolve(new recordset_1.RecordSet(recordset ? this.query.toArray(entities) : [], rowsAffected, Date.now() - timed, totalRecords >= 0 ? totalRecords : undefined));
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