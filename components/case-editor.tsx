'use client';
import {useState} from 'react';
import {useRouter} from 'next/navigation';
import {inspectDossier} from '@/lib/dossier.mjs';
import {Save,Send,CheckCircle2,FileDown,AlertTriangle,Plus,Trash2,FileCheck,RefreshCcw} from 'lucide-react';

type Part={kind:string;code:string;name:string;description:string;widthCm:number|null;lengthCm:number|null;heightCm:number|null;materials:{code:string;name:string;quantity:number}[];steps:{instruction:string;acceptance:string}[]};
type RecordType={id:string;owner_id:string|null;status:string;revision:number;dossier:any;official_code?:string|null;official_version?:number|null;review_note?:string|null;reviewer_id?:string|null;reviewer_name?:string|null};
type Event={event:string;note:string|null;created_at:string;actor_id:string|null;snapshot_revision:number};
const tabNames=['Quyết định & sai khác','BOM thành phẩm','TDS kỹ thuật','SOP sản xuất','BTP / NVL mới','Nhật ký & xuất file'];
const statusNames:Record<string,string>={draft:'Đang soạn',submitted:'Chờ duyệt',changes_requested:'Yêu cầu sửa',approved:'Đã phê duyệt',published:'Đã phát hành',rejected:'Từ chối'};
function Field({label,value,change,multiline=false,disabled=false,placeholder='',required=false}:{label:string;value:unknown;change:(v:string)=>void;multiline?:boolean;disabled?:boolean;placeholder?:string;required?:boolean}){
 return <label className="field-label case-field">{label}{required&&<span style={{color:'#bb584e'}}> *</span>}{multiline?<textarea rows={3} value={String(value??'')} onChange={e=>change(e.target.value)} disabled={disabled} placeholder={placeholder}/>:<input value={String(value??'')} onChange={e=>change(e.target.value)} disabled={disabled} placeholder={placeholder}/>}</label>;
}
const num=(v:string)=>v.trim()===''?null:Number(v);
export function CaseEditor({initial,events}:{initial:RecordType;events:Event[]}){
 const router=useRouter();const [record,setRecord]=useState(initial);const [doc,setDoc]=useState<any>(initial.dossier);
 const [tab,setTab]=useState(0),[busy,setBusy]=useState(false),[message,setMessage]=useState(''),[error,setError]=useState('');
 const [reviewNote,setReviewNote]=useState('');const [reviewerName,setReviewerName]=useState('');
 const editable=['draft','changes_requested'].includes(record.status),reviewable=record.status==='submitted';
 const changed=JSON.stringify(record.dossier)!==JSON.stringify(doc);
 const issues=inspectDossier(doc);
 function field(path:string,value:any){setDoc((old:any)=>{const newDoc=structuredClone(old);const tokens=path.split('.');let cursor=newDoc;for(let i=0;i<tokens.length-1;i++)cursor=cursor[tokens[i]];cursor[tokens.at(-1)!]=value;return newDoc;});}
 function rowField(list:string,i:number,key:string,value:any){setDoc((old:any)=>{const d=structuredClone(old);d[list][i][key]=value;return d;});}
 function changeNested(list:string,i:number,nested:string,j:number,key:string,v:any){setDoc((old:any)=>{const d=structuredClone(old);d[list][i][nested][j][key]=v;return d;});}
 function addRow(list:string,row:any){setDoc((old:any)=>({...old,[list]:[...(old[list]||[]),row]}));}
 function removeRow(list:string,i:number){setDoc((old:any)=>({...old,[list]:old[list].filter((_:any,j:number)=>j!==i)}));}
 async function act(action:string,extra:Record<string,unknown>={}){
  setError('');setMessage('');setBusy(true);
  try{if(action!=='save'&&changed)throw Error('Bạn đã sửa hồ sơ. Hãy lưu bản nháp trước khi chuyển trạng thái.');
   const resp=await fetch(`/api/cases/${record.id}/action`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action,...extra})});
   const out=await resp.json();if(!resp.ok)throw Error(out.error||'Không thể xử lý');
   if(action==='save')setRecord(r=>({...r,dossier:structuredClone(doc),revision:Number(out.result)}));
   else{setMessage('Đã thực hiện: '+action);router.refresh();setTimeout(()=>window.location.reload(),400);}
   if(action==='save')setMessage('Đã lưu revision '+out.result+'.');
  }catch(e){setError(e instanceof Error?e.message:'Không thể thực hiện');}finally{setBusy(false);}
 }
 function editSopStep(i:number,key:string,v:string){setDoc((old:any)=>{const d=structuredClone(old);d.sop.steps[i][key]=v;return d;});}
 const s=doc.sop,t=doc.tds;
 return <div className="stack-lg case-area">
  <div className="page-heading"><span className="eyebrow">HỒ SƠ CẤU HÌNH R&D / {record.id.slice(0,8).toUpperCase()}</span><h1>{doc.productName}</h1>
   <p>Mã gốc: {doc.baseCode||'—'} / v{doc.baseVersion??'—'} · Trạng thái: <strong>{statusNames[record.status]||record.status}</strong> · Revision {record.revision}</p></div>
  <div className="case-summary-bar"><span className="tag warning-tag"><AlertTriangle size={15}/>{issues.length} mục cần hoàn thiện</span><span className="muted small">{doc.requirements?.length||0} yêu cầu · {doc.bom?.length||0} cấu kiện · {doc.newParts?.length||0} cấu kiện mới</span><span className="case-button-row">
   {editable&&<button className="button secondary" disabled={busy||!changed} onClick={()=>act('save',{revision:record.revision,dossier:doc})}><Save size={16}/> Lưu hồ sơ</button>}
   {editable&&<button className="button primary" disabled={busy||changed||issues.length>0} onClick={()=>act('submit')}><Send size={16}/> Gửi duyệt</button>}
   <a className="button secondary" href={`/api/cases/${record.id}/export?format=report-pdf`}><FileDown size={16}/> Báo cáo PDF</a>
   <a className="button primary" href={`/api/cases/${record.id}/export?format=zip`}><FileDown size={16}/> Tải toàn bộ ZIP</a>
   </span></div>
  {changed&&<div className="notice"><AlertTriangle size={18}/> Bạn đang có thay đổi chưa lưu. File tải xuống chỉ sử dụng phiên bản hồ sơ đã lưu trên server; hãy bấm Lưu hồ sơ trước khi tải.</div>}
  {record.status==='published'&&<div className="info-alert"><FileCheck size={19}/> ĐÃ PHÁT HÀNH: {record.official_code} · Version {record.official_version}. Hồ sơ được lưu nguyên trạng sau duyệt.</div>}
  {record.status!=='published'&&<div className="notice"><AlertTriangle size={18}/> BOM/TDS/SOP là bản nháp cho đến khi người kiểm tra nhập tên, xác nhận và phát hành. Chế độ không đăng nhập KHÔNG xác thực người duyệt. Các điều kiện chất lượng, thiết bị, tiệt trùng phải nhập theo dữ liệu đã thẩm định.</div>}
  {error&&<div className="error-alert">{error}</div>}{message&&<div className="info-alert">{message}</div>}
  <nav className="case-tabs" aria-label="Các phần hồ sơ">{tabNames.map((name,i)=><button key={name} type="button" className={tab===i?'selected':''} onClick={()=>setTab(i)}>{i+1}. {name}</button>)}</nav>
  <section className="panel case-pane">
  {tab===0&&<div className="stack-lg"><h2>Quyết định cấu hình và giải quyết sai khác</h2>
   <div className="case-field-grid">
   <Field label="Tên thành phẩm" required value={doc.productName} disabled={!editable} change={v=>field('productName',v)}/>
   <label className="field-label case-field">Phương án<select value={doc.strategy} disabled={!editable} onChange={e=>field('strategy',e.target.value)}><option value="existing">Sử dụng mã/version hiện có</option><option value="new_version">Tạo version mới</option><option value="new_code">Tạo mã mới</option></select></label>
   {doc.strategy==='new_code'&&<Field label="Mã TP chính thức (R&D tự cấp)" required value={doc.requestedCode} disabled={!editable} change={v=>field('requestedCode',v)} placeholder="Ví dụ theo quy tắc mã nội bộ"/>}
   <Field label="Xác minh hồ sơ nguồn BOM/TDS/SOP" value={doc.referenceVerified?'Đã xác minh':'Chưa xác minh'} change={()=>{}} disabled/>
   </div>
   <Field multiline label="Giải trình chọn mã / tạo version / mã mới" required value={doc.justification} change={v=>field('justification',v)} disabled={!editable}/>
   <label className="case-check"><input type="checkbox" disabled={!editable} checked={doc.referenceVerified===true} onChange={e=>field('referenceVerified',e.target.checked)}/> Tôi đã đối chiếu với dữ liệu nguồn, TDS/BOM/SOP và tài liệu thẩm định (không xác nhận chỉ dựa vào điểm so khớp)</label>
   <h3>Đối chiếu từng dòng yêu cầu</h3><div className="table-wrap"><table><thead><tr><th>STT</th><th>Yêu cầu khách</th><th>Mã tham chiếu</th><th>Đánh giá ban đầu</th><th>Cách xử lý</th><th>Giải trình R&D</th></tr></thead><tbody>
    {(doc.comparisons||[]).map((r:any,i:number)=><tr key={i}><td>{r.sequence}</td><td style={{minWidth:170}}>{r.requirement}<small className="sub-detail">{(r.remarks||[]).join('; ')}</small></td><td>{r.selectedCode||'—'}</td><td>{r.status}</td>
     <td><select disabled={!editable} value={r.resolution} onChange={e=>rowField('comparisons',i,'resolution',e.target.value)}><option value="matched">Đã khớp</option><option value="pending">Chưa xử lý</option><option value="accepted">Chấp nhận sai khác</option><option value="corrected">Đã chỉnh cấu hình</option></select></td>
     <td><textarea disabled={!editable} rows={2} className="case-cell-text" value={r.resolutionNote} onChange={e=>rowField('comparisons',i,'resolutionNote',e.target.value)} placeholder="Bằng chứng / lý do duyệt sai khác"/></td></tr>)}</tbody></table></div>
   {(doc.evidenceWarnings||[]).length>0&&<><h3>Cảnh báo TDS / bao bì / SOP từ mã tham chiếu</h3><div className="table-wrap"><table><thead><tr><th>Cảnh báo</th><th>Quyết định R&D</th><th>Chứng cứ / lý do</th></tr></thead><tbody>{(doc.evidenceWarnings||[]).map((w:any,i:number)=><tr key={i}><td>{w.warning}</td><td><select disabled={!editable} value={w.resolution} onChange={e=>rowField('evidenceWarnings',i,'resolution',e.target.value)}><option value="pending">Chưa xử lý</option><option value="accepted">Đã chấp nhận / xác minh</option><option value="corrected">Đã khắc phục</option></select></td><td><textarea disabled={!editable} className="case-cell-text" rows={2} value={w.note} onChange={e=>rowField('evidenceWarnings',i,'note',e.target.value)} placeholder="Bằng chứng kiểm tra, tài liệu áp dụng"/></td></tr>)}</tbody></table></div></>}
   <h3>Yêu cầu khách ban đầu</h3><pre className="case-source">{doc.sourceRequest||'Yêu cầu nhập theo bảng cấu hình'}</pre>
  </div>}
  {tab===1&&<div className="stack-lg"><div><h2>BOM thành phẩm</h2><p className="muted small">Nhập mã BTP/NVL được xác minh. Với cấu kiện mới, phải bổ sung vào tab 5 và có hồ sơ BTP cấp 2.</p></div><div className="table-wrap"><table><thead><tr><th>STT</th><th>Loại</th><th>Mã BTP/NVL</th><th>Tên cấu kiện</th><th>SL</th><th>Rộng cm</th><th>Dài cm</th><th>Cao cm</th><th>Vật liệu / chú thích</th><th>Đã xác minh</th></tr></thead><tbody>
   {(doc.bom||[]).map((r:any,i:number)=><tr key={i}><td>{r.sequence}</td><td><select disabled={!editable} value={r.kind} onChange={e=>rowField('bom',i,'kind',e.target.value)}><option value="UNKNOWN">Chưa rõ</option><option value="SEMIPRODUCT">BTP</option><option value="MATERIAL">NVL</option></select></td><td><input disabled={!editable} style={{minWidth:110}} value={r.code} onChange={e=>rowField('bom',i,'code',e.target.value)}/><small className="sub-detail">Gốc: {r.origin||'Mã mới'}</small></td>
    <td><textarea disabled={!editable} rows={2} className="case-cell-text" value={r.name} onChange={e=>rowField('bom',i,'name',e.target.value)}/></td>
    <td><input type="number" min="0.0001" step="any" className="case-mini-input" disabled={!editable} value={r.quantity} onChange={e=>rowField('bom',i,'quantity',num(e.target.value))}/></td>
    {(['widthCm','lengthCm','heightCm'] as const).map(k=><td key={k}><input className="case-mini-input" type="number" min="0" step="any" disabled={!editable} value={r[k]??''} onChange={e=>rowField('bom',i,k,num(e.target.value))}/></td>)}
    <td><textarea className="case-cell-text" rows={2} disabled={!editable} value={r.material+'\n'+(r.notes||'')} onChange={e=>rowField('bom',i,'material',e.target.value)}/></td>
    <td><input type="checkbox" disabled={!editable} checked={r.verified===true} onChange={e=>rowField('bom',i,'verified',e.target.checked)}/></td>
   </tr>)}</tbody></table></div></div>}
  {tab===2&&<div className="stack-lg"><h2>TDS – Thông số kỹ thuật sản phẩm</h2><p className="muted">Bảng cấu hình cấu kiện trong TDS được tạo từ BOM đang sửa ở tab 2, tránh hai danh sách lệch nhau.</p>
   <div className="case-field-grid">{([
     ['description','Mô tả kỹ thuật'],['packaging','Loại bao bì'],['packagingSpecification','Quy cách đóng gói và vật liệu bao'],
     ['sterilizationMethod','Phương pháp tiệt trùng đã thẩm định'],['sterilizationValidation','Tham chiếu hồ sơ thẩm định tiệt trùng'],
     ['inspectionCriteria','Tiêu chuẩn nghiệm thu / kiểm tra'],['labeling','Quy cách ghi nhãn'],['storage','Điều kiện bảo quản'],['notes','Ghi chú khác']
   ] as const).map(([key,title])=><Field key={key} label={title} multiline={key==='description'||key==='packagingSpecification'||key==='inspectionCriteria'} required={key!=='notes'} value={t[key]} change={v=>field('tds.'+key,v)} disabled={!editable}/>)}</div>
   <label className="case-check"><input type="checkbox" disabled={!editable} checked={t.sterileRequired===true} onChange={e=>field('tds.sterileRequired',e.target.checked)}/> Sản phẩm yêu cầu tiệt trùng (chỉ bỏ chọn khi có xác nhận thay đổi yêu cầu)</label>
   <p className="notice">Yêu cầu gốc: {doc.conditions?.packagingText||'Chưa nêu rõ bao bì'}; {doc.conditions?.sterilizationText||'Chưa nêu rõ tiệt trùng'}.</p>
  </div>}
  {tab===3&&<div className="stack-lg"><h2>SOP – Quy trình sản xuất thành phẩm</h2><p className="muted">Không tự sinh thông số gia công hay tiệt trùng chưa có trong hồ sơ nguồn. Kỹ sư điền và QA xác nhận trước khi phát hành.</p>
   <div className="case-field-grid">{([
     ['code','Mã SOP'],['revision','Version SOP'],['purpose','Mục đích'],['scope','Phạm vi áp dụng'],['responsible','Người chịu trách nhiệm'],['equipment','Thiết bị / dụng cụ'],['ppe','Bảo hộ lao động'],['references','Tài liệu tiêu chuẩn tham chiếu'],['safetyNotes','Cảnh báo an toàn']
    ] as const).map(([key,title])=><Field key={key} label={title} value={s[key]} change={v=>field('sop.'+key,v)} disabled={!editable} multiline={['purpose','equipment','references'].includes(key)}/>)}</div>
   <h3>Các bước thao tác / điểm kiểm soát</h3>{s.steps.map((step:any,i:number)=><div key={i} className="case-step-card"><div className="case-inline-title"><strong>Bước {step.number}</strong>{editable&&<button className="icon-button danger" aria-label="Xóa bước" onClick={()=>setDoc((old:any)=>({...old,sop:{...old.sop,steps:old.sop.steps.filter((_:any,j:number)=>j!==i)}}))}><Trash2 size={16}/></button>}</div>
     <div className="case-field-grid">{(['operation','instruction','parameters','acceptance','record'] as const).map(k=><Field key={k} label={({operation:'Công đoạn',instruction:'Cách thực hiện',parameters:'Thông số kỹ thuật',acceptance:'Tiêu chí kiểm tra',record:'Biểu mẫu / ghi nhận'} as Record<string,string>)[k]} value={step[k]} multiline={k==='instruction'} disabled={!editable} change={v=>editSopStep(i,k,v)}/>)}</div>
    </div>)}
   {editable&&<button className="button secondary" onClick={()=>setDoc((old:any)=>({...old,sop:{...old.sop,steps:[...old.sop.steps,{number:old.sop.steps.length+1,operation:'',instruction:'',parameters:'',acceptance:'',record:''}]}}))}><Plus size={15}/> Thêm bước SOP</button>}
  </div>}
  {tab===4&&<div className="stack-lg"><h2>Xây dựng mã BTP/NVL mới và hồ sơ cấp 2</h2><p className="muted">Chỉ thêm khi cấu kiện khách yêu cầu chưa có trong danh mục. Mã mới phải theo quy tắc cấp mã nội bộ (nguồn không cung cấp). BTP mới bắt buộc có BOM NVL và các bước SOP riêng.</p>
   {(doc.newParts||[]).map((part:Part,i:number)=><div className="case-step-card" key={i}><div className="case-inline-title"><strong>Cấu kiện mới #{i+1}</strong>{editable&&<button className="button subtle" onClick={()=>removeRow('newParts',i)}>Xóa cấu kiện</button>}</div>
    <div className="case-field-grid"><label className="field-label case-field">Loại<select disabled={!editable} value={part.kind} onChange={e=>rowField('newParts',i,'kind',e.target.value)}><option value="SEMIPRODUCT">BTP</option><option value="MATERIAL">NVL</option></select></label>
      {(['code','name','description'] as const).map(k=><Field key={k} label={({code:'Mã mới do R&D cấp',name:'Tên',description:'Thông số kỹ thuật'} as Record<string,string>)[k]} disabled={!editable} value={part[k]} change={v=>rowField('newParts',i,k,v)}/>)}</div>
    {part.kind==='SEMIPRODUCT'&&<><h3>BOM NVL của BTP này</h3>{part.materials.map((m,j)=><div key={j} className="case-part-row"><input disabled={!editable} placeholder="Mã NVL" value={m.code} onChange={e=>changeNested('newParts',i,'materials',j,'code',e.target.value)}/><input disabled={!editable} placeholder="Tên NVL" value={m.name} onChange={e=>changeNested('newParts',i,'materials',j,'name',e.target.value)}/><input disabled={!editable} type="number" step="any" min="0" placeholder="Số lượng" value={m.quantity} onChange={e=>changeNested('newParts',i,'materials',j,'quantity',Number(e.target.value))}/>{editable&&<button className="icon-button danger" onClick={()=>setDoc((old:any)=>{const d=structuredClone(old);d.newParts[i].materials.splice(j,1);return d;})}><Trash2 size={15}/></button>}</div>)}
    {editable&&<button className="button subtle" onClick={()=>setDoc((old:any)=>{const d=structuredClone(old);d.newParts[i].materials.push({code:'',name:'',quantity:1});return d;})}><Plus size={15}/> Thêm NVL cấp 2</button>}
    <h3>SOP riêng cho BTP mới</h3>{part.steps.map((st,j)=><div key={j} className="case-part-row"><textarea disabled={!editable} placeholder="Thao tác sản xuất BTP" value={st.instruction} onChange={e=>changeNested('newParts',i,'steps',j,'instruction',e.target.value)}/><textarea disabled={!editable} placeholder="Tiêu chí kiểm soát chất lượng" value={st.acceptance} onChange={e=>changeNested('newParts',i,'steps',j,'acceptance',e.target.value)}/>{editable&&<button className="icon-button danger" onClick={()=>setDoc((old:any)=>{const d=structuredClone(old);d.newParts[i].steps.splice(j,1);return d;})}><Trash2 size={15}/></button>}</div>)}
    {editable&&<button className="button subtle" onClick={()=>setDoc((old:any)=>{const d=structuredClone(old);d.newParts[i].steps.push({instruction:'',acceptance:''});return d;})}><Plus size={15}/> Thêm bước BTP</button>}</>}
    </div>)}
   {editable&&<button className="button secondary" onClick={()=>addRow('newParts',{kind:'SEMIPRODUCT',code:'',name:'',description:'',widthCm:null,lengthCm:null,heightCm:null,materials:[],steps:[]})}><Plus size={17}/> Tạo cấu kiện mới</button>}
  </div>}
  {tab===5&&<div className="stack-lg"><h2>Nhật ký, phê duyệt, phát hành</h2>
    {reviewable&&<div className="case-step-card"><h3>Khu vực QA / Người kiểm tra (không đăng nhập)</h3><div className="notice"><AlertTriangle size={16}/> Tên người kiểm tra chỉ là thông tin tự khai báo, không xác thực danh tính. Hạn chế dùng trên website công khai.</div><Field label="Họ tên người kiểm tra / QA" required value={reviewerName} change={setReviewerName} placeholder="Nhập đầy đủ họ tên"/><Field label="Ý kiến kiểm tra (ít nhất 10 ký tự)" multiline value={reviewNote} change={setReviewNote}/><div className="case-button-row"><button disabled={busy||reviewNote.length<10||reviewerName.trim().length<3} className="button primary" onClick={()=>act('review',{decision:'approve',note:reviewNote,reviewerName:reviewerName.trim()})}><CheckCircle2 size={16}/> Phê duyệt hồ sơ</button><button disabled={busy||reviewNote.length<10||reviewerName.trim().length<3} className="button secondary" onClick={()=>act('review',{decision:'changes',note:reviewNote,reviewerName:reviewerName.trim()})}>Yêu cầu sửa</button><button disabled={busy||reviewNote.length<10||reviewerName.trim().length<3} className="button subtle" onClick={()=>act('review',{decision:'reject',note:reviewNote,reviewerName:reviewerName.trim()})}>Từ chối</button></div></div>}
    {record.status==='approved'&&<button className="button primary" disabled={busy} onClick={()=>act('publish')}><FileCheck size={16}/> Phát hành mã + BOM/TDS/SOP chính thức</button>}
    <h3>Tải từng tài liệu hoặc toàn bộ hồ sơ</h3>
    <p className="muted small">Tài liệu được xuất từ revision đã lưu: {record.revision}. Các hồ sơ chưa phát hành được đóng dấu BẢN NHÁP. PDF giữ tiếng Việt; Excel là file .xlsx có thể mở và chỉnh sửa.</p>
    <div className="case-export-choices">
     <a className="button secondary" href={`/api/cases/${record.id}/export?format=report-pdf`}><FileDown size={16}/> Báo cáo R&D (PDF)</a>
     <a className="button secondary" href={`/api/cases/${record.id}/export?format=bom-xlsx`}><FileDown size={16}/> BOM (Excel)</a>
     <a className="button secondary" href={`/api/cases/${record.id}/export?format=tds-xlsx`}><FileDown size={16}/> TDS (Excel)</a>
     <a className="button secondary" href={`/api/cases/${record.id}/export?format=tds-pdf`}><FileDown size={16}/> TDS (PDF)</a>
     <a className="button secondary" href={`/api/cases/${record.id}/export?format=sop-pdf`}><FileDown size={16}/> SOP (PDF)</a>
     <a className="button secondary" href={`/api/cases/${record.id}/export?format=differences-xlsx`}><FileDown size={16}/> Đối chiếu (Excel)</a>
     <a className="button primary" href={`/api/cases/${record.id}/export?format=zip`}><FileDown size={16}/> Tải toàn bộ ZIP</a>
    </div>
    <h3>Nhật ký kiểm soát thay đổi</h3><div className="table-wrap"><table><thead><tr><th>Thời điểm</th><th>Hành động</th><th>Người thực hiện</th><th>Ghi chú</th></tr></thead><tbody>{events.map((event,i)=><tr key={i}><td>{new Date(event.created_at).toLocaleString('vi-VN')}</td><td>{event.event} · Rev {event.snapshot_revision}</td><td>{event.actor_id?.slice(0,8)||'Khách / dùng chung'}</td><td>{event.note||'—'}</td></tr>)}</tbody></table></div>
  </div>}
  </section>
  {issues.length>0&&<details className="panel case-issues"><summary><AlertTriangle size={17}/> Còn {issues.length} điểm chặn để gửi duyệt — xem chi tiết</summary><div className="case-issues-list">{issues.map((item,i)=><div key={i}><code>{item.path}</code> — {item.detail}</div>)}</div></details>}
  <div className="case-button-row"><button className="button subtle" onClick={()=>router.push('/cases')}><RefreshCcw size={15}/> Về danh sách hồ sơ</button>{editable&&<button disabled={busy||!changed} className="button primary" onClick={()=>act('save',{revision:record.revision,dossier:doc})}><Save size={16}/> Lưu thay đổi</button>}</div>
 </div>;
}
