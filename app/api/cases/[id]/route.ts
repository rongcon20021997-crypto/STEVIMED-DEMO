import {NextResponse} from 'next/server';
import {createAdminClient} from '@/lib/supabase/admin';
export const runtime='nodejs';
export async function GET(_:Request,{params}:{params:Promise<{id:string}>}){
 const {id}=await params;const db=createAdminClient(); const [{data,error},{data:events}]=await Promise.all([
  db.from('rnd_cases').select('*').eq('id',id).maybeSingle(),
  db.from('rnd_case_events').select('event,note,snapshot_revision,actor_id,created_at').eq('case_id',id).order('created_at',{ascending:false}).limit(80)
 ]);
 if(error)return NextResponse.json({error:error.message},{status:500});
 if(!data)return NextResponse.json({error:'Không tồn tại hoặc không có quyền'},{status:404});
 return NextResponse.json({case:data,events:events||[],role:'guest',isOwner:true});
}
