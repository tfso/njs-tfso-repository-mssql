"use strict";
var __extends = (this && this.__extends) || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
};
var queryrecordset_1 = require('./../db/queryrecordset');
describe("When using QueryTemplate for MsSql queries", function () {
    var myQuery;
    beforeEach(function () {
        myQuery = new SelectOne(1);
    });
    it("should return a model", function (done) {
        myQuery.then(function (model) {
            if (model != null && model.length > 0 && model.records[0].no == 1)
                done();
            else
                done(new Error('Expected a model with property "no" equal 1'));
        }, done);
    });
    it("should handle multiple thens", function (done) {
        myQuery
            .then(function (model) {
            return model.length > 0 ? model.records[0] : null;
        })
            .then(function (model) {
            if (model != null && model.no == 1)
                done();
            else
                done(new Error('Expected a model with property "no" equal 1'));
        })
            .catch(done);
    });
    it("should fail for driver/query problems", function (done) {
        myQuery.shouldFail = true;
        myQuery
            .then(function (model) {
            done(new Error('Expected Query promise to fail'));
        }, function (err) {
            if (err.message.toLowerCase() == 'internal mssql error')
                done();
            else
                done(err);
        });
    });
    it("should fail for driver/query problems using catch", function (done) {
        myQuery.shouldFail = true;
        myQuery
            .then(function (model) {
            done(new Error('Expected Query promise to fail'));
        })
            .catch(function (err) {
            if (err.message.toLowerCase() == 'internal mssql error')
                done();
            else
                done(err);
        });
    });
    it("should fail for driver/query problems using only catch", function (done) {
        myQuery.shouldFail = true;
        myQuery
            .catch(function (err) {
            if (err.message.toLowerCase() == 'internal mssql error')
                done();
            else
                done(err);
        });
    });
    it("should fail for driver/query problems using nested catch", function (done) {
        myQuery.shouldFail = true;
        Promise.resolve(myQuery.then(function () {
            done(new Error('Never going to hit'));
        }))
            .catch(function (err) {
            if (err.message.toLowerCase() == 'internal mssql error')
                done();
            else
                done(err);
        });
    });
});
var SelectOne = (function (_super) {
    __extends(SelectOne, _super);
    function SelectOne(no) {
        _super.call(this);
        // for mocking
        this.shouldFail = false;
        this.input("num", no);
        this.commandText = "SELECT 1 AS no, 'Tekst' AS name WHERE 1 = @num";
    }
    SelectOne.prototype.transform = function (record) {
        return {
            no: record.no,
            name: record.name
        };
    };
    /**
     * Overriding for mocking as we don't have a valid MsSql connection and request
     */
    SelectOne.prototype.executeQuery = function () {
        var _this = this;
        return new Promise(function (resolve, reject) {
            if (_this.shouldFail == false) {
                if (_this.parameters["num"].value == 1) {
                    resolve(new queryrecordset_1.RecordSet(new Array({
                        no: 1, name: 'Tekst'
                    }).map(_this.transform)));
                }
                else {
                    resolve(new queryrecordset_1.RecordSet(new Array().map(_this.transform)));
                }
            }
            else {
                reject(new Error('Internal MsSql error'));
            }
        });
    };
    return SelectOne;
}(queryrecordset_1.QueryRecordSet));
//# sourceMappingURL=mssql_queryrecordset.js.map