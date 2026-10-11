import {notFound} from 'next/navigation';
import {createAdminClient} from '@/lib/supabase/admin';
import {CaseEditor} from '@/components/case-editor';
export const dynamic='force-dynamic';
export default async function CaseDetails({params}:{params:Promise<{id:string}>}){
 const {id}=await params;const db=createAdminClient(); 
 const [{data:record},{data:events}]=await Promise.all([
  db.from('rnd_cases').select('*').eq('id',id).maybeSingle(),
  db.from('rnd_case_events').select('event,note,snapshot_revision,actor_id,created_at').eq('case_id',id).order('created_at',{ascending:false}).limit(100)
 ]);
 if(!record)notFound();
 return <CaseEditor initial={record} events={events||[]}/>;
}
