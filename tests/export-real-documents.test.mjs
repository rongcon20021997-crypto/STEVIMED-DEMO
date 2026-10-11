import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,writeFileSync,rmSync,readFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {execFileSync} from 'node:child_process';
import {makeZip} from '../lib/export-dossier.mjs';
import {bomWorkbook,tdsWorkbook,differencesWorkbook} from '../lib/xlsx-dossier.mjs';
import {pdfDefinition} from '../lib/pdf-dossier.mjs';

const record={id:'c6c3a6b8-8c58-4481-af8f-cad5a0a35baa',status:'draft',revision:3,reviewer_name:null,
 dossier:{productName:'Bộ khăn y tế',strategy:'new_version',baseCode:'TM.08.04-15',baseVersion:2,
  requestedCode:'',justification:'Đối chiếu cấu hình khách hàng 15 chi tiết',
  bom:[{sequence:1,kind:'SEMIPRODUCT',code:'SP.01.22-03',name:'Khăn phủ có keo',quantity:2,unit:'cái',widthCm:100,lengthCm:200,heightCm:null,tolerancePct:5,material:'Vải không dệt',origin:'TDS',verified:false,notes:'Chưa đối chiếu'}],
  tds:{description:'Bộ khăn phẫu thuật',packaging:'Bao Tyvek',packagingSpecification:'Túi tiệt trùng',sterileRequired:true,sterilizationMethod:'',sterilizationValidation:'',inspectionCriteria:'',labeling:'',storage:''},
  sop:{code:'',steps:[{number:1,operation:'Chuẩn bị',instruction:'',parameters:'',acceptance:'',record:''}]},
  comparisons:[{sequence:1,requirement:'Khăn phủ có keo 100x200',selectedCode:'SP.01.22-03',status:'match',remarks:[],resolution:'matched',resolutionNote:''}],
  newParts:[]
 }};
function zipPythonTest(buffer,script){const dir=mkdtempSync(join(tmpdir(),'rnd-docs-'));const path=join(dir,'artifact.zip');try{writeFileSync(path,buffer);return execFileSync('python',['-c',script,path],{encoding:'utf8'});}finally{rmSync(dir,{force:true,recursive:true});}}

test('BOM xuất XLSX thực, 3 sheet, giữ đúng tiếng Việt, số lượng, có nhãn bản nháp',()=>{
 const output=zipPythonTest(bomWorkbook(record),`import sys,zipfile,xml.etree.ElementTree as E
z=zipfile.ZipFile(sys.argv[1]);assert z.testzip() is None
wb=E.fromstring(z.read('xl/workbook.xml'))
ns={'s':'http://schemas.openxmlformats.org/spreadsheetml/2006/main'}
names=[n.attrib['name'] for n in wb.findall('.//s:sheet',ns)]
assert names==['BOM thành phẩm','Sai khác','BOM BTP mới'],names
s=z.read('xl/worksheets/sheet1.xml').decode()
assert 'Khăn phủ có keo' in s and 'BẢN NHÁP' in s and 'SP.01.22-03' in s
assert '<v>2</v>' in s
print('valid BOM XLSX')`);
 assert.match(output,/valid BOM XLSX/);
});
test('TDS Excel chứa điều kiện bao bì, nguồn dữ liệu và cả trường rỗng',()=>{
 const out=zipPythonTest(tdsWorkbook(record),`import zipfile,sys,xml.etree.ElementTree as E
z=zipfile.ZipFile(sys.argv[1]);s=z.read('xl/worksheets/sheet1.xml').decode('utf8');E.fromstring(s)
assert 'Bao Tyvek' in s and 'Phương pháp tiệt trùng' in s and 'Khăn phủ có keo' in s
print('valid TDS XLSX')`);assert.match(out,/valid/);
});
test('ZIP giữ nguyên bytes nhị phân XLSX, không biến thành chuỗi',()=>{
 const xlsx=differencesWorkbook(record);const zipped=makeZip({'files/Doi chieu.xlsx':xlsx});
 const dir=mkdtempSync(join(tmpdir(),'rnd-zip-bytes-'));
 try{const a=join(dir,'a.zip'),b=join(dir,'raw.xlsx');writeFileSync(a,zipped);writeFileSync(b,xlsx);
 const output=execFileSync('python',['-c',`import zipfile,sys;z=zipfile.ZipFile(sys.argv[1]);raw=open(sys.argv[2],'rb').read();assert z.read('files/Doi chieu.xlsx')==raw;print('bytes unchanged')`,a,b],{encoding:'utf8'});
 assert.match(output,/bytes unchanged/);}
 finally{rmSync(dir,{force:true,recursive:true});}
});
test('PDF bản nháp chứa watermark và đủ 3 loại báo cáo',()=>{
 for(const kind of ['report','tds','sop']){
  const def=pdfDefinition(record,kind);assert.match(JSON.stringify(def),/BẢN NHÁP/);assert.equal(def.pageOrientation,'landscape');assert.match(JSON.stringify(def),/Khăn phủ có keo|Chuẩn bị/);
 }
 const released=pdfDefinition({...record,status:'published'},'report');assert.equal(released.watermark,undefined);
});
test('Giao diện tải đủ PDF/Excel/ZIP riêng biệt, không dùng chức năng in thủ công',()=>{
 const src=readFileSync(new URL('../components/case-editor.tsx',import.meta.url),'utf8');
 for(const format of ['report-pdf','bom-xlsx','tds-xlsx','tds-pdf','sop-pdf','differences-xlsx','zip'])assert.ok(src.includes(`format=${format}`),format);
 assert.ok(!src.includes('CSV + JSON + Nhật ký'));
});
