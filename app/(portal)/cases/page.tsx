import Link from 'next/link';
import {createAdminClient} from '@/lib/supabase/admin';
import {ClipboardList,ArrowUpRight,BookOpen} from 'lucide-react';
export const dynamic='force-dynamic';
export default async function CasesPage(){
 const db=createAdminClient();const {data,error}=await db.from('rnd_cases').select('id,created_at,updated_at,status,dossier,official_code,official_version,owner_id').order('created_at',{ascending:false}).limit(100);
 const statusName:Record<string,string>={draft:'Đang soạn',submitted:'Chờ duyệt',changes_requested:'Cần sửa',approved:'Đã duyệt',published:'Đã phát hành',rejected:'Từ chối'};
 return <div className="stack-lg"><div className="page-heading"><span className="eyebrow">FULL WORKFLOW / R&D</span><h1>Hồ sơ cấu hình & phát hành</h1><p>Mỗi yêu cầu đi qua đủ bước: phân tích → BOM/TDS/SOP → duyệt độc lập → phát hành và xuất ZIP/PDF.</p></div><div className="case-button-row"><Link className="button primary" href="/analyze"><ClipboardList size={16}/> Tiếp nhận yêu cầu mới</Link><Link href="/demo" className="button subtle"><BookOpen size={16}/> Xem demo đối chiếu</Link></div>
  <section className="panel"><div className="table-wrap"><table><thead><tr><th>Ngày lập</th><th>Thành phẩm</th><th>Mã tham chiếu</th><th>Phương án</th><th>Trạng thái</th><th>Kết quả</th></tr></thead><tbody>{(data||[]).map(c=><tr key={c.id}><td>{new Date(c.created_at).toLocaleDateString('vi-VN')}</td><td><Link href={`/cases/${c.id}`} className="text-link">{c.dossier?.productName||'Hồ sơ R&D'} <ArrowUpRight size={14}/></Link><small className="sub-detail">{c.id.slice(0,8)}</small></td><td>{c.dossier?.baseCode||'—'} / v{c.dossier?.baseVersion??'—'}</td><td>{c.dossier?.strategy}</td><td><span className="status-pill match">{statusName[c.status]||c.status}</span></td><td>{c.official_code?`${c.official_code} / v${c.official_version}`:'Chưa phát hành'}</td></tr>)}</tbody></table></div>
  {error&&<div className="error-alert">{error.message}. Hãy chạy db/migration_full.sql trước.</div>}{!data?.length&&<div className="empty-state"><ClipboardList size={31}/><p>Chưa có hồ sơ nào. Hãy phân tích yêu cầu, sau đó chọn “Lập hồ sơ full” ở kết quả.</p></div>}</section></div>;
}
