export function buildDossier(args:{run:{id?:string;request_text?:string;request_items?:any[]};candidate?:any;strategy?:string}):any;
export function inspectDossier(d:any):{path:string;detail:string}[];
export function dossierStats(d:any):{requirements:number;bom:number;newParts:number;issues:number;ready:boolean};
