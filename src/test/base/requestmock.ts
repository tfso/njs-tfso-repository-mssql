import * as MsSql from 'mssql';

export class RequestMock extends MsSql.Request {
    constructor(private data: Array<any>, private shouldFail: boolean = false) {
        super();
    }

    //public set multiple(value: boolean) {
    //    this._multiple = value;
    //}

    public query(command: string): Promise<void>;
    public query<Entity>(command: string): Promise<Entity[]>;
    public query(command: string, callback: (err?: any, recordset?: any, rowsAffected?: number) => void): void;
    public query<Entity>(command: string, callback: (err?: any, recordset?: Entity[]) => void): void;
    public query() {
        switch(arguments.length) {
            case 2:
                if (typeof arguments[1] == 'function') {
                    (<Function>arguments[1]).apply(arguments[1], [this.shouldFail ? new Error('Internal MsSql error') : null, (this.multiple ? [ this.data ] : this.data), 0]);
                }

                break;

            case 1:
                if (this.listenerCount('done') > 0) {
                    if (this.shouldFail) {
                        this.emit('error', new Error('Internal MsSql error'));
                    } else {
                        this.emit('recordset', Object.getOwnPropertyNames(this.data[0]));

                        for (let i = 0; i < this.data.length; i++) {
                            this.emit('row', this.data[i]);
                        }
                    }
                    this.emit('done', 0);

                    return Promise.resolve();
                } else {
                    return Promise.resolve(this.data);
                }
        }
    }

    public batch(batch: string): Promise<MsSql.recordSet>;
    public batch<Entity>(batch: string): Promise<Entity[]>;
    public batch(batch: string, callback: (err?: any, recordset?: any) => void): void;
    public batch<Entity>(batch: string, callback: (err?: any, recordset?: Entity[]) => void): void;
    public batch() {
        switch (arguments.length) {
            case 2:
                throw new Error('Not implemented');

            case 1:
                return Promise.reject(new Error('Not implemented'));
        }
    }

    public bulk(table: MsSql.Table): Promise<void>;
    public bulk(table: MsSql.Table, callback: (err: any, rowCount: any) => void): void;
    public bulk() {
        switch (arguments.length) {
            case 2:
                throw new Error('Not implemented');

            case 1:
                return Promise.reject(new Error('Not implemented'));
        }
    }
}