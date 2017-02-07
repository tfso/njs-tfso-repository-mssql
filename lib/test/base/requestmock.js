"use strict";
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
                    arguments[1].apply(arguments[1], [this.shouldFail ? new Error('Internal MsSql error') : null, (this.multiple ? [this.data] : this.data), 0]);
                }
                break;
            case 1:
                if (this.listenerCount('done') > 0) {
                    if (this.shouldFail) {
                        this.emit('error', new Error('Internal MsSql error'));
                    }
                    else {
                        this.emit('recordset', Object.getOwnPropertyNames(this.data[0]));
                        for (let i = 0; i < this.data.length; i++) {
                            this.emit('row', this.data[i]);
                        }
                    }
                    this.emit('done', 0);
                    return Promise.resolve();
                }
                else {
                    return Promise.resolve(this.data);
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