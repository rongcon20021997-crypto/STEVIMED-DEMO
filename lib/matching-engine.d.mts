import type {RequirementItem,CatalogItem,BomComponent,ProductCandidate} from './types';
export function normalize(v?:unknown):string;
export function tokens(v:string):string[];
export function nameSimilarity(a:string,b:string):number;
export function sizeSimilarity(req:RequirementItem,catalog:{width_cm:number|null;length_cm:number|null;height_cm?:number|null},tolerance?:number|null):{score:number;reason:string|null;verified:boolean};
export function itemSimilarity(req:RequirementItem,item:Partial<CatalogItem>&{code:string;name:string},materials?:string[]):{score:number;nameScore:number;sizeReason:string|null;materialReason:string|null;catalog:unknown};
export type TdsLine={line_no:number;component_code:string;component_name:string;quantity:number;width_cm:number|null;length_cm:number|null;height_cm:number|null};
export function groupTdsRows(rows:TdsLine[]):Array<TdsLine & {tdsLines:number[]}>;
export function rankProduct(reqs:RequirementItem[],product:Pick<CatalogItem,'id'|'code'|'version'|'name'>,
 components:BomComponent[],catalogByCode:Map<string,Partial<CatalogItem>&{code:string;name:string}>,materialsByCode:Map<string,string[]>,
 documents?:{bom:boolean;tds:boolean;sop:boolean},tdsRows?:TdsLine[],
 conditions?:{packaging?:string|null;requiresSterile?:boolean},tdsSpec?:{packaging?:string|null;sterilization_verified?:boolean}|null):ProductCandidate;
