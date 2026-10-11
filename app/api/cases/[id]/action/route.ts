import {NextResponse} from 'next/server';
import {z} from 'zod';
import {createAdminClient} from '@/lib/supabase/admin';
import {inspectDossier} from '@/lib/dossier.mjs';
export const runtime='nodejs';
const input=z.discriminatedUnion('action',[
 z.object({action:z.literal('save'),revision:z.number().int().positive(),dossier:z.record(z.unknown())}),
 z.object({action:z.literal('submit')}),
 z.object({action:z.literal('review'),decision:z.enum(['approve','changes','reject']),note:z.string().trim().min(10).max(3000),reviewerName:z.string().trim().min(3).max(120)}),
 z.object({action:z.literal('publish')})
]);
export async function POST(req:Request,{params}:{params:Promise<{id:string}>}){
 const {id}=await params;
 if(!/^[a-f0-9-]{36}$/i.test(id))return NextResponse.json({error:'ID không hợp lệ'},{status:400});
 const db=createAdminClient(); let body:unknown;try{body=await req.json();}catch{return NextResponse.json({error:'JSON không hợp lệ'},{status:400});}
 const parsed=input.safeParse(body);if(!parsed.success)return NextResponse.json({error:'Yêu cầu không hợp lệ'},{status:422});
 const b=parsed.data;
 if(b.action==='save'&&JSON.stringify(b.dossier).length>450000)return NextResponse.json({error:'Hồ sơ quá lớn'},{status:413});
 if(b.action==='submit'){
  const {data}=await db.from('rnd_cases').select('dossier').eq('id',id).maybeSingle();
  if(!data)return NextResponse.json({error:'Không có quyền xem hồ sơ'},{status:404});
  const issues=inspectDossier(data.dossier);
  if(issues.length)return NextResponse.json({error:`Còn ${issues.length} mục chưa hoàn chỉnh`,issues},{status:422});
 }
 const fn=b.action==='save'?'rnd_save_case':b.action==='submit'?'rnd_submit_case':b.action==='review'?'rnd_review_case':'rnd_publish_case';
 const args=b.action==='save'?{p_id:id,p_revision:b.revision,p_dossier:b.dossier}:
   b.action==='review'?{p_id:id,p_decision:b.decision,p_note:b.note,p_reviewer_name:b.reviewerName}:{p_id:id};
 const {data,error}=await db.rpc(fn,args);
 if(error)return NextResponse.json({error:error.message},{status:422});
 return NextResponse.json({ok:true,result:data});
}
