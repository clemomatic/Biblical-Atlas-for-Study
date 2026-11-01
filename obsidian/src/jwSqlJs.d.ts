declare module 'sql.js/dist/sql-wasm-inline.js' {
  interface SqlResult { columns:string[]; values:unknown[][] }
  interface Statement {
    bind(values?: unknown[]): boolean;
    step():boolean;
    get():unknown[];
    free():boolean;
  }
  interface Database {
    exec(sql:string):SqlResult[];
    prepare(sql:string):Statement;
    run(sql:string, params?: unknown[]):Database;
    export():Uint8Array;
    close():void;
  }
  export interface SqlJsModule {Database:new (data?:Uint8Array)=>Database}
  export default function initSqlJs():Promise<SqlJsModule>;
}
