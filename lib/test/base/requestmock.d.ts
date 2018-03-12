import * as MsSql from 'mssql';
export declare class RequestMock extends MsSql.Request {
    private data;
    private shouldFail;
    constructor(data: Array<any>, shouldFail?: boolean);
    query<Entity>(command: string): Promise<MsSql.IResult<Entity>>;
    query<Entity>(command: string, callback: (err?: Error, recordset?: MsSql.IResult<Entity>) => void): void;
    batch(batch: string): Promise<MsSql.IResult<any>>;
    batch<Entity>(batch: string): Promise<MsSql.IResult<Entity>>;
    batch(batch: string, callback: (err?: any, recordset?: MsSql.IResult<any>) => void): void;
    batch<Entity>(batch: string, callback: (err?: any, recordset?: MsSql.IResult<Entity>) => void): void;
    bulk(table: MsSql.Table): Promise<number>;
    bulk(table: MsSql.Table, callback: (err: Error, rowCount: any) => void): void;
}
