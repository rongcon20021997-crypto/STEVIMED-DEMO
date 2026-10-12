import {NextResponse} from 'next/server';
import {createAdminClient} from '@/lib/supabase/admin';
import {htmlReport,exportCaseZip} from '@/lib/export-dossier.mjs';
import {bomWorkbook,tdsWorkbook,differencesWorkbook} from '@/lib/xlsx-dossier.mjs';
import {dossierPdf} from '@/lib/pdf-dossier.mjs';
export const runtime='nodejs';
export const dynamic='force-dynamic';
export const maxDuration=30;

const formats=['report-pdf','bom-xlsx','tds-xlsx','tds-pdf','sop-pdf','differences-xlsx','zip','print'] as const;
type ExportFormat=(typeof formats)[number];
const registry:Record<Exclude<ExportFormat,'print'>,{mime:string;ext:string;name:string}>={
 'report-pdf':{mime:'application/pdf',ext:'pdf',name:'Bao_cao_RND'},
 'bom-xlsx':{mime:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',ext:'xlsx',name:'BOM_thanh_pham'},
 'tds-xlsx':{mime:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',ext:'xlsx',name:'TDS_thanh_pham'},
 'tds-pdf':{mime:'application/pdf',ext:'pdf',name:'TDS_thanh_pham'},
 'sop-pdf':{mime:'application/pdf',ext:'pdf',name:'SOP_san_xuat'},
 'differences-xlsx':{mime:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',ext:'xlsx',name:'Doi_chieu_sai_khac'},
 zip:{mime:'application/zip',ext:'zip',name:'HO_SO_RND'}
};
export async function GET(req:Request,{params}:{params:Promise<{id:string}>}){
 const {id}=await params,db=createAdminClient();
 const format=new URL(req.url).searchParams.get('format')||'zip';
 if(!formats.includes(format as ExportFormat))return NextResponse.json({error:'Định dạng tải file không hỗ trợ'},{status:400});
 const {data:record,error}=await db.from('rnd_cases').select('*').eq('id',id).maybeSingle();
 if(error||!record)return NextResponse.json({error:'Không tìm thấy hồ sơ R&D'},{status:404});
 const headers={'Cache-Control':'private, no-store, max-age=0','X-Content-Type-Options':'nosniff'};
 if(format==='print'||format==='report-pdf'||format==='tds-pdf'||format==='sop-pdf')return new Response(htmlReport(record,{print:true}),{headers:{...headers,'Content-Type':'text/html; charset=utf-8','Content-Security-Policy':"default-src 'none'; style-src 'unsafe-inline'; script-src 'unsafe-inline'"}});
 try{
  let events:{actor_id:string|null;event:string;note:string|null;snapshot_revision:number;created_at:string}[]=[];
  if(format==='report-pdf'||format==='zip'){
   const {data,error:eventsError}=await db.from('rnd_case_events').select('actor_id,event,note,snapshot_revision,created_at').eq('case_id',id).order('created_at');
   if(eventsError)throw eventsError;
   events=data||[];
  }
  // Use the saved database revision, never unsaved values from the client's form.
  let result:Buffer;
  switch(format){
   case 'report-pdf':result=await dossierPdf(record,'report',events);break;
   case 'bom-xlsx':result=bomWorkbook(record);break;
   case 'tds-xlsx':result=tdsWorkbook(record);break;
   case 'tds-pdf':result=await dossierPdf(record,'tds');break;
   case 'sop-pdf':result=await dossierPdf(record,'sop');break;
   case 'differences-xlsx':result=differencesWorkbook(record);break;
   default:result=await exportCaseZip(record,events);break;
  }
  const {mime,ext,name}=registry[format as Exclude<ExportFormat,'print'>];
  const status=record.status==='published'?'DA_PHAT_HANH':'BAN_NHAP';
  const fileName=`${name}_${id.slice(0,8)}_Rev${Number(record.revision)||1}_${status}.${ext}`;
  return new Response(new Uint8Array(result),{headers:{...headers,'Content-Type':mime,'Content-Disposition':`attachment; filename="${fileName}"`,'Content-Length':String(result.length)}});
 }catch(e:unknown){
  const msg=e instanceof Error?e.message:String(e);
  console.error('R&D export error',e);
  return NextResponse.json({error:'Không thể tạo tài liệu. Kiểm tra thư viện xuất PDF và dữ liệu hồ sơ trên server.',detail:msg},{status:500});
 }
}
