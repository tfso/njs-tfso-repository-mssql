﻿import * as MsSql from 'mssql';

export class RequestMock extends MsSql.Request {
    constructor(private data: Array<any>, private shouldFail: boolean = false) {
        super();
    }

    //public set multiple(value: boolean) {
    //    this._multiple = value;
    //}   
    
    public query<Entity>(command: string): Promise<MsSql.IResult<Entity>>
    public query<Entity>(command: string, callback: (err?: Error, recordset?: MsSql.IResult<Entity>) => void): void
    public query<Entity>(): any {
        switch(arguments.length) {
            case 2:
                if (typeof arguments[1] == 'function') {
                    (<Function>arguments[1]).apply(arguments[1], [this.shouldFail ? new Error('Internal MsSql error') : null, { recordsets: [ this.data ], rowsAffected: [0], output: {}}]);
                }

                break;

            case 1:
                if (super.listenerCount('done') > 0) {
                    if (this.shouldFail) {
                        super.emit('error', new Error('Internal MsSql error'));
                    } else {
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

    public batch(batch: string): Promise<MsSql.IResult<any>>
    public batch<Entity>(batch: string): Promise<MsSql.IResult<Entity>>
    public batch(batch: string, callback: (err?: any, recordset?: MsSql.IResult<any>) => void): void
    public batch<Entity>(batch: string, callback: (err?: any, recordset?: MsSql.IResult<Entity>) => void): void;
    public batch() {
        switch (arguments.length) {
            case 2:
                throw new Error('Not implemented');

            case 1:
                return Promise.reject(new Error('Not implemented'));
        }
    }

    public bulk(table: MsSql.Table): Promise<number>;
    public bulk(table: MsSql.Table, callback: (err: Error, rowCount: any) => void): void;
    public bulk() {
        switch (arguments.length) {
            case 2:
                throw new Error('Not implemented');

            case 1:
                return Promise.reject(new Error('Not implemented'));
        }
    }
}