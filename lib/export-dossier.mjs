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
function colClass(header){
 const h=String(header).toLowerCase();
 if(h==='stt'||h==='bước')return 'col-stt';
 if(h.includes('mã')||h.includes('tham chiếu'))return 'col-code';
 if(h==='loại')return 'col-type';
 if(h.includes('số lượng')||h==='sl')return 'col-num';
 if(h==='đvt')return 'col-unit';
 if(h.includes('rộng')||h.includes('dài')||h.includes('cao'))return 'col-dim';
 if(h.includes('dung sai'))return 'col-dim';
 if(h.includes('xác minh')||h==='đánh giá')return 'col-badge';
 if(h.includes('tên'))return 'col-name';
 if(h.includes('chất liệu'))return 'col-mat';
 if(h.includes('ghi chú')||h.includes('giải trình')||h.includes('sai khác')||h.includes('yêu cầu'))return 'col-desc';
 return '';
}
function table(headers,rows){
 const classes=headers.map(colClass);
 return '<div class="table-container"><table><thead><tr>'+headers.map((x,i)=>`<th class="${classes[i]}">${escapeHtml(x)}</th>`).join('')+'</tr></thead><tbody>'+rows.map(r=>'<tr>'+r.map((x,i)=>`<td class="${classes[i]}">${escapeHtml(x===null||x===undefined||x===''?'—':x)}</td>`).join('')+'</tr>').join('')+'</tbody></table></div>';
}
function field(label,value){return `<div class="field"><strong>${escapeHtml(label)}</strong><span>${escapeHtml(value||'—')}</span></div>`;}
const bomCols=['STT','Loại','Mã BTP/NVL','Tên cấu kiện','Số lượng','ĐVT','Rộng cm','Dài cm','Cao cm','Dung sai %','Chất liệu','Nguồn tham chiếu','Xác minh','Ghi chú'];
const bomRows=d=>(d.bom||[]).map(b=>[b.sequence,b.kind,b.code,b.name,b.quantity,b.unit,b.widthCm,b.lengthCm,b.heightCm,b.tolerancePct,b.material,b.origin,b.verified?'Đã xác minh':'Chưa',b.notes]);
const tdsRows=d=>bomRows(d).map(r=>[r[0],r[2],r[3],r[4],r[6],r[7],r[8],r[9],r[10]]);
const sopRows=d=>(d.sop?.steps||[]).map(s=>[s.number,s.operation,s.instruction,s.parameters,s.acceptance,s.record]);
const compareRows=d=>(d.comparisons||[]).map(r=>[r.sequence,r.requirement,r.selectedCode,r.status,(r.remarks||[]).join('; '),r.resolution,r.resolutionNote]);
const h=s=>escapeHtml(s);
export function htmlReport(record,{print=false}={}){
 const d=record.dossier||{},status=record.status,release=status==='published';
 const css=`*{box-sizing:border-box}body{font:13px/1.5 Arial,'Segoe UI',sans-serif;color:#19303b;background:#eef3f5;margin:0}main{max-width:1280px;width:95%;background:white;margin:28px auto;padding:36px 40px;box-shadow:0 8px 30px #0001;border-radius:8px}h1{font-size:24px;margin-bottom:5px;color:#153e47}h2{font-size:17px;color:#08775f;margin-top:28px;border-bottom:2px solid #e0efe8;padding-bottom:8px}.muted{color:#7e8a96}.table-container{width:100%;overflow-x:auto;margin-top:14px;background:#fff}table{width:100%;border-collapse:collapse;font-size:11px;line-height:1.4}th{background:#eef8f3;color:#08775f;font-weight:600;text-align:left;white-space:nowrap;padding:8px 6px;border:1px solid #dce6e8}td{border:1px solid #dce6e8;padding:6px 6px;vertical-align:middle;word-break:normal;overflow-wrap:break-word}tr:nth-child(even) td{background:#fbfdfc}.col-stt{text-align:center;white-space:nowrap;width:38px}.col-type{white-space:nowrap;width:80px;font-size:10px}.col-code{white-space:nowrap;font-family:ui-monospace,SFMono-Regular,Menlo,Monaco,Consolas,monospace;font-size:10px;width:95px}.col-name{min-width:130px;white-space:normal;word-break:normal}.col-num{text-align:center;white-space:nowrap;width:48px;font-variant-numeric:tabular-nums}.col-unit{text-align:center;white-space:nowrap;width:42px}.col-dim{text-align:center;white-space:nowrap;width:52px;font-variant-numeric:tabular-nums}.col-badge{text-align:center;white-space:nowrap;width:80px;font-size:10.5px}.col-mat{min-width:130px;max-width:240px;white-space:normal;word-break:normal}.col-desc{min-width:140px;max-width:280px;white-space:normal;word-break:normal}.field{display:flex;gap:18px;padding:7px 0;border-bottom:1px solid #edf0f2}.field strong{width:210px}.field span{flex:1;white-space:pre-wrap}header{display:flex;justify-content:space-between;align-items:start;border-bottom:3px solid #08775f;padding-bottom:17px}.draft{font-size:22px;color:#b33;font-weight:bold}small{color:#61727b}button{padding:8px 14px;border:0;background:#08775f;color:white;cursor:pointer;border-radius:6px;font-weight:600}button:hover{background:#065f4c}.watermark{color:#b33;font-weight:bold}.foot{margin-top:40px;border-top:1px solid #ccc;padding-top:14px}@media print{body{background:white;margin:0}main{margin:0 !important;max-width:none !important;width:100% !important;padding:0 !important;box-shadow:none !important}button{display:none !important}.table-container{overflow:visible !important;margin-top:8px !important}table{width:100% !important;font-size:8pt !important}th,td{padding:3px 4px !important}.col-code{font-size:7.5pt !important}.col-type{font-size:7.5pt !important}h2{break-after:avoid;page-break-after:avoid;margin-top:14px !important;font-size:13pt !important}tr{break-inside:avoid;page-break-inside:avoid}@page{size:A4 landscape;margin:8mm 10mm}}`;
 const started=`${release?'ĐÃ PHÁT HÀNH':'BẢN NHÁP — CHƯA PHÁT HÀNH'}`;
 const code=record.official_code||d.requestedCode||d.baseCode||'(chờ cấp mã)';
 return `<!doctype html><html lang="vi"><head><meta charset="utf-8"/><title>Hồ sơ R&D ${h(code)}</title><style>${css}</style></head><body><main><header><div><small>HỒ SƠ R&D / KIỂM SOÁT CẤU HÌNH</small><h1>${h(d.productName)}</h1><div class="muted">Mã ${h(code)} · Version ${h(record.official_version??d.baseVersion??'chờ duyệt')} · Revision hồ sơ ${h(record.revision)}</div></div><div><div class="${release?'':'draft'}">${started}</div>${print?'<button onclick="window.print()">In / Lưu PDF</button>':''}</div></header>
 <h2>01. Kết luận cấu hình</h2>${field('Phương án',d.strategy)}${field('Mã tham chiếu',`${d.baseCode||'—'} / ${d.baseVersion??'—'}`)}${field('Lý do',d.justification)}${field('Tình trạng',record.status)}${field('Người kiểm tra (tự khai báo, không xác thực)',record.reviewer_name)}${field('Ghi chú phê duyệt',record.review_note)}
 <h2>02. So sánh yêu cầu và xử lý sai khác</h2>${table(['STT','Yêu cầu','Mã tham chiếu','Đánh giá','Sai khác','Xử lý','Giải trình'],compareRows(d))}
 ${table(['Cảnh báo tài liệu nguồn','Xử lý','Giải trình'],(d.evidenceWarnings||[]).map(w=>[w.warning,w.resolution,w.note]))}
 <h2>03. BOM thành phẩm</h2>${table(bomCols,bomRows(d))}
 <h2>04. TDS thành phẩm</h2>${field('Mô tả',d.tds?.description)}${field('Bao bì',d.tds?.packaging)}${field('Quy cách bao bì',d.tds?.packagingSpecification)}${field('Yêu cầu tiệt trùng',d.tds?.sterileRequired?'Có':'Không')}${field('Phương pháp tiệt trùng',d.tds?.sterilizationMethod)}${field('Hồ sơ thẩm định',d.tds?.sterilizationValidation)}${field('Tiêu chí kiểm tra',d.tds?.inspectionCriteria)}${field('Nhãn',d.tds?.labeling)}${field('Lưu kho',d.tds?.storage)}${table(['STT','Mã','Tên','SL','Rộng','Dài','Cao','Dung sai','Chất liệu'],tdsRows(d))}
 <h2>05. SOP thành phẩm</h2>${field('Mã SOP',d.sop?.code)}${field('Mục đích',d.sop?.purpose)}${field('Phạm vi',d.sop?.scope)}${field('Trách nhiệm',d.sop?.responsible)}${field('Thiết bị',d.sop?.equipment)}${field('Bảo hộ',d.sop?.ppe)}${field('Tài liệu tham chiếu',d.sop?.references)}${table(['Bước','Công đoạn','Cách thực hiện','Thông số','Tiêu chí đạt','Biểu mẫu'],sopRows(d))}
 <h2>06. Cấu kiện BTP / NVL mới</h2>${(d.newParts||[]).map(p=>`<h3>${h(p.code)} — ${h(p.name)} (${h(p.kind)})</h3>${field('Mô tả',p.description)}${table(['NVL','Tên NVL','Số lượng'],(p.materials||[]).map(m=>[m.code,m.name,m.quantity]))}${table(['Thao tác BTP','Tiêu chí đạt'],(p.steps||[]).map(s=>[s.instruction,s.acceptance]))}`).join('')||'<p>Không đề xuất cấu kiện mới.</p>'}
 <h2>07. Lịch sử và kiểm soát</h2>${field('Không gian làm việc','Truy cập trực tiếp (không đăng nhập)')}${field('Người duyệt / QA tự khai báo',record.reviewer_name)}${field('Thời gian duyệt',record.reviewed_at)}${field('Thời gian phát hành',record.published_at)}<p class="foot">${release?'Tài liệu phát hành từ hồ sơ đã được phê duyệt.':'Bản nháp không có giá trị phát hành sản xuất.'} Các thông số cần truy nguyên về TDS/SOP và hồ sơ thẩm định được phê duyệt.</p></main></body></html>`;
}
/** ZIP generated from exactly the same PDF/XLSX bytes as standalone downloads. */
export async function exportCaseZip(record,events=[]){
 const {bomWorkbook,tdsWorkbook,differencesWorkbook}=await import('./xlsx-dossier.mjs');
 const d=record.dossier||{};
 const htmlDoc=htmlReport(record,{print:true});
 const newParts={};for(const p of d.newParts||[]){newParts[`07_BTP_NVL_moi/${String(p.code||'unknown').replace(/[^a-zA-Z0-9._-]/g,'_').replace(/\.\./g,'_')}.json`]=JSON.stringify(p,null,2);}
 const manifest={caseId:record.id,status:record.status,code:record.official_code||null,version:record.official_version??null,revision:record.revision,exportedAt:new Date().toISOString(),documentState:record.status==='published'?'RELEASED':'DRAFT_NOT_VALID_FOR_PRODUCTION',contents:['01_Bao_cao_RND.html','02_BOM_thanh_pham.xlsx','03_TDS_thanh_pham.xlsx','06_Doi_chieu_sai_khac.xlsx','08_Du_lieu_ho_so.json','09_Lich_su_phe_duyet.json']};
 return makeZip({
  '00_HUONG_DAN.txt':`R&D DOSSIER\nTrạng thái: ${record.status}\nRevision đã lưu: ${record.revision}\nBáo cáo HTML hỗ trợ mở trên trình duyệt và In/Lưu PDF A4 ngang với font tiếng Việt chuẩn.\nBản nháp KHÔNG được dùng cho sản xuất.\nChế độ không đăng nhập: người duyệt tự khai báo, không được xác thực.\n`,
  '01_Bao_cao_RND.html':htmlDoc,
  '02_BOM_thanh_pham.xlsx':bomWorkbook(record),
  '03_TDS_thanh_pham.xlsx':tdsWorkbook(record),
  '06_Doi_chieu_sai_khac.xlsx':differencesWorkbook(record),
  ...newParts,
  '08_Du_lieu_ho_so.json':JSON.stringify(d,null,2),
  '09_Lich_su_phe_duyet.json':JSON.stringify(events,null,2),
  '10_MANIFEST.json':JSON.stringify(manifest,null,2)
 });
}
