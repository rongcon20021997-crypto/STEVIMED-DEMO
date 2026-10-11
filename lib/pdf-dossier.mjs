/** Server-side PDF reports. pdfmake's bundled Roboto VFS supports Vietnamese Unicode. */
import {bomRows,tdsRows,sopRows,compareRows,dossierColumns} from './xlsx-dossier.mjs';
import {createRequire} from 'node:module';

// Always load pdfmake with native Node require, not from a compiled Turbopack chunk.
// The package's fontkit dependency uses fs + __dirname to load data.trie.
const nodeRequire=createRequire(import.meta.url);
const plain=v=>v===null||v===undefined||v===''?'—':String(v);
const prettyStrategy={existing:'Sử dụng mã/version hiện có',new_version:'Tạo version mới',new_code:'Tạo mã mới'};
const prettyStatus={draft:'Đang soạn - CHƯA PHÁT HÀNH',submitted:'Chờ duyệt - CHƯA PHÁT HÀNH',changes_requested:'Yêu cầu sửa - CHƯA PHÁT HÀNH',approved:'Đã duyệt - CHƯA PHÁT HÀNH',published:'ĐÃ PHÁT HÀNH',rejected:'Từ chối - CHƯA PHÁT HÀNH'};
const metadata=r=>({code:r.official_code||r.dossier.requestedCode||r.dossier.baseCode||'Chờ cấp mã',version:r.official_version??r.dossier.baseVersion??'Chờ xác minh',status:prettyStatus[r.status]||r.status,revision:r.revision??'—'});
const section=s=>({text:s,style:'section',margin:[0,15,0,8]});
const kv=(k,v)=>({columns:[{text:k,bold:true,width:152},{text:plain(v),width:'*'}],columnGap:10,margin:[0,2,0,4]});
function table(headers,rows,widths){const body=[headers.map(h=>({text:plain(h),style:'thead'})),...(rows.length?rows:[['Chưa có dữ liệu',...headers.slice(1).map(()=> '')]]).map(row=>headers.map((_,i)=>({text:plain(row[i]),style:'cell'})))];return {table:{headerRows:1,keepWithHeaderRows:1,widths:widths||headers.map(()=>'*'),body},layout:{hLineColor:()=> '#dae5e6',vLineColor:()=> '#dae5e6',fillColor:(i)=>i===0?'#0A7861':i%2===0?'#f5f9f8':null},margin:[0,2,0,12]};}
function docHeader(record,label){const m=metadata(record),r=record.dossier;return [{text:'HỒ SƠ KỸ THUẬT R&D',style:'eyebrow'},{text:label,style:'title'},{text:plain(r.productName),style:'subtitle'},kv('Mã thành phẩm',m.code),kv('Version / Revision',`${m.version} / ${m.revision}`),kv('Trạng thái',m.status),kv('Người duyệt (tự khai báo)',record.reviewer_name||'Chưa xác minh'),kv('Thời gian xuất',new Date().toLocaleString('vi-VN',{timeZone:'Asia/Ho_Chi_Minh'})),... (record.status==='published'?[]:[{text:'BẢN NHÁP - KHÔNG CÓ GIÁ TRỊ PHÁT HÀNH SẢN XUẤT',style:'alert'}])];}
function bomContent(d){return [section('Danh sách cấu kiện thành phẩm'),table(['STT','Loại','Mã','Tên cấu kiện','SL','Kích thước (cm)','Vật liệu / ghi chú','Xác minh'],bomRows(d).map(r=>[r[0],r[1],r[2],r[3],`${plain(r[4])} ${plain(r[5])}`,`${plain(r[6])} × ${plain(r[7])} × ${plain(r[8])}; ±${plain(r[9])}%`,`${plain(r[10])}; ${plain(r[13])}`,r[12]]),[27,65,72,'*',48,90,160,58])];}
function tdsContent(d){const t=d.tds||{};return [section('Thông số kỹ thuật (TDS)'),kv('Mô tả',t.description),kv('Bao bì',t.packaging),kv('Quy cách bao bì',t.packagingSpecification),kv('Yêu cầu tiệt trùng',t.sterileRequired?'Có':'Không'),kv('Phương pháp tiệt trùng',t.sterilizationMethod),kv('Bằng chứng thẩm định',t.sterilizationValidation),kv('Tiêu chí kiểm tra',t.inspectionCriteria),kv('Nhãn',t.labeling),kv('Lưu kho',t.storage),kv('Ghi chú',t.notes),section('Bảng cấu hình TDS'),table(dossierColumns.tds,tdsRows(d),[28,74,'*',44,47,47,47,47,130])];}
function sopContent(d){const s=d.sop||{};return [section('Thông tin SOP'),kv('Mã SOP',s.code),kv('Phiên bản SOP',s.revision),kv('Mục đích',s.purpose),kv('Phạm vi áp dụng',s.scope),kv('Trách nhiệm',s.responsible),kv('Thiết bị / dụng cụ',s.equipment),kv('Bảo hộ lao động',s.ppe),kv('Tài liệu nguồn',s.references),kv('Cảnh báo an toàn',s.safetyNotes),section('Các công đoạn sản xuất'),table(dossierColumns.sop,sopRows(d),[35,96,'*',119,120,88])];}
function detailedReport(record,events){const d=record.dossier;return [section('01. Kết luận cấu hình'),kv('Phương án',prettyStrategy[d.strategy]||d.strategy),kv('Mã tham chiếu',`${plain(d.baseCode)} / Version ${plain(d.baseVersion)}`),kv('Giải trình R&D',d.justification),kv('Ý kiến phê duyệt',record.review_note),section('02. Đối chiếu yêu cầu và sai khác'),table(dossierColumns.differences,compareRows(d),[28,118,73,67,157,77,'*']),...(d.evidenceWarnings||[]).map(w=>kv(`Cảnh báo: ${plain(w.resolution)}`,`${plain(w.warning)}. Xử lý: ${plain(w.note)}`)),section('03. BOM thành phẩm'),...bomContent(d).slice(1),section('04. TDS thành phẩm'),...tdsContent(d).slice(1),section('05. SOP thành phẩm'),...sopContent(d).slice(1),section('06. BTP / NVL mới'),...(d.newParts||[]).flatMap(p=>[kv('Cấu kiện',`${plain(p.code)} - ${plain(p.name)} (${plain(p.kind)})`),kv('Mô tả',p.description),table(['Mã NVL','Tên NVL','SL'],(p.materials||[]).map(m=>[m.code,m.name,m.quantity])),table(['Cách thực hiện','Tiêu chí đạt'],(p.steps||[]).map(s=>[s.instruction,s.acceptance]))]),section('07. Nhật ký duyệt'),table(['Thời gian','Sự kiện','Ghi chú','Revision'],(events||[]).map(e=>[e.created_at,e.event,e.note,e.snapshot_revision])),kv('Thời gian duyệt',record.reviewed_at),kv('Thời gian phát hành',record.published_at)];}
export function pdfDefinition(record,kind='report',events=[]){
 const title={report:'BÁO CÁO PHÂN TÍCH VÀ KẾT QUẢ R&D',tds:'TDS - THÔNG SỐ KỸ THUẬT',sop:'SOP - QUY TRÌNH SẢN XUẤT'}[kind];
 if(!title)throw new Error('Loại PDF không hợp lệ');
 const d=record.dossier||{};
 const content=[...docHeader(record,title),...(kind==='report'?detailedReport(record,events):kind==='tds'?tdsContent(d):sopContent(d)),{text:record.status==='published'?'Tài liệu lấy từ hồ sơ đã phát hành.':'Bản nháp, không được dùng để sản xuất; yêu cầu R&D/QA xác minh trước khi phát hành.',style:'footnote',margin:[0,24,0,0]}];
 return {pageSize:'A4',pageOrientation:'landscape',pageMargins:[30,34,30,38],info:{title,subject:'R&D - BOM TDS SOP',author:'R&D Assistant'},content,defaultStyle:{font:'Roboto',fontSize:9,color:'#243746'},styles:{eyebrow:{fontSize:9,bold:true,color:'#07826a'},title:{fontSize:18,bold:true,color:'#153e47',margin:[0,4,0,3]},subtitle:{fontSize:12,bold:true,color:'#245e59',margin:[0,3,0,12]},section:{fontSize:12,bold:true,color:'#08775f'},thead:{bold:true,color:'#ffffff',fontSize:8,margin:[1,4,1,4]},cell:{fontSize:7.5,margin:[1,3,1,3]},alert:{bold:true,color:'#aa391f',fillColor:'#fff2ec',margin:[0,8,0,4]},footnote:{italics:true,color:'#7e4b24',fontSize:8}},watermark:record.status==='published'?undefined:{text:'BẢN NHÁP',color:'#c45139',opacity:.12,bold:true,angle:-30},footer:(page,pages)=>({text:`R&D | ${plain(metadata(record).code)} | ${plain(metadata(record).status)} | Trang ${page}/${pages}`,fontSize:7,color:'#728b92',alignment:'right',margin:[0,0,30,0]})};
}
let printerPromise;
/** Native Node PdfPrinter. Never bundle its Node/fontkit implementation. */
async function pdfPrinter(){
 if(!printerPromise)printerPromise=(async()=>{
  // Native require + serverExternalPackages prevents C:\ROOT\node_modules\...\data.trie.
  const pdfmakePkg=nodeRequire('pdfmake');
  const fontsModule=nodeRequire('pdfmake/build/vfs_fonts.js');
  const Printer=pdfmakePkg.default||pdfmakePkg;
  const bundled=fontsModule.default||fontsModule;
  const vfs=bundled.pdfMake?.vfs || bundled.default?.pdfMake?.vfs || bundled.default || bundled;
  const font=name=>{
   const value=vfs[name];
   if(typeof value!=='string')throw new Error(`Thiếu font PDF tiếng Việt: ${name}`);
   return Buffer.from(value,'base64');
  };
  return new Printer({Roboto:{normal:font('Roboto-Regular.ttf'),bold:font('Roboto-Medium.ttf'),italics:font('Roboto-Italic.ttf'),bolditalics:font('Roboto-MediumItalic.ttf')}});
 })();
 return printerPromise;
}
export async function dossierPdf(record,kind='report',events=[]){
 const printer=await pdfPrinter();
 const def=pdfDefinition(record,kind,events);
 return new Promise((resolve,reject)=>{
  try{
   const doc=printer.createPdfKitDocument(def),chunks=[];
   doc.on('data',data=>chunks.push(Buffer.from(data)));
   doc.on('end',()=>resolve(Buffer.concat(chunks)));
   doc.on('error',reject);
   doc.end();
  }catch(error){reject(error);}
 });
}
