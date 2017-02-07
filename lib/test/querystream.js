"use strict";
const assert = require("assert");
const querystream_1 = require("./../db/querystream");
const requestmock_1 = require("./base/requestmock");
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