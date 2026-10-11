import {NextResponse} from 'next/server';
import {createAdminClient} from '@/lib/supabase/admin';
import {analyzeSchema} from '@/lib/schemas';
import {performAnalysis} from '@/lib/analyze';
export const runtime='nodejs';
export async function POST(request:Request){
  const db=createAdminClient();
    let body:unknown;
  try{body=await request.json();}catch{return NextResponse.json({error:'JSON không hợp lệ.'},{status:400});}
  const parsed=analyzeSchema.safeParse(body);
  if(!parsed.success)return NextResponse.json({error:parsed.error.issues.map(i=>i.message).join('; ')},{status:422});
  try{
    const result=await performAnalysis(db,parsed.data.items,parsed.data.requestText);
    const {data:saved,error}=await db.from('analysis_runs').insert({user_id:null,request_text:parsed.data.requestText,request_items:parsed.data.items,result}).select('id').single();
    if(error)throw Error(`Không lưu được lịch sử: ${error.message}`);
    return NextResponse.json({analysisId:saved.id,...result});
  }catch(e){console.error('analysis failed',e);return NextResponse.json({error:'Phân tích thất bại. Vui lòng kiểm tra SQL, quyền truy cập và dữ liệu import.'},{status:500});}
}
