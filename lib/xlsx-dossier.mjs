import {makeZip} from './export-dossier.mjs';

const xmlText = value => String(value ?? '').replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, '').replace(/[<>&"']/g, c => ({'<':'&lt;','>':'&gt;','&':'&amp;','"':'&quot;',"'":'&apos;'}[c]));
const col = n => { let out=''; for (let i=n+1;i>0;i=Math.floor((i-1)/26)) out=String.fromCharCode(65+(i-1)%26)+out; return out; };
const safeText = value => { const x=String(value??''); return /^[=+@\-\t\r]/.test(x)?`'${x}`:x; };
const makeCell=(r,c,v,style=0)=>{
 const ref=`${col(c)}${r}`;
 if(typeof v==='number' && Number.isFinite(v))return `<c r="${ref}" s="${style}"><v>${v}</v></c>`;
 return `<c r="${ref}" s="${style}" t="inlineStr"><is><t xml:space="preserve">${xmlText(safeText(v))}</t></is></c>`;
};
const styles=`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><fonts count="4"><font><sz val="11"/><name val="Calibri"/></font><font><b/><sz val="11"/><color rgb="FFFFFFFF"/><name val="Calibri"/></font><font><b/><sz val="17"/><color rgb="FF0E6553"/><name val="Calibri"/></font><font><b/><sz val="11"/><color rgb="FFB54708"/><name val="Calibri"/></font></fonts><fills count="4"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill><fill><patternFill patternType="solid"><fgColor rgb="FF08775F"/><bgColor indexed="64"/></patternFill></fill><fill><patternFill patternType="solid"><fgColor rgb="FFFFF3CD"/><bgColor indexed="64"/></patternFill></fill></fills><borders count="2"><border><left/><right/><top/><bottom/><diagonal/></border><border><left style="hair"><color rgb="FFD4E3E3"/></left><right style="hair"><color rgb="FFD4E3E3"/></right><top style="hair"><color rgb="FFD4E3E3"/></top><bottom style="hair"><color rgb="FFD4E3E3"/></bottom><diagonal/></border></borders><cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs><cellXfs count="5"><xf numFmtId="0" fontId="0" fillId="0" borderId="1" xfId="0" applyAlignment="1"><alignment vertical="top" wrapText="1"/></xf><xf numFmtId="0" fontId="1" fillId="2" borderId="1" xfId="0" applyAlignment="1"><alignment vertical="center" wrapText="1"/></xf><xf numFmtId="0" fontId="2" fillId="0" borderId="0" xfId="0"/><xf numFmtId="0" fontId="3" fillId="3" borderId="0" xfId="0"/><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/></cellXfs><cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles></styleSheet>`;
function sheetXml({title,headers,rows,fields=[]},record){
 const status=record.status==='published'?'ĐÃ PHÁT HÀNH':'BẢN NHÁP - CHƯA PHÁT HÀNH';
 const code=record.official_code||record.dossier?.requestedCode||record.dossier?.baseCode||'Chờ cấp mã';
 const width=Math.max(2,headers.length), dataStart=8+fields.length;
 const result=[];
 function row(i,values,style=0){result.push(`<row r="${i}" ht="${style===1?32:style===2?34:style===3?26:25}" customHeight="1">${values.map((v,j)=>makeCell(i,j,v,style)).join('')}</row>`);}
 row(1,[`R&D - ${title}`],2);row(2,['Mã thành phẩm',code]);row(3,['Version',record.official_version??record.dossier?.baseVersion??'Chờ xác nhận']);row(4,['Revision hồ sơ',record.revision??'']);row(5,['Trạng thái',status],3);
 row(6,['Người kiểm tra (tự khai báo)',record.reviewer_name||'Chưa xác minh']);
 row(7,['Ghi chú','Dữ liệu từ revision đã LƯU. Bản nháp không dùng để sản xuất.']);
 for(let i=0;i<fields.length;i++)row(8+i,fields[i]);
 row(dataStart,headers,1);
 rows.forEach((x,i)=>row(dataStart+i+1,x));
 const last=Math.max(dataStart+rows.length,dataStart),lastCol=col(width-1);
 const cols=Array.from({length:width},(_,i)=>`<col min="${i+1}" max="${i+1}" width="${i===0?13:i===1?24:i===2?38:i>=3?22:22}" customWidth="1"/>`).join('');
 return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><dimension ref="A1:${lastCol}${last}"/><sheetViews><sheetView workbookViewId="0"><pane ySplit="${dataStart}" topLeftCell="A${dataStart+1}" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews><sheetFormatPr defaultRowHeight="21"/><cols>${cols}</cols><sheetData>${result.join('')}</sheetData><autoFilter ref="A${dataStart}:${lastCol}${last}"/><pageMargins left="0.2" right="0.2" top="0.4" bottom="0.4" header="0.2" footer="0.2"/><pageSetup orientation="landscape" paperSize="9" fitToWidth="1"/></worksheet>`;
}
/** XLSX writer, OpenXML + ZIP, usable in Excel and LibreOffice without adding an npm package. */
export function workbookXlsx(record,sheets){
 const safe=s=>s.replace(/[\[\]:*?\\/]/g,' ').slice(0,31)||'Sheet';
 const safeSheets=sheets.map(s=>({...s,title:safe(s.title)}));
 const files={
 '[Content_Types].xml':`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>${safeSheets.map((_,i)=>`<Override PartName="/xl/worksheets/sheet${i+1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`).join('')}</Types>`,
 '_rels/.rels':'<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>',
 'xl/workbook.xml':`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets>${safeSheets.map((s,i)=>`<sheet name="${xmlText(s.title)}" sheetId="${i+1}" r:id="rId${i+1}"/>`).join('')}</sheets></workbook>`,
 'xl/_rels/workbook.xml.rels':`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${safeSheets.map((_,i)=>`<Relationship Id="rId${i+1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${i+1}.xml"/>`).join('')}<Relationship Id="rId${safeSheets.length+1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>`,
 'xl/styles.xml':styles
 };
 safeSheets.forEach((s,i)=>files[`xl/worksheets/sheet${i+1}.xml`]=sheetXml(s,record));
 return makeZip(files);
}
export const dossierColumns={
 bom:['STT','Loại','Mã BTP/NVL','Tên cấu kiện','Số lượng','ĐVT','Rộng cm','Dài cm','Cao cm','Dung sai %','Chất liệu','Nguồn tham chiếu','Đã xác minh','Ghi chú'],
 tds:['STT','Mã BTP/NVL','Tên cấu kiện','Số lượng','Rộng cm','Dài cm','Cao cm','Dung sai %','Chất liệu'],
 differences:['STT','Yêu cầu','Mã tham chiếu','Đánh giá','Sai khác','Xử lý','Giải trình'],
 sop:['Bước','Công đoạn','Cách thực hiện','Thông số','Tiêu chí đạt','Biểu mẫu']
};
export const bomRows=d=>(d.bom||[]).map(b=>[b.sequence,b.kind,b.code,b.name,b.quantity,b.unit,b.widthCm,b.lengthCm,b.heightCm,b.tolerancePct,b.material,b.origin,b.verified?'Đã xác minh':'Chưa',b.notes]);
export const tdsRows=d=>bomRows(d).map(r=>[r[0],r[2],r[3],r[4],r[6],r[7],r[8],r[9],r[10]]);
export const sopRows=d=>(d.sop?.steps||[]).map(s=>[s.number,s.operation,s.instruction,s.parameters,s.acceptance,s.record]);
export const compareRows=d=>(d.comparisons||[]).map(r=>[r.sequence,r.requirement,r.selectedCode,r.status,(r.remarks||[]).join('; '),r.resolution,r.resolutionNote]);
export function bomWorkbook(record){const d=record.dossier;return workbookXlsx(record,[{title:'BOM thành phẩm',headers:dossierColumns.bom,rows:bomRows(d)},{title:'Sai khác',headers:dossierColumns.differences,rows:compareRows(d)},{title:'BOM BTP mới',headers:['Mã BTP','Tên BTP','Mã NVL','Tên NVL','Số lượng'],rows:(d.newParts||[]).flatMap(p=>(p.materials||[]).map(m=>[p.code,p.name,m.code,m.name,m.quantity]))}]);}
export function tdsWorkbook(record){const d=record.dossier,t=d.tds||{};return workbookXlsx(record,[{title:'TDS thành phẩm',fields:[['Mô tả',t.description],['Bao bì',t.packaging],['Quy cách bao bì',t.packagingSpecification],['Yêu cầu tiệt trùng',t.sterileRequired?'Có':'Không'],['Phương pháp tiệt trùng',t.sterilizationMethod],['Hồ sơ thẩm định',t.sterilizationValidation],['Tiêu chí kiểm tra',t.inspectionCriteria],['Nhãn',t.labeling],['Lưu kho',t.storage],['Revision TDS',t.revision]],headers:dossierColumns.tds,rows:tdsRows(d)}]);}
export function differencesWorkbook(record){return workbookXlsx(record,[{title:'Đối chiếu sai khác',headers:dossierColumns.differences,rows:compareRows(record.dossier)}]);}
