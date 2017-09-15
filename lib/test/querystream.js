"use strict";
const assert = require("assert");
const querystream_1 = require("./../db/querystream");
const requestmock_1 = require("./base/requestmock");
const skipoperator_1 = require("tfso-repository/lib/linq/operators/skipoperator");
const takeoperator_1 = require("tfso-repository/lib/linq/operators/takeoperator");
describe("When using QueryStream for MsSql queries", () => {
    var myQuery, data;
    beforeEach(() => {
        data = [
            { no: 1, name: 'ABC' },
            { no: 2, name: 'DEF' },
            { no: 3, name: 'GHI' },
            { no: 4, name: 'JKL' },
            { no: 5, name: 'MNO' },
            { no: 6, name: 'PQR' },
            { no: 7, name: 'STU' },
            { no: 8, name: 'VWX' },
            { no: 9, name: 'YZÆ' },
            { no: 10, name: 'ØÅ1' },
            { no: 11, name: '234' },
            { no: 12, name: '567' },
            { no: 13, name: '890' }
        ];
        myQuery = new Select(data);
    });
    it("should return all records", () => {
        return myQuery
            .then(recordset => {
            assert.equal(recordset.records.length, 13);
        });
    });
    it("should handle paging", () => {
        myQuery.query.skip(3).take(5);
        return myQuery
            .then(recordset => {
            assert.equal(recordset.records.length, 5);
            assert.equal(recordset.records[0].name, "JKL");
        });
    });
    it("should handle paging with total count for in-memory paging", () => {
        myQuery = new Select([]);
        myQuery.query.where(it => it.no > 5).skip(3).take(5);
        myQuery.data = data
            .map(el => {
            return {
                no: el.no,
                name: el.name,
                pagingTotalCount: 8
            };
        }); // totalLength is only available for stream when we have a column named pagingTotalCount (for optimizations)
        return myQuery
            .then(recordset => {
            assert.equal(recordset.records.length, 5);
            assert.equal(recordset.totalLength, 8);
            assert.equal(recordset.records[0].name, "YZÆ");
        });
    });
    it("should handle paging with total count for database paging", () => {
        myQuery = new Select([]);
        myQuery.query.where(it => it.no > 5).skip(3).take(5);
        // since database is doing its paging we should remove the operators
        let skip = myQuery.query.operations.first(skipoperator_1.SkipOperator);
        let take = myQuery.query.operations.first(takeoperator_1.TakeOperator);
        myQuery.query.operations.remove(skip);
        myQuery.query.operations.remove(take);
        // faking database paging now
        data = data
            .map(el => {
            return {
                no: el.no,
                name: el.name,
                pagingTotalCount: 8
            };
        })
            .filter(it => {
            return it.no > 5;
        })
            .slice(skip.count, take.count + take.count);
        myQuery.data = data;
        return myQuery
            .then(recordset => {
            assert.equal(recordset.records.length, 5);
            assert.equal(recordset.totalLength, 8);
            assert.equal(recordset.records[0].name, "YZÆ");
        });
    });
    it("should be able to skip rows", () => {
        myQuery.query.skip(10);
        return myQuery
            .then(recordset => {
            assert.equal(recordset.records.length, 3);
            assert.equal(recordset.records[0].name, "234");
        });
    });
    it("should be able to take rows", () => {
        myQuery.query.take(5);
        return myQuery
            .then(recordset => {
            assert.equal(recordset.records.length, 5);
        });
    });
    it("should be able to override skipping of rows", () => {
        myQuery.query.skip(3).take(5);
        var skip = myQuery.query.operations.values().next().value;
        myQuery.query.operations.remove(skip);
        return myQuery
            .then(recordset => {
            assert.equal(recordset.records.length, 5);
            assert.equal(recordset.records[0].name, "ABC");
        });
    });
    it("should fail for driver/query problems", (done) => {
        myQuery.shouldFail = true;
        myQuery
            .then((model) => {
            done(new Error('Expected Query promise to fail'));
        }, (err) => {
            if (err.message.toLowerCase() == 'internal mssql error')
                done();
            else
                done(err);
        });
    });
    it("should fail for driver/query problems using catch", (done) => {
        myQuery.shouldFail = true;
        myQuery
            .then((model) => {
            done(new Error('Expected Query promise to fail'));
        })
            .catch((err) => {
            if (err.message.toLowerCase() == 'internal mssql error')
                done();
            else
                done(err);
        });
    });
    it("should fail for driver/query problems using only catch", (done) => {
        myQuery.shouldFail = true;
        myQuery
            .catch((err) => {
            if (err.message.toLowerCase() == 'internal mssql error')
                done();
            else
                done(err);
        });
    });
    it("should fail for driver/query problems using nested catch", (done) => {
        myQuery.shouldFail = true;
        Promise.resolve(myQuery.then(() => {
            done(new Error('Never going to hit'));
        }))
            .catch((err) => {
            if (err.message.toLowerCase() == 'internal mssql error')
                done();
            else
                done(err);
        });
    });
});
class Select extends querystream_1.QueryStream {
    constructor(data) {
        super();
        this.data = data;
        // for mocking
        this.shouldFail = false;
        this.commandText = "SELECT *";
    }
    transform(record) {
        return {
            no: record.no,
            name: record.name
        };
    }
    /**
     * Overriding for mocking as we don't have a valid MsSql connection and request
     */
    createRequest() {
        if (this.shouldFail) {
            return new requestmock_1.RequestMock([], true);
        }
        else {
            return new requestmock_1.RequestMock(this.data);
        }
    }
}
//# sourceMappingURL=querystream.js.map