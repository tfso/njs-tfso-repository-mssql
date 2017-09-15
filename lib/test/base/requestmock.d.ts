import * as MsSql from 'mssql';
export declare class RequestMock extends MsSql.Request {
    private data;
    private shouldFail;
    constructor(data: Array<any>, shouldFail?: boolean);
    query(command: string): Promise<void>;
    query<Entity>(command: string): Promise<Entity[]>;
    query(command: string, callback: (err?: any, recordset?: any, rowsAffected?: number) => void): void;
    query<Entity>(command: string, callback: (err?: any, recordset?: Entity[]) => void): void;
    batch<Entity>(batch: string): Promise<MsSql.IRecordSet<Entity>>;
    batch<Entity>(batch: string): Promise<Entity[]>;
    batch(batch: string, callback: (err?: any, recordset?: any) => void): void;
    batch<Entity>(batch: string, callback: (err?: any, recordset?: Entity[]) => void): void;
    bulk(table: MsSql.Table): Promise<number>;
    bulk(table: MsSql.Table, callback: (err: Error, rowCount: any) => void): void;
}
