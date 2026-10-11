import {deflateRawSync} from 'node:zlib';
const utf=s=>Buffer.from(String(s??''),'utf8');
const bytes=v=>Buffer.isBuffer(v)?v:v instanceof Uint8Array?Buffer.from(v):utf(v);
function crc32(data){let crc=-1;for(const b of data){crc^=b;for(let j=0;j<8;j++)crc=(crc>>>1)^((crc&1)?0xedb88320:0);}return (crc^(-1))>>>0;}
/** ZIP store+deflate, no dependencies. */
export function makeZip(files){let offset=0;const local=[],central=[];for(const [name,body] of Object.entries(files)){
 const filename=utf(name),raw=bytes(body),z=deflateRawSync(raw),crc=crc32(raw);
 const h=Buffer.alloc(30);h.writeUInt32LE(0x04034b50,0);h.writeUInt16LE(20,4);h.writeUInt16LE(0x800,6);h.writeUInt16LE(8,8);h.writeUInt32LE(crc,14);h.writeUInt32LE(z.length,18);h.writeUInt32LE(raw.length,22);h.writeUInt16LE(filename.length,26);
 local.push(h,filename,z);
 const c=Buffer.alloc(46);c.writeUInt32LE(0x02014b50,0);c.writeUInt16LE(20,4);c.writeUInt16LE(20,6);c.writeUInt16LE(0x800,8);c.writeUInt16LE(8,10);c.writeUInt32LE(crc,16);c.writeUInt32LE(z.length,20);c.writeUInt32LE(raw.length,24);c.writeUInt16LE(filename.length,28);c.writeUInt32LE(offset,42);
 central.push(c,filename);offset+=h.length+filename.length+z.length;
 }
 const middle=Buffer.concat(central),foot=Buffer.alloc(22);foot.writeUInt32LE(0x06054b50,0);foot.writeUInt16LE(Object.keys(files).length,8);foot.writeUInt16LE(Object.keys(files).length,10);foot.writeUInt32LE(middle.length,12);foot.writeUInt32LE(offset,16);
 return Buffer.concat([...local,middle,foot]);
}
const escapeHtml=s=>String(s??'').replace(/[&<>"']/g,x=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[x]));
function safeCsv(s){const x=String(s??'');return /^[=+@\-\t\r]/.test(x)?"'"+x:x;}
export function csv(headers,rows){return '\ufeff'+[headers,...rows].map(row=>row.map(x=>'"'+safeCsv(x).replaceAll('"','""')+'"').join(',')).join('\r\n')+'\r\n';}
function table(headers,rows){return '<table><thead><tr>'+headers.map(x=>`<th>${escapeHtml(x)}</th>`).join('')+'</tr></thead><tbody>'+rows.map(r=>'<tr>'+r.map(x=>`<td>${escapeHtml(x)}</td>`).join('')+'</tr>').join('')+'</tbody></table>';}
function field(label,value){return `<div class="field"><strong>${escapeHtml(label)}</strong><span>${escapeHtml(value||'—')}</span></div>`;}
const bomCols=['STT','Loại','Mã BTP/NVL','Tên cấu kiện','Số lượng','ĐVT','Rộng cm','Dài cm','Cao cm','Dung sai %','Chất liệu','Nguồn tham chiếu','Xác minh','Ghi chú'];
const bomRows=d=>(d.bom||[]).map(b=>[b.sequence,b.kind,b.code,b.name,b.quantity,b.unit,b.widthCm,b.lengthCm,b.heightCm,b.tolerancePct,b.material,b.origin,b.verified?'Đã xác minh':'Chưa',b.notes]);
const tdsRows=d=>bomRows(d).map(r=>[r[0],r[2],r[3],r[4],r[6],r[7],r[8],r[9],r[10]]);
const sopRows=d=>(d.sop?.steps||[]).map(s=>[s.number,s.operation,s.instruction,s.parameters,s.acceptance,s.record]);
const compareRows=d=>(d.comparisons||[]).map(r=>[r.sequence,r.requirement,r.selectedCode,r.status,(r.remarks||[]).join('; '),r.resolution,r.resolutionNote]);
const h=s=>escapeHtml(s);
export function htmlReport(record,{print=false}={}){
 const d=record.dossier,status=record.status,release=status==='published';
 const css=`*{box-sizing:border-box}body{font:13px/1.5 Arial,'Segoe UI',sans-serif;color:#19303b;background:#eef3f5;margin:0}main{max-width:1100px;background:white;margin:28px auto;padding:42px;box-shadow:0 8px 30px #0001}h1{font-size:25px;margin-bottom:5px}h2{font-size:19px;color:#08775f;margin-top:32px;border-bottom:2px solid #e0efe8;padding-bottom:9px}.muted{color:#7e8a96}table{width:100%;border-collapse:collapse;font-size:10px;margin-top:14px}th{background:#eef8f3;text-align:left}td,th{border:1px solid #dce6e8;padding:7px;vertical-align:top;word-break:break-word}.field{display:flex;gap:18px;padding:7px 0;border-bottom:1px solid #edf0f2}.field strong{width:210px}.field span{flex:1;white-space:pre-wrap}header{display:flex;justify-content:space-between;align-items:start;border-bottom:3px solid #08775f;padding-bottom:17px}.draft{font-size:24px;color:#b33;font-weight:bold}small{color:#61727b}button{padding:8px 13px;border:0;background:#08775f;color:white;cursor:pointer;border-radius:6px}.watermark{color:#b33;font-weight:bold}.foot{margin-top:40px;border-top:1px solid #ccc;padding-top:14px} @media print{body{background:white}main{margin:0;max-width:none;padding:0;box-shadow:none}button{display:none}h2{break-after:avoid}tr{break-inside:avoid}@page{size:A4 landscape;margin:14mm}}`;
 const started=`${release?'ĐÃ PHÁT HÀNH':'BẢN NHÁP — CHƯA PHÁT HÀNH'}`;
 const code=record.official_code||d.requestedCode||d.baseCode||'(chờ cấp mã)';
 return `<!doctype html><html lang="vi"><head><meta charset="utf-8"/><title>Hồ sơ R&D ${h(code)}</title><style>${css}</style></head><body><main><header><div><small>HỒ SƠ R&D / KIỂM SOÁT CẤU HÌNH</small><h1>${h(d.productName)}</h1><div class="muted">Mã ${h(code)} · Version ${h(record.official_version??d.baseVersion??'chờ duyệt')} · Revision hồ sơ ${h(record.revision)}</div></div><div><div class="${release?'':'draft'}">${started}</div>${print?'<button onclick="window.print()">In / Lưu PDF</button>':''}</div></header>
 <h2>01. Kết luận cấu hình</h2>${field('Phương án',d.strategy)}${field('Mã tham chiếu',`${d.baseCode||'—'} / ${d.baseVersion??'—'}`)}${field('Lý do',d.justification)}${field('Tình trạng',record.status)}${field('Người kiểm tra (tự khai báo, không xác thực)',record.reviewer_name)}${field('Ghi chú phê duyệt',record.review_note)}
 <h2>02. So sánh yêu cầu và xử lý sai khác</h2>${table(['STT','Yêu cầu','Mã tham chiếu','Đánh giá','Sai khác','Xử lý','Giải trình'],compareRows(d))}
 ${table(['Cảnh báo tài liệu nguồn','Xử lý','Giải trình'],(d.evidenceWarnings||[]).map(w=>[w.warning,w.resolution,w.note]))}
 <h2>03. BOM thành phẩm</h2>${table(bomCols,bomRows(d))}
 <h2>04. TDS thành phẩm</h2>${field('Mô tả',d.tds.description)}${field('Bao bì',d.tds.packaging)}${field('Quy cách bao bì',d.tds.packagingSpecification)}${field('Yêu cầu tiệt trùng',d.tds.sterileRequired?'Có':'Không')}${field('Phương pháp tiệt trùng',d.tds.sterilizationMethod)}${field('Hồ sơ thẩm định',d.tds.sterilizationValidation)}${field('Tiêu chí kiểm tra',d.tds.inspectionCriteria)}${field('Nhãn',d.tds.labeling)}${field('Lưu kho',d.tds.storage)}${table(['STT','Mã','Tên','SL','Rộng','Dài','Cao','Dung sai','Chất liệu'],tdsRows(d))}
 <h2>05. SOP thành phẩm</h2>${field('Mã SOP',d.sop.code)}${field('Mục đích',d.sop.purpose)}${field('Phạm vi',d.sop.scope)}${field('Trách nhiệm',d.sop.responsible)}${field('Thiết bị',d.sop.equipment)}${field('Bảo hộ',d.sop.ppe)}${field('Tài liệu tham chiếu',d.sop.references)}${table(['Bước','Công đoạn','Cách thực hiện','Thông số','Tiêu chí đạt','Biểu mẫu'],sopRows(d))}
 <h2>06. Cấu kiện BTP / NVL mới</h2>${(d.newParts||[]).map(p=>`<h3>${h(p.code)} — ${h(p.name)} (${h(p.kind)})</h3>${field('Mô tả',p.description)}${table(['NVL','Tên NVL','Số lượng'],(p.materials||[]).map(m=>[m.code,m.name,m.quantity]))}${table(['Thao tác BTP','Tiêu chí đạt'],(p.steps||[]).map(s=>[s.instruction,s.acceptance]))}`).join('')||'<p>Không đề xuất cấu kiện mới.</p>'}
 <h2>07. Lịch sử và kiểm soát</h2>${field('Không gian làm việc','Truy cập trực tiếp (không đăng nhập)')}${field('Người duyệt / QA tự khai báo',record.reviewer_name)}${field('Thời gian duyệt',record.reviewed_at)}${field('Thời gian phát hành',record.published_at)}<p class="foot">${release?'Tài liệu phát hành từ hồ sơ đã được phê duyệt.':'Bản nháp không có giá trị phát hành sản xuất.'} Các thông số cần truy nguyên về TDS/SOP và hồ sơ thẩm định được phê duyệt.</p></main></body></html>`;
}
/** ZIP generated from exactly the same PDF/XLSX bytes as standalone downloads. */
export async function exportCaseZip(record,events=[]){
 const {bomWorkbook,tdsWorkbook,differencesWorkbook}=await import('./xlsx-dossier.mjs');
 const {dossierPdf}=await import('./pdf-dossier.mjs');
 const d=record.dossier||{};
 const [reportPdf,tdsPdf,sopPdf]=await Promise.all([dossierPdf(record,'report',events),dossierPdf(record,'tds',events),dossierPdf(record,'sop',events)]);
 const newParts={};for(const p of d.newParts||[]){newParts[`07_BTP_NVL_moi/${String(p.code||'unknown').replace(/[^a-zA-Z0-9._-]/g,'_').replace(/\.\./g,'_')}.json`]=JSON.stringify(p,null,2);}
 const manifest={caseId:record.id,status:record.status,code:record.official_code||null,version:record.official_version??null,revision:record.revision,exportedAt:new Date().toISOString(),documentState:record.status==='published'?'RELEASED':'DRAFT_NOT_VALID_FOR_PRODUCTION',contents:['01_Bao_cao_RND.pdf','02_BOM_thanh_pham.xlsx','03_TDS_thanh_pham.xlsx','04_TDS_thanh_pham.pdf','05_SOP_san_xuat.pdf','06_Doi_chieu_sai_khac.xlsx','08_Du_lieu_ho_so.json','09_Lich_su_phe_duyet.json']};
 return makeZip({
 '00_HUONG_DAN.txt':`R&D DOSSIER\nTrạng thái: ${record.status}\nRevision đã lưu: ${record.revision}\nPDF dùng font hỗ trợ tiếng Việt. Excel có thể chỉnh sửa.\nBản nháp KHÔNG được dùng cho sản xuất.\nChế độ không đăng nhập: người duyệt tự khai báo, không được xác thực.\n`,
 '01_Bao_cao_RND.pdf':reportPdf,
 '02_BOM_thanh_pham.xlsx':bomWorkbook(record),
 '03_TDS_thanh_pham.xlsx':tdsWorkbook(record),
 '04_TDS_thanh_pham.pdf':tdsPdf,
 '05_SOP_san_xuat.pdf':sopPdf,
 '06_Doi_chieu_sai_khac.xlsx':differencesWorkbook(record),
 ...newParts,
 '08_Du_lieu_ho_so.json':JSON.stringify(d,null,2),
 '09_Lich_su_phe_duyet.json':JSON.stringify(events,null,2),
 '10_MANIFEST.json':JSON.stringify(manifest,null,2)
 });
}
