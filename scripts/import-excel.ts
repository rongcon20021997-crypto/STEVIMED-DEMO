/**
 * Import official ERP exports into Supabase; run in a trusted local terminal.
 * Usage: npm run import:data -- --directory "../CÁC TÀI LIỆU ĐÍNH KÈM"
 * Does NOT publish original workbooks into Next.js/public or browser bundles.
 */
import ExcelJS from 'exceljs';
import {resolve,join} from 'node:path';
import {existsSync} from 'node:fs';
import {createClient} from '@supabase/supabase-js';
import {aggregateBomRows,categoryOf,itemKey} from '../lib/import-helpers.mjs';
import {config} from 'dotenv';
config({path:'.env.local'});
const idx=process.argv.indexOf('--directory');
const folder=resolve(idx>=0?process.argv[idx+1]||'.':process.cwd());
const files={stock:'STOCK_ITEMS (OFFICIAL).xlsx',attrs:'LIST_OF_ITEM_ATTRIBUTES (OFFICIAL).xlsx',bom:'LIST_OF_BOM_VIEW (OFFICIAL).xlsx'};
for(const name of Object.values(files)){if(!existsSync(join(folder,name)))throw Error(`Missing ${join(folder,name)}`);}
const url=process.env.NEXT_PUBLIC_SUPABASE_URL,key=process.env.SUPABASE_SERVICE_ROLE_KEY;
if(!url||!key)throw Error('Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local');
const supabase=createClient(url,key,{auth:{persistSession:false}});
const value=(row:ExcelJS.Row,col:number):string=>{
  const cell=row.getCell(col);const raw=cell.value;
  if(raw==null)return '';
  if(typeof raw==='object' && 'result' in raw)return String(raw.result??'').trim();
  if(typeof raw==='object' && 'richText' in raw)return raw.richText.map(x=>x.text).join('').trim();
  return String(raw).trim();
};
const toNum=(x:string):number|null=>{if(!x)return null;const n=Number(x.replace(',','.'));return Number.isFinite(n)?n:null;};
const versionFor=(code:string,ver:string,category:string)=>category==='FINPRODUCT'?(Number(ver)||1):0;
async function load(filename:string,sheetName:string){
  console.log(`Reading: ${filename}`);
  const wb=new ExcelJS.Workbook();await wb.xlsx.readFile(join(folder,filename));
  const sheet=wb.getWorksheet(sheetName);if(!sheet)throw Error(`Missing worksheet: ${sheetName}`);
  return sheet;
}
async function upload(table:string,items:Record<string,unknown>[],batchSize=200){
  for(let i=0;i<items.length;i+=batchSize){
    const {error}=await supabase.from(table).upsert(items.slice(i,i+batchSize),{onConflict:'id'});
    if(error)throw Error(`${table}, rows ${i+1}-${i+batchSize}: ${error.message}`);
    if(i===0||i+batchSize>=items.length||i%4000===0)console.log(`${table}: ${Math.min(i+batchSize,items.length)}/${items.length}`);
  }
}
async function main(){
  const stock=await load(files.stock,'STOCK_ITEMS');
  const items=new Map<string,Record<string,unknown>>();
  stock.eachRow((row,n)=>{
    if(n===1)return;
    const code=value(row,1);if(!code)return;
    const category=categoryOf(value(row,4),code),version=versionFor(code,value(row,2),category);
    const id=itemKey(code,version);
    items.set(id,{id,code,version,category,name:value(row,7)||code,english_name:value(row,8)||null,
      class_1:value(row,4)||null,class_2:value(row,5)||null,base_unit:value(row,10)||null,
      width_cm:null,length_cm:null,height_cm:null,tds_description:value(row,20)||null,
      is_active:!value(row,30)||!/^inact/i.test(value(row,30))});
  });
  console.log(`Stock keys: ${items.size}`);
  const attr=await load(files.attrs,'qry_LIST_OF_ITEM_ATTRIBUTES');
  attr.eachRow((row,n)=>{
    if(n===1)return;
    const code=value(row,1);if(!code)return;
    const cat=categoryOf('',code),version=versionFor(code,value(row,2),cat),id=itemKey(code,version);
    const existing=items.get(id)||{id,code,version,category:cat,name:value(row,3)||code};
    existing.width_cm=toNum(value(row,6));existing.length_cm=toNum(value(row,7));
    existing.height_cm=toNum(value(row,8));
    if(!existing.name)existing.name=value(row,3)||code;
    items.set(id,existing);
  });
  const bom=await load(files.bom,'Qry_LIST_OF_BOM_VIEW');
  type InputRow={rowIndex:number;productCode:string;productVersion:number;componentCode:string;componentName:string;qtyL1:number|null;showOnTds:string;process:string;materialCode:string;materialName:string;qtyL2:number|null};
  const raw:InputRow[]=[];
  bom.eachRow((row,n)=>{
    if(n===1)return;
    const productCode=value(row,3),componentCode=value(row,9);
    if(!productCode||!componentCode)return;
    const version=Number(value(row,5))||1,productKey=itemKey(productCode,version);
    if(!items.has(productKey)){
      items.set(productKey,{id:productKey,code:productCode,version,category:'FINPRODUCT',name:value(row,4)||productCode,
        width_cm:null,length_cm:null,height_cm:null});
    }
    const compKey=itemKey(componentCode,0);
    if(!items.has(compKey))items.set(compKey,{id:compKey,code:componentCode,version:0,category:categoryOf('',componentCode),name:value(row,10)||componentCode});
    raw.push({rowIndex:n,productCode,productVersion:version,componentCode,componentName:value(row,10),
      qtyL1:toNum(value(row,13)),showOnTds:value(row,11),process:value(row,14),materialCode:value(row,15),
      materialName:value(row,16),qtyL2:toNum(value(row,17))});
  });
  const aggregated=aggregateBomRows(raw);
  console.log(`Staging: ${items.size} catalog keys; ${raw.length} raw BOM rows => ${aggregated.components.length} L1 records and ${aggregated.materials.length} material mappings.`);
  await upload('catalog_items',[...items.values()]);
  await upload('bom_components',aggregated.components);
  await upload('bom_materials',aggregated.materials);
  console.log('Import finished. BOM quantities are preliminary until verified against TDS.');
}
main().catch(err=>{console.error(err);process.exitCode=1;});
