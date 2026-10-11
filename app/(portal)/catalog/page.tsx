import {createAdminClient} from '@/lib/supabase/admin';
import {Database,Search} from 'lucide-react';
export const dynamic='force-dynamic';
export default async function CatalogPage({searchParams}:{searchParams:Promise<{q?:string;type?:string;page?:string}>}){
  const params=await searchParams;const q=(params.q||'').trim().slice(0,100),type=params.type||'all';
  const page=Math.min(100,Math.max(1,Number(params.page)||1));
  let data: { id: string; code: string; version: number | null; category: string; name: string; width_cm: number | null; length_cm: number | null; base_unit: string | null }[] | null = null;
  let errorMsg: string | null = null;
  let count: number | null = null;

  try {
    const db=createAdminClient();
    let query=db.from('catalog_items').select('id,code,version,category,name,width_cm,length_cm,base_unit',{count:'exact'}).order('code',{ascending:true});
    if(q)query=query.or(`code.ilike.%${q.replace(/[,()]/g,'')}%,name.ilike.%${q.replace(/[,()]/g,'')}%`);
    if(['FINPRODUCT','SEMIPRODUCT','MATERIAL'].includes(type))query=query.eq('category',type);
    const res=await query.range((page-1)*40,page*40-1);
    data=res.data;
    count=res.count;
    if(res.error) errorMsg=res.error.message;
  } catch(err: unknown) {
    errorMsg = err instanceof Error ? err.message : String(err);
  }
  const qs=(p:number)=>`/catalog?q=${encodeURIComponent(q)}&type=${encodeURIComponent(type)}&page=${p}`;
  return <div className="stack-lg"><div className="page-heading"><span className="eyebrow">MASTER DATA</span><h1>Danh mục mã sản phẩm</h1><p>Tra cứu mã thành phẩm, bán thành phẩm và nguyên vật liệu từ nguồn Excel chính thức.</p></div>
  <section className="panel"><form action="/catalog" method="get" className="filter-bar"><div className="search-field"><Search size={18}/><input name="q" defaultValue={q} placeholder="Tìm mã hoặc tên (VD: SP.01.22-03)..."/></div><select name="type" defaultValue={type} aria-label="Loại mã"><option value="all">Tất cả loại mã</option><option value="FINPRODUCT">Thành phẩm</option><option value="SEMIPRODUCT">Bán thành phẩm</option><option value="MATERIAL">Nguyên vật liệu</option></select><button className="button primary" type="submit">Tìm kiếm</button></form>
  <div className="table-wrap"><table><thead><tr><th>Mã hàng</th><th>Phiên bản</th><th>Tên sản phẩm / vật tư</th><th>Loại</th><th>Kích thước (cm)</th><th>Đơn vị</th></tr></thead><tbody>{data?.map(x=><tr key={x.id}><td className="code-text">{x.code}</td><td>{x.version||'—'}</td><td>{x.name}</td><td><span className={'type-pill '+x.category}>{x.category==='FINPRODUCT'?'Thành phẩm':x.category==='SEMIPRODUCT'?'Bán thành phẩm':x.category==='MATERIAL'?'Nguyên vật liệu':'Chưa phân loại'}</span></td><td>{x.width_cm&&x.length_cm?`${x.width_cm} × ${x.length_cm}`:'—'}</td><td>{x.base_unit||'—'}</td></tr>)}</tbody></table></div>
  {errorMsg&&<p className="error-alert">{errorMsg}. Kiểm tra cấu hình Supabase và biến môi trường.</p>}
  {!errorMsg&&!data?.length&&<div className="empty-state"><Database size={28}/><p>Không có mã phù hợp. Nếu chưa import dữ liệu, hãy chạy lệnh <code>npm run import:data</code>.</p></div>}
  <div className="pagination"><span>{count??0} bản ghi · Trang {page}</span><div><a aria-disabled={page<=1} className="button subtle" href={qs(Math.max(1,page-1))}>← Trước</a><a aria-disabled={page*40>=(count||0)} className="button subtle" href={qs(page+1)}>Sau →</a></div></div></section></div>;
}
