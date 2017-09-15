"use strict";
const MsSql = require("mssql");
const query_1 = require("tfso-repository/lib/repository/db/query");
const recordset_1 = require("tfso-repository/lib/repository/db/recordset");
exports.RecordSet = recordset_1.RecordSet;
const whereoperator_1 = require("tfso-repository/lib/linq/operators/whereoperator");
const skipoperator_1 = require("tfso-repository/lib/linq/operators/skipoperator");
const takeoperator_1 = require("tfso-repository/lib/linq/operators/takeoperator");
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
        return new MsSql.Request();
    }
    executeQuery() {
        return new Promise((resolve, reject) => {
            try {
                let request = this.createRequest(), // thread safe as we have a request object for each promise
                error = null, records = [], totalRecords = -1, totalPredicateIterations = 0, predicate, timed, cancelled = false, completed = false;
                request.stream = true;
                request.multiple = true;
                request.connection = this._connection;
                request.transaction = this._transaction;
                var skip = undefined, skipped = 0, skipOperator = null, take = undefined, taken = 0, takeOperator = null;
                for (let operator of this.query.operations.values()) {
                    if (operator instanceof whereoperator_1.WhereOperator) {
                        if (predicate == null)
                            predicate = operator.predicate;
                        else
                            break;
                    }
                    else if (skip == null && operator instanceof skipoperator_1.SkipOperator) {
                        skipOperator = operator;
                        skip = operator.count;
                    }
                    else if (take == null && operator instanceof takeoperator_1.TakeOperator) {
                        takeOperator = operator;
                        take = operator.count;
                    }
                }
                if (skipOperator != null)
                    this.query.operations.remove(skipOperator); // we are manually skipping, remove it from enumerable
                if (takeOperator != null)
                    this.query.operations.remove(takeOperator); // we are manually taking, remove it from enumerable
                if (predicate == null)
                    predicate = (entity) => true;
                for (let key in this.parameters) {
                    let param = this.parameters[key];
                    if (param.type == null)
                        request.input(param.name, param.value);
                    else
                        request.input(param.name, param.type, param.value);
                }
                request.on('recordset', (columns) => {
                    if (totalRecords < 0)
                        totalRecords = -1; // reset totalRecords if it isn't set
                    records.length = 0;
                    skipped = 0;
                    taken = 0;
                });
                request.on('row', (row) => {
                    var entity = null;
                    if (cancelled)
                        return;
                    try {
                        if (totalRecords == -1) {
                            // only go here at first row in any recordset if it isn't set
                            if (row['pagingTotalCount'] && isNaN(row['pagingTotalCount']) == false)
                                totalRecords = Number(row['pagingTotalCount']);
                            else
                                totalRecords = -2;
                        }
                        if (completed == false || (completed == true && skip != null)) {
                            entity = this.transform(row);
                            if (predicate(entity) === true) {
                                if (skip == null || ++skipped > skip) {
                                    if (take == null || ++taken <= take)
                                        records.push(entity);
                                    else
                                        completed = true;
                                }
                                totalPredicateIterations++;
                            }
                        }
                    }
                    catch (ex) {
                        cancelled = true;
                        error = ex;
                    }
                });
                request.on('error', (err) => {
                    error = err;
                });
                request.on('done', (affected) => {
                    if (error != null)
                        reject(error);
                    else
                        resolve(new recordset_1.RecordSet(records, affected, (Date.now() - timed), skip != null ? totalPredicateIterations : (totalRecords >= 0 ? totalRecords : undefined)));
                });
                timed = Date.now();
                request.query(this.commandText);
            }
            catch (ex) {
                reject(ex);
            }
        });
    }
}
exports.QueryStream = QueryStream;
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = QueryStream;
//# sourceMappingURL=querystream.js.map