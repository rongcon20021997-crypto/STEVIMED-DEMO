export function makeZip(files:Record<string,string | Buffer | Uint8Array>):Buffer;
export function csv(headers:unknown[],rows:unknown[][]):string;
export function htmlReport(record:any,options?:{print?:boolean}):string;
export function exportCaseZip(record:any,events?:any[]):Promise<Buffer>;
