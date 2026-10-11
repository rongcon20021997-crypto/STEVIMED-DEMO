/** Reads text extracted by pdftotext -layout; only records unambiguous TDS table lines. */
const num=x=>Number(String(x).replace(',','.'));
export function parseTdsText(text='') {
  const lines=String(text).split(/\r?\n/),items=[],warnings=[];
  const codePattern='[A-Z]{2}\\.[0-9]+(?:\\.[0-9]+)*-[0-9]+';
  const entry=new RegExp(`^\\s*(\\d{1,3})\\s+(${codePattern})\\s{2,}(.+?)\\s{2,}(\\d+(?:[.,]\\d+)?)\\s+(\\d+(?:[.,]\\d+)?)\\s*[x×]\\s*(\\d+(?:[.,]\\d+)?)(?:\\s*[x×]\\s*(\\d+(?:[.,]\\d+)?))?`, 'i');
  for(const line of lines){
    const m=line.match(entry);if(!m)continue;
    const height=m[7]?num(m[7]):null;
    items.push({line_no:num(m[1]),component_code:m[2].toUpperCase(),component_name:m[3].trim(),quantity:num(m[4]),
      width_cm:num(m[5]),length_cm:num(m[6]),height_cm:height,raw_line:line.trim().slice(0,1400)});
  }
  const pageHeader=text.match(/Mã sản phẩm\/Ref:\s*([^\s]+)[\s\S]{0,200}?Phiên bản\/Version:\s*TDS\s*ver\s*(\d+)/i);
  const packaging=lines.find((line,i)=>i>0&&/bộ khăn được đóng gói/i.test(line))||'';
  const packageType=/tyvek/i.test(packaging)?'Tyvek':/giấy\s*\/\s*PET/i.test(packaging)?'giấy/PET':null;
  // A document mentioning sterile processing in another context is not proof that this pack is sterilized.
  const sterilizationText=lines.find(l=>/đóng gói tiệt trùng|sản phẩm được tiệt trùng/i.test(l))||'';
  if(!items.length)warnings.push('Không trích được bảng TDS, cần kiểm tra thủ công.');
  if(!packaging)warnings.push('Không đọc được quy cách đóng gói trong TDS.');
  if(!sterilizationText)warnings.push('TDS chưa có bằng chứng trực tiếp về tiệt trùng.');
  return {items,packaging:packageType,packagingText:packaging.trim().split(/\s{4,}/)[0],sterilizationVerified:!!sterilizationText,
    sourceCode:pageHeader?.[1]||null,sourceVersion:pageHeader?Number(pageHeader[2]):null,warnings};
}
