declare module 'sql.js/dist/sql-wasm.js' {
 const initSqlJs: (config:{wasmBinary:ArrayBuffer|Uint8Array})=>Promise<any>;
 export default initSqlJs;
}
declare module '*.wasm?inline' {const uri:string;export default uri;}
