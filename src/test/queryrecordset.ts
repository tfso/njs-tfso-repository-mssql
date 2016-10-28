import assert = require('assert');

import * as MsSql from 'mssql';

import { QueryRecordSet, RecordSet } from './../db/queryrecordset';
import { RequestMock } from './base/requestmock';

describe("When using QueryRecordSet for MsSql queries", () => {
    var myQuery: SelectOne,
        data: Array<any>;

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

        myQuery = new SelectOne(data, 1);
    })

    it("should return a model", (done) => {
        myQuery.then(
            (model) => {
                if (model != null && model.length > 0 && model.records[0].no == 1)
                    done();
                else
                    done(new Error('Expected a model with property "no" equal 1'));
            },
            done
        );
    });

    it("should handle paging", () => {
        myQuery = new SelectOne(data);
        myQuery.query.skip(3).take(5);

        return myQuery
            .then(recordset => {
                assert.equal(recordset.records.length, 5);
                assert.equal(recordset.records[0].name, "JKL");
            });
    })

    it("should be able to skip rows", () => {
        myQuery = new SelectOne(data);
        myQuery.query.skip(10);

        return myQuery
            .then(recordset => {
                assert.equal(recordset.records.length, 3);
                assert.equal(recordset.records[0].name, "234");
            });
    })

    it("should be able to take rows", () => {
        myQuery = new SelectOne(data);
        myQuery.query.take(5);

        return myQuery
            .then(recordset => {
                assert.equal(recordset.records.length, 5);
            });
    })

    it("should be able to override skipping of rows", () => {
        myQuery = new SelectOne(data);
        myQuery.query.skip(3).take(5);

        var skip = myQuery.query.operations.values().next().value;

        myQuery.query.operations.remove(skip);

        return myQuery
            .then(recordset => {
                assert.equal(recordset.records.length, 5);
                assert.equal(recordset.records[0].name, "ABC");
            });
    })

    it("should handle multiple thens", (done) => {
        myQuery
            .then((model) => {
                return model.length > 0 ? model.records[0] : null;
            })
            .then((model) => {
                if (model != null && model.no == 1)
                    done();
                else
                    done(new Error('Expected a model with property "no" equal 1'));
            })
            .catch(done);
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
    })

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
    })

    it("should fail for driver/query problems using only catch", (done) => {

        myQuery.shouldFail = true;

        myQuery
            .catch((err) => {
                if (err.message.toLowerCase() == 'internal mssql error')
                    done();
                else
                    done(err);
            });
    })

    it("should fail for driver/query problems using nested catch", (done) => {
        myQuery.shouldFail = true;

        Promise.resolve(
            myQuery.then(() => {
                done(new Error('Never going to hit'));
            })
        )
            .catch((err) => {
                if (err.message.toLowerCase() == 'internal mssql error')
                    done();
                else
                    done(err);
            });
    })
});


interface IModel {
    no: number
    name: string
}

class SelectOne extends QueryRecordSet<IModel>
{
    // for mocking
    public shouldFail = false;

    constructor(private data: Array<any>, no?: number) {
        super();

        this.input("num", no);
        this.commandText = "SELECT 1 AS no, 'Tekst' AS name WHERE 1 = @num";
    }

    protected transform(record) {
        return <IModel>{
            no: record.no,
            name: record.name
        };
    }

    /**
     * Overriding for mocking as we don't have a valid MsSql connection and request
     */
    protected createRequest(): MsSql.Request {
        if (this.shouldFail) {
            return new RequestMock([], true);
        } else {
            return (this.parameters["num"].value != null) ? new RequestMock(this.data.filter(record => record.no == this.parameters["num"].value)) : new RequestMock(this.data);
        }
    }
}


