import {NextResponse} from 'next/server';
import {z} from 'zod';
import {createAdminClient} from '@/lib/supabase/admin';
import {buildDossier} from '@/lib/dossier.mjs';
export const runtime='nodejs';
const createSchema=z.object({analysisId:z.string().uuid(),productKey:z.string().max(140).nullable().optional(),strategy:z.enum(['existing','new_version','new_code'])});
export async function GET(){
 const db=createAdminClient(); const {data,error}=await db.from('rnd_cases').select('id,status,revision,created_at,updated_at,official_code,official_version,owner_id,dossier').order('created_at',{ascending:false}).limit(100);
 if(error)return NextResponse.json({error:error.message},{status:500});
 return NextResponse.json({cases:(data||[]).map(c=>({...c,dossier:{productName:c.dossier?.productName,baseCode:c.dossier?.baseCode,baseVersion:c.dossier?.baseVersion,strategy:c.dossier?.strategy}}))});
}
export async function POST(req:Request){
 const db=createAdminClient(); let body:unknown;try{body=await req.json();}catch{return NextResponse.json({error:'JSON không hợp lệ'},{status:400});}
 const checked=createSchema.safeParse(body);if(!checked.success)return NextResponse.json({error:'Dữ liệu tạo hồ sơ không hợp lệ'},{status:422});
 const {analysisId,productKey,strategy}=checked.data;
 const {data:run,error:runError}=await db.from('analysis_runs').select('id,request_items,request_text,result').eq('id',analysisId).single();
 if(runError||!run)return NextResponse.json({error:'Không tìm thấy phiên phân tích'},{status:404});
 const result=run.result as {candidates?:{productKey:string}[]};
 const candidate=productKey?result?.candidates?.find(x=>x.productKey===productKey):null;
 if(productKey&&!candidate)return NextResponse.json({error:'Mã tham chiếu không nằm trong kết quả phân tích'},{status:422});
 if(strategy!=='new_code'&&!candidate)return NextResponse.json({error:'Cần chọn mã tham chiếu khi dùng mã hiện có hoặc version mới'},{status:422});
 const dossier=buildDossier({run,candidate,strategy});
 const {data,error}=await db.from('rnd_cases').insert({owner_id:null,analysis_run_id:run.id,dossier,status:'draft',revision:1}).select('id').single();
 if(error)return NextResponse.json({error:error.message},{status:500});
 return NextResponse.json({id:data.id,status:'draft'},{status:201});
}
