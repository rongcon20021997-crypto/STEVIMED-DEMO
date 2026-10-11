/** Import PDFs as private files AND extracted TDS lines. Requires Poppler `pdftotext` on import machine.
 * `pdftotext` is NOT used on Vercel; analysis uses normalized TDS in Supabase.
 */
import {config} from 'dotenv';config({path:'.env.local'});
import {createClient} from '@supabase/supabase-js';
import {readdir,readFile} from 'node:fs/promises';
import {resolve,join} from 'node:path';
import {execFileSync} from 'node:child_process';
import {itemKey} from '../lib/import-helpers.mjs';
import {parseTdsText} from '../lib/tds-parser.mjs';
const idx=process.argv.indexOf('--directory');const folder=resolve(idx>=0?process.argv[idx+1]||'.':process.cwd());
const url=process.env.NEXT_PUBLIC_SUPABASE_URL,key=process.env.SUPABASE_SERVICE_ROLE_KEY;
if(!url||!key)throw Error('Supabase credentials missing in .env.local');
const supabase=createClient(url,key,{auth:{persistSession:false}});
async function main(){
  const names=(await readdir(folder)).filter(x=>x.toLowerCase().endsWith('.pdf'));
  let imported=0,skipped=0,parsed=0;
  for(const name of names){
    const match=name.match(/^(.+?)(?:\s+\((\d+)\))?\.pdf$/i);if(!match){skipped++;continue;}
    const code=match[1].trim();
    const {data:matches,error:findError}=await supabase.from('catalog_items').select('id,version').eq('code',code).eq('category','FINPRODUCT');
    if(findError)throw findError;
    const v=match[2]?Number(match[2]):(matches?.length===1?matches[0].version:null);
    if(v==null||!matches?.some(x=>x.version===v)){console.warn(`SKIP ambiguous/unrecognized version: ${name}`);skipped++;continue;}
    const productKey=itemKey(code,v),path=`tds/${code.replace(/[^a-zA-Z0-9.-]/g,'_')}/v${v}.pdf`;
    const file=await readFile(join(folder,name));
    const {error:uploadError}=await supabase.storage.from('rnd-documents').upload(path,file,{contentType:'application/pdf',upsert:true});
    if(uploadError)throw Error(`${name}: ${uploadError.message}`);
    const {error}=await supabase.from('product_documents').upsert({product_key:productKey,document_kind:'TDS',storage_path:path,
      original_name:name,review_status:'reference_only'}, {onConflict:'product_key,document_kind,original_name'});
    if(error)throw Error(`${name}: ${error.message}`);
    imported++;
    try{
      const pdfText=execFileSync('pdftotext',['-layout',join(folder,name),'-'],{encoding:'utf8',maxBuffer:12*1024*1024});
      const tds=parseTdsText(pdfText);
      if(tds.sourceCode&&tds.sourceCode!==code)throw Error(`TDS header code=${tds.sourceCode} != filename ${code}`);
      if(tds.sourceVersion&&tds.sourceVersion!==v)throw Error(`TDS header version=${tds.sourceVersion} != filename ${v}`);
      if(!tds.items.length){console.warn(`NO TABLE ${name}: manual verification required`);continue;}
      const rows=tds.items.map((r)=>({id:`${productKey}::${r.line_no}`,product_key:productKey,source_name:name,...r}));
      for(let i=0;i<rows.length;i+=150){const {error:e}=await supabase.from('tds_lines').upsert(rows.slice(i,i+150),{onConflict:'id'});if(e)throw e;}
      const {error:specError}=await supabase.from('tds_specs').upsert({product_key:productKey,packaging:tds.packaging,
        packaging_text:tds.packagingText,sterilization_verified:tds.sterilizationVerified,
        extraction_warnings:tds.warnings,source_name:name},{onConflict:'product_key'});
      if(specError)throw specError;
      parsed++;console.log(`TDS ${name} -> ${productKey}; ${tds.items.length} line(s), packaging: ${tds.packaging||'unknown'}`);
    }catch(e){console.warn(`TDS text could not be parsed (${name}):`,e);}
  }
  console.log(`TDS uploaded: ${imported}; structured TDS imported: ${parsed}; skipped: ${skipped}. Extracted evidence is NOT an approved technical review.`);
}
main().catch(e=>{console.error(e);process.exitCode=1;});
