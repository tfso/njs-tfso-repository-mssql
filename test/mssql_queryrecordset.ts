import assert = require('assert');
import { QueryRecordSet, RecordSet } from './../lib/queryrecordset';

describe("When using QueryTemplate for MsSql queries", () => {
    var myQuery: SelectOne;

    beforeEach(() => {
        myQuery = new SelectOne(1);
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

    constructor(no: number) {
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
    protected executeQuery() {
        return new Promise((resolve, reject) => {
            if (this.shouldFail == false) {

                if (this.parameters["num"].value == 1) {
                    resolve(new RecordSet<IModel>(
                        new Array({
                            no: 1, name: 'Tekst'
                        }).map(this.transform)
                    ))
                }
                else {
                    resolve(new RecordSet<IModel>(new Array().map(this.transform)));
                }
            }
            else {
                reject(new Error('Internal MsSql error'));
            }
        })
    }


}


