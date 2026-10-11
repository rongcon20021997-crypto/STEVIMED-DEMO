import Link from 'next/link';
import {createAdminClient} from '@/lib/supabase/admin';
import {Boxes,ClipboardCheck,FileText,Search,ArrowUpRight,Activity,ChevronRight,FolderSearch} from 'lucide-react';
export const dynamic='force-dynamic';
export default async function Home(){
  let catalogCount = 0, bomCount = 0, docsCount = 0, runsCount = 0;
  let recentData: { id: string; created_at: string; result: unknown }[] = [];
  let connectionError: string | null = null;

  try {
    const db=createAdminClient();
    const [catalog,bom,docs,runs,recent]=await Promise.all([
      db.from('catalog_items').select('*',{head:true,count:'exact'}),
      db.from('bom_components').select('*',{head:true,count:'exact'}),
      db.from('product_documents').select('*',{head:true,count:'exact'}),
      db.from('analysis_runs').select('*',{head:true,count:'exact'}),
      db.from('analysis_runs').select('id,created_at,result').order('created_at',{ascending:false}).limit(4)
    ]);
    catalogCount = catalog.count ?? 0;
    bomCount = bom.count ?? 0;
    docsCount = docs.count ?? 0;
    runsCount = runs.count ?? 0;
    recentData = (recent.data || []) as { id: string; created_at: string; result: unknown }[];
    if (catalog.error) connectionError = catalog.error.message;
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    connectionError = msg;
  }

  const metrics=[{label:'Mã hàng trong danh mục',value:catalogCount,icon:Boxes,caption:'Thành phẩm · BTP · NVL'},{label:'Dòng BOM tổng hợp',value:bomCount,icon:ClipboardCheck,caption:'Đã loại trừ lặp NVL cấp 2'},{label:'Tài liệu đính kèm',value:docsCount,icon:FileText,caption:'TDS / SOP đã tải lên'},{label:'Tổng phiên phân tích',value:runsCount,icon:Activity,caption:'Lịch sử kiểm tra lưu trữ'}];

  return <div className="stack-xl">
    {connectionError && (
      <div className="error-alert" style={{ padding: '16px', borderRadius: '10px', lineHeight: 1.6 }}>
        <strong>⚠️ Chưa hoàn tất cấu hình Server/Database:</strong> {connectionError}
        <div style={{ marginTop: '8px', fontSize: '13px' }}>
          Nếu bạn vừa deploy lên Vercel, vui lòng cấu hình 3 biến môi trường tại <b>Project Settings → Environment Variables</b>:
          <ul style={{ margin: '6px 0 6px 20px' }}>
            <li><code>NEXT_PUBLIC_SUPABASE_URL</code>: URL Supabase</li>
            <li><code>SUPABASE_SERVICE_ROLE_KEY</code>: Secret key (service_role)</li>
            <li><code>RND_ALLOW_PUBLIC_ACCESS</code>: <code>true</code> (cho phép truy cập trực tiếp trên production)</li>
          </ul>
          Bạn vẫn có thể thử nghiệm tính năng đối chiếu kỹ thuật độc lập tại: <Link href="/demo" style={{ textDecoration: 'underline', fontWeight: 600 }}>/demo (Demo Workflow)</Link>
        </div>
      </div>
    )}
    <div className="hero"><div><span className="eyebrow light">R&D WORKSPACE / TỔNG QUAN</span><h1>Phân tích R&D &<br/>phát hành hồ sơ sản phẩm</h1><p>Từ cấu hình khách hàng đến BOM, TDS, SOP và hồ sơ phê duyệt. Đối chiếu mã có sẵn hoặc tạo mã/version mới theo quy trình R&D.</p><Link href="/analyze" className="button white">Bắt đầu hồ sơ R&D <ArrowUpRight size={17}/></Link></div><div className="hero-art" aria-hidden="true"><span className="orbit orbit-a"/><span className="orbit orbit-b"/><FolderSearch size={91} strokeWidth={1.4}/></div></div>
    <div className="section-heading"><div><span className="eyebrow">DATA OVERVIEW</span><h2>Số liệu hệ thống</h2></div><span className="muted small">Dữ liệu thực từ Supabase</span></div>
    <div className="metric-grid">{metrics.map(m=><div key={m.label} className="metric-card"><div className="metric-icon"><m.icon size={21}/></div><div className="metric-number">{m.value.toLocaleString('vi-VN')}</div><strong>{m.label}</strong><small>{m.caption}</small></div>)}</div>
    <div className="split-grid"><section className="panel"><div className="panel-header"><div><span className="eyebrow">SHORTCUTS</span><h3>Bắt đầu nhanh</h3></div></div><Link className="action-row" href="/analyze"><div className="action-icon green"><Search size={21}/></div><div><strong>Kiểm tra cấu hình mới</strong><span>Nhập danh sách BTP/NVL và tìm sản phẩm phù hợp</span></div><ChevronRight size={19}/></Link><Link className="action-row" href="/catalog"><div className="action-icon blue"><Boxes size={21}/></div><div><strong>Tra cứu danh mục</strong><span>Kiểm tra mã hàng, kích thước và phân loại</span></div><ChevronRight size={19}/></Link></section>
    <section className="panel"><div className="panel-header"><div><span className="eyebrow">RECENT ACTIVITY</span><h3>Phân tích gần đây</h3></div><Link href="/history" className="text-link">Xem tất cả <ArrowUpRight size={15}/></Link></div>{!recentData.length?<div className="empty-state"><FileText size={30}/><p>Chưa có phiên phân tích nào.<br/>Hãy nhập cấu hình đầu tiên của bạn.</p></div>:recentData.map(r=>{const best=(r.result as {candidates?:{code:string;score:number}[]})?.candidates?.[0];return <div className="history-row" key={r.id}><span><strong>{best?.code||'Chưa có mã phù hợp'}</strong><small>{new Date(r.created_at).toLocaleString('vi-VN')}</small></span><b>{best?`${best.score}%`:'—'}</b></div>;})}</section></div>
  </div>;
}
