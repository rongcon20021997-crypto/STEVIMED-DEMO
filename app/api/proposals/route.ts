import {NextResponse} from 'next/server';
import {createAdminClient} from '@/lib/supabase/admin';
import {proposalSchema} from '@/lib/schemas';
export async function POST(request:Request){
  const db=createAdminClient();  let value:unknown;try{value=await request.json();}catch{return NextResponse.json({error:'JSON không hợp lệ.'},{status:400});}
  const check=proposalSchema.safeParse(value);
  if(!check.success)return NextResponse.json({error:check.error.issues.map(i=>i.message).join('; ')},{status:422});
  const p=check.data;
  if(p.proposalType!=='new_code'&&!p.baseProductKey)return NextResponse.json({error:'Phải chọn mã thành phẩm gốc.'},{status:422});
  if(p.baseProductKey){
    const {data}=await db.from('catalog_items').select('id').eq('id',p.baseProductKey).eq('category','FINPRODUCT').maybeSingle();
    if(!data)return NextResponse.json({error:'Mã thành phẩm không tồn tại.'},{status:422});
  }
  if(p.analysisRunId){
    const {data}=await db.from('analysis_runs').select('id').eq('id',p.analysisRunId).maybeSingle();
    if(!data)return NextResponse.json({error:'Không tìm thấy phiên phân tích.'},{status:422});
  }
  const {data,error}=await db.from('change_proposals').insert({
    user_id:null,analysis_run_id:p.analysisRunId||null,proposal_type:p.proposalType,
    base_product_key:p.baseProductKey||null,justification:p.justification,
    suggested_changes:p.suggestedChanges,status:'pending'
  }).select('id').single();
  if(error)return NextResponse.json({error:error.message},{status:500});
  return NextResponse.json({id:data.id,status:'pending'}, {status:201});
}
