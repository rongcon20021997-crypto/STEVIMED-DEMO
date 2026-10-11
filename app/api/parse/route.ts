import {NextResponse} from 'next/server';
import {createAdminClient} from '@/lib/supabase/admin';
import {requirementSchema} from '@/lib/schemas';
import {z} from 'zod';
import {parseTechnicalRequest} from '@/lib/requirement-parser.mjs';
export const runtime='nodejs';
const inputSchema=z.object({text:z.string().trim().min(5).max(20000)});
async function parseWithAI(text:string){
  if(!process.env.OPENAI_API_KEY)return null;
  const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),16000);
  try{
    const response=await fetch('https://api.openai.com/v1/chat/completions',{method:'POST',signal:controller.signal,
      headers:{'Content-Type':'application/json',Authorization:`Bearer ${process.env.OPENAI_API_KEY}`},
      body:JSON.stringify({model:process.env.OPENAI_MODEL||'gpt-4.1-mini',temperature:0,
        response_format:{type:'json_object'},messages:[
          {role:'system',content:'Trích yêu cầu cấu hình R&D tiếng Việt. Trả JSON {"items":[{"id":"stt-1","name":"...","quantity":1,"widthCm":100,"lengthCm":200,"heightCm":null,"tolerancePct":5,"itemType":"SEMIPRODUCT|MATERIAL|UNKNOWN","material":"...","notes":"..."}]}. Không tự tạo mã, không bỏ chiều cao nếu có. Dung sai chỉ lấy nếu văn bản ghi. Nếu loại không chắc chắn chọn UNKNOWN. Nếu thiếu số lượng tạm đặt 1 và ghi notes "CHƯA CÓ SỐ LƯỢNG, CẦN XÁC NHẬN". Không thay đổi điều kiện chất liệu, bao bì, tiệt trùng. Tối đa 80 dòng.'},
          {role:'user',content:text}]})});
    if(!response.ok)return null;
    const data=await response.json(),content=data.choices?.[0]?.message?.content;
    if(!content)return null;
    const parsed=JSON.parse(content),checked=z.array(requirementSchema).min(1).max(80).safeParse(parsed.items);
    return checked.success?checked.data:null;
  }catch(e){console.warn('optional AI parsing unavailable',e);return null;}
  finally{clearTimeout(timer);}
}
export async function POST(request:Request){
  const db=createAdminClient();  let body:unknown;try{body=await request.json();}catch{return NextResponse.json({error:'JSON không hợp lệ.'},{status:400});}
  const check=inputSchema.safeParse(body);if(!check.success)return NextResponse.json({error:'Nội dung trống hoặc quá dài.'},{status:422});
  const text=check.data.text,extracted=parseTechnicalRequest(text);
  if(extracted.items.length){const checked=extracted.items.flatMap(item=>{const r=requirementSchema.safeParse(item);return r.success?[r.data]:[];});
    if(checked.length===extracted.items.length)return NextResponse.json({items:checked,conditions:extracted.conditions,mode:'rules',warnings:extracted.warnings,
      warning:'Đã tách theo STT, kiểm tra lại nhóm BTP/NVL, chất liệu, dung sai và số lượng trước khi đối chiếu.'});}
  const aiItems=await parseWithAI(text);
  if(aiItems?.length)return NextResponse.json({items:aiItems,conditions:extracted.conditions,mode:'ai',warning:'Dữ liệu được trích bằng AI, mọi thông số phải được người dùng xác nhận.'});
  return NextResponse.json({error:'Chưa đọc được danh sách cấu hình. Hãy ghi từng dòng 1), 2)... hoặc cấu hình OPENAI_API_KEY để hỗ trợ định dạng tự do.'},{status:422});
}
