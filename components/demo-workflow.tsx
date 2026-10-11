'use client';
import {useState} from 'react';
import {officialExample} from '@/lib/example-request.mjs';
import {parseTechnicalRequest} from '@/lib/requirement-parser.mjs';
import {rankProduct} from '@/lib/matching-engine.mjs';
import evidence from '@/lib/demo-evidence.json';
import {FileSearch,RefreshCw,CheckCircle2,AlertTriangle,ClipboardList,Database} from 'lucide-react';
const product={id:'TM.08.04-15::2',code:'TM.08.04-15',version:2,name:'BỘ KHĂN PHẪU THUẬT TIM'};
function compare(text:string){
  const parsed=parseTechnicalRequest(text);
  const catalog=new Map(evidence.catalog.map(item=>[item.code,item]));
  const result=rankProduct(parsed.items,product,[],catalog,new Map(),{bom:true,tds:true,sop:false},evidence.tds.items,
    parsed.conditions,{packaging:evidence.tds.packaging,sterilization_verified:evidence.tds.sterilizationVerified});
  return {parsed,result};
}
const showDim=(v:{widthCm?:number|null;lengthCm?:number|null;heightCm?:number|null})=>[v.widthCm,v.lengthCm,v.heightCm].filter(x=>x!=null).join(' × ');
export function DemoWorkflow(){
 const [text,setText]=useState(officialExample),[analysis,setAnalysis]=useState(()=>compare(officialExample));
 const {parsed,result}=analysis;
 return <div className="demo-shell">
  <header className="demo-heading"><div><span className="eyebrow">THỬ NGHIỆM TỪ TÀI LIỆU R&D GỐC</span><h1>Đối chiếu cấu hình kỹ thuật</h1><p>Demo độc lập Supabase: 15 thành phần trong tài liệu Word so với TDS thật <strong>{product.code}</strong> phiên bản 2. Không dùng dữ liệu giả định do AI tạo.</p></div><a className="button secondary" href="/">Vào Dashboard →</a></header>
  <div className="demo-summary">
    <div className="demo-summary-card"><ClipboardList size={21}/><strong>{parsed.items.length}</strong><span>Dòng yêu cầu đã tách</span></div>
    <div className="demo-summary-card"><Database size={21}/><strong>{evidence.tds.items.length}</strong><span>Dòng TDS nguồn</span></div>
    <div className="demo-summary-card"><FileSearch size={21}/><strong>{result.code}</strong><span>Phiên bản {result.version} · ứng viên tham chiếu</span></div>
    <div className="demo-summary-card"><AlertTriangle size={21}/><strong>{result.rows.filter(x=>x.status==='difference').length}</strong><span>Dòng cần xác minh</span></div>
  </div>
  <section className="panel"><div className="panel-header"><div><span className="step-label">BƯỚC 1–2</span><h3>Nội dung yêu cầu từ kinh doanh</h3></div><span className="muted small">Có thể sửa rồi nhấn “Đối chiếu lại”</span></div><div className="panel-body"><textarea className="spec-textarea" rows={11} value={text} onChange={e=>setText(e.target.value)}/><div className="demo-toolbar"><button type="button" className="button subtle" onClick={()=>{setText(officialExample);setAnalysis(compare(officialExample));}}><RefreshCw size={16}/> Nạp lại yêu cầu gốc</button><button type="button" className="button primary" onClick={()=>setAnalysis(compare(text))}><FileSearch size={17}/> Đối chiếu lại</button></div></div></section>
  <section className="panel"><div className="panel-header"><div><span className="step-label">BƯỚC 3.1–3.2</span><h3>Đối chiếu từng thành phần theo TDS</h3></div><span className="tag muted-tag">{result.score}% · điểm sàng lọc, không phải phê duyệt</span></div>
   <div className="table-wrap"><table><thead><tr><th>STT</th><th>Yêu cầu</th><th>Mã TDS</th><th>Đối chiếu (cm)</th><th>SL Y/C / TDS</th><th>Kết quả</th></tr></thead><tbody>{result.rows.map((r,i)=><tr key={r.requirement.id}><td>{r.requirement.sourceIndex||i+1}</td><td><strong>{r.requirement.name}</strong><small className="sub-detail">{showDim(r.requirement)} cm {r.requirement.tolerancePct?`± ${r.requirement.tolerancePct}%`:''}</small></td>
   <td>{r.selected?<><strong className="code-text">{r.selected.code}</strong><small className="sub-detail">{r.selected.name}</small></>:'—'}</td><td>{r.selected?`${showDim(r.selected)} cm`:'—'}</td><td>{r.requirement.quantity} / {r.selected?.qty??'—'}</td><td><span className={'status-pill '+r.status}>{r.status==='match'?'Khớp sơ bộ':r.status==='missing'?'Thiếu':'Cần xác minh'}</span>{r.remarks.length>0&&<small className="sub-detail">{r.remarks.join(' · ')}</small>}</td></tr>)}</tbody></table></div>
  </section>
  <section className="panel"><div className="panel-header"><div><span className="step-label">BƯỚC 3.3–3.4</span><h3>Điểm chưa thể kết luận</h3></div></div><div className="panel-body demo-issues">{result.conditionsReview.map((msg,i)=><div key={i} className="notice"><AlertTriangle size={18}/>{msg}</div>)}{result.rows.filter(x=>x.status==='difference').map((r,i)=><div key={i} className="notice"><AlertTriangle size={18}/><span>STT {r.requirement.sourceIndex}: {r.remarks.join(' · ')}</span></div>)}{!result.rows.some(x=>x.status==='difference')&&<p><CheckCircle2/> Không phát hiện sai khác từng dòng, vẫn cần kiểm tra tài liệu SOP.</p>}
   <p className="muted small">TDS trong ZIP là tài liệu tham khảo, chưa có xác nhận phê duyệt trong web. Phần kiểm tra chất liệu được hỗ trợ sơ bộ từ mô tả danh mục; công đoạn/SOP và điều kiện tiệt trùng phải được R&D xác minh. Đây là một ví dụ duy nhất, không phải tìm kiếm trong toàn bộ cơ sở dữ liệu.</p></div></section>
 </div>;
}
