import {NextResponse} from 'next/server';
import {createAdminClient} from '@/lib/supabase/admin';
export async function GET(request:Request){
  const db=createAdminClient();  const productKey=new URL(request.url).searchParams.get('productKey');
  if(!productKey||productKey.length>120)return NextResponse.json({error:'Invalid productKey'},{status:400});
  const {data,error}=await db.from('product_documents').select('storage_path').eq('product_key',productKey).eq('document_kind','TDS').order('created_at',{ascending:false}).limit(1).maybeSingle();
  if(error||!data?.storage_path)return NextResponse.json({error:'No TDS reference'},{status:404});
  const {data:signed,error:signError}=await db.storage.from('rnd-documents').createSignedUrl(data.storage_path,120);
  if(signError||!signed?.signedUrl)return NextResponse.json({error:'Cannot open private TDS'},{status:500});
  return NextResponse.redirect(signed.signedUrl,{status:302});
}
