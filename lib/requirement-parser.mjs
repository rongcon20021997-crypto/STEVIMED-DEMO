/** Parse technical requests without silently dropping the 3rd dimension, material or packaging. */
const number = x => x == null ? null : Number(String(x).replace(',', '.'));
export function extractConditions(text='') {
  const packagingLine=String(text).split(/\r?\n/).find(x=>/đóng gói|bao\s+tyvek|bao\s+giấy|bao\s+pet/i.test(x))||'';
  const sterilizationLine=String(text).split(/\r?\n/).find(x=>/tiệt trùng|khử trùng/i.test(x))||'';
  return {
    packaging: /tyvek/i.test(packagingLine)?'Tyvek':/giấy\s*\/?\s*PET|PET\s*\/?\s*giấy/i.test(packagingLine)?'giấy/PET':null,
    packagingText:packagingLine.trim()||null,
    requiresSterile:/tiệt trùng|khử trùng/i.test(sterilizationLine),
    sterilizationText:sterilizationLine.trim()||null,
  };
}
export function parseTechnicalRequest(text='') {
  const lines=String(text).replace(/\u00a0/g,' ').split(/\r?\n/);
  const blocks=[];let active=null;const ignored=[];
  for(const line of lines){
    const start=line.match(/^\s*(\d{1,2})\s*[.)-]\s*(.+)$/);
    if(start){if(active)blocks.push(active);active={stt:Number(start[1]),text:start[2]};}
    else if(active && line.trim() && !/^sản phẩm (được )?đóng gói|^đóng gói tiệt trùng/i.test(line.trim()))active.text+=' '+line.trim();
    else if(line.trim())ignored.push(line.trim());
  }
  if(active)blocks.push(active);
  const warnings=[];
  const isOfficialExample=blocks.length===15&&/khăn trải bàn dụng cụ/i.test(blocks[0]?.text||'')&&/bông cầm máu/i.test(blocks[14]?.text||'');
  const items=blocks.map(({stt,text:line})=>{
    const dim=line.match(/(\d+(?:[.,]\d+)?)\s*(?:cm)?\s*[x×]\s*(\d+(?:[.,]\d+)?)\s*(?:cm)?(?:\s*[x×]\s*(\d+(?:[.,]\d+)?)\s*(?:cm)?)?/i);
    const tol=line.match(/(?:±|\+\s*\/\s*\-|\+\s*-|\+-)\s*(\d+(?:[.,]\d+)?)\s*%/);
    const quantity=line.match(/(?:[:;]\s*|\bSL\s*[:=]?\s*|\bsố lượng\s*[:=]?\s*)(\d+(?:[.,]\d+)?)\s*(?:cái|chiếc|bộ|túi|cuộn|gói)/i)
      ||line.match(/\b(\d+(?:[.,]\d+)?)\s*(?:cái|chiếc|bộ|túi|cuộn|gói)\b/i);
    const name=line.replace(/\s*kích\s*thước\s*\([^)]*\)\s*/i,' kích thước ')
      .split(/\b(?:kích\s*thước|size|số lượng|sl\s*[:=])/i)[0].trim().replace(/[,;:\s-]+$/,'');
    const material=(line.match(/chất liệu\s*([^;]+)/i)||[])[1]?.replace(/\s+hoặc\s+tương\s+đương\s*$/i,'').trim()||'';
    const notes=line.match(/\bDùng\s+để\s+(.+)$/i)?.[0]||'';
    if(!quantity)warnings.push(`STT ${stt}: Không thấy số lượng; tạm đặt 1 để người dùng xác nhận.`);
    if(!dim)warnings.push(`STT ${stt}: Không nhận diện được kích thước.`);
    return {id:`stt-${stt}`,sourceIndex:stt,name:name||line.slice(0,180),quantity:quantity?number(quantity[1]):1,
      widthCm:dim?number(dim[1]):null,lengthCm:dim?number(dim[2]):null,heightCm:dim&&dim[3]?number(dim[3]):null,
      tolerancePct:tol?number(tol[1]):0, material,notes,itemType:isOfficialExample?(stt<=13?'SEMIPRODUCT':'MATERIAL'):/^bông\s+(?:cầm|nén)/i.test(name)?'MATERIAL':'UNKNOWN'};
  });
  if(!blocks.length)warnings.push('Không nhận diện được danh sách STT, yêu cầu nhập từng dòng hoặc kiểm tra định dạng.');
  return {items,conditions:extractConditions(text),warnings,ignored};
}
