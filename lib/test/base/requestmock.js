"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const MsSql = require("mssql");
class RequestMock extends MsSql.Request {
    constructor(data, shouldFail = false) {
        super();
        this.data = data;
        this.shouldFail = shouldFail;
    }
    query() {
        switch (arguments.length) {
            case 2:
                if (typeof arguments[1] == 'function') {
                    arguments[1].apply(arguments[1], [this.shouldFail ? new Error('Internal MsSql error') : null, { recordsets: [this.data], rowsAffected: [0], output: {} }]);
                }
                break;
            case 1:
                if (super.listenerCount('done') > 0) {
                    if (this.shouldFail) {
                        super.emit('error', new Error('Internal MsSql error'));
                    }
                    else {
                        super.emit('recordset', Object.getOwnPropertyNames(this.data[0]));
                        for (let i = 0; i < this.data.length; i++) {
                            super.emit('row', this.data[i]);
                        }
                    }
                    super.emit('done', { rowsAffected: [0], output: {} });
                    return Promise.resolve();
                }
                else {
                    return Promise.resolve({
                        recordsets: [this.data],
                        rowsAffected: [0],
                        output: {}
                    });
                }
        }
    }
    batch() {
        switch (arguments.length) {
            case 2:
                throw new Error('Not implemented');
            case 1:
                return Promise.reject(new Error('Not implemented'));
        }
    }
    bulk() {
        switch (arguments.length) {
            case 2:
                throw new Error('Not implemented');
            case 1:
                return Promise.reject(new Error('Not implemented'));
        }
    }
}
exports.RequestMock = RequestMock;
//# sourceMappingURL=requestmock.js.map