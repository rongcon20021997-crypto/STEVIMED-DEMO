/** Real pdfmake smoke test. Run AFTER npm install: npm run verify:pdf */
import {dossierPdf} from '../lib/pdf-dossier.mjs';
import {makeZip} from '../lib/export-dossier.mjs';
import assert from 'node:assert/strict';

const record={
 id:'00000000-0000-4000-8000-000000000001',status:'draft',revision:1,
 dossier:{productName:'Bộ khăn y tế - kiểm tra Unicode',strategy:'existing',baseCode:'TM.08.04-15',baseVersion:2,
  bom:[{sequence:1,kind:'SEMIPRODUCT',code:'SP.01.22-03',name:'Khăn phủ dụng cụ có keo',quantity:1,unit:'cái',widthCm:100,lengthCm:200,tolerancePct:5,material:'Vải không dệt',verified:false,notes:'Tài liệu thử PDF'}],
  tds:{description:'Kiểm tra chữ tiếng Việt: khăn phủ dụng cụ',packaging:'Bao Tyvek',sterileRequired:true},
  sop:{code:'SOP-TEST',purpose:'Kiểm tra PDF',steps:[{number:1,operation:'Kiểm tra',instruction:'Đối chiếu kích thước',acceptance:'Đạt yêu cầu',record:'Phiếu kiểm tra'}]},
  comparisons:[],newParts:[]
 }
};
try{
 const result={};
 for(const kind of ['report','tds','sop']){
  const buf=await dossierPdf(record,kind,[]);
  assert.ok(Buffer.isBuffer(buf),`${kind}: output is not a buffer`);
  assert.ok(buf.length>1000,`${kind}: PDF too small`);
  assert.equal(buf.subarray(0,5).toString('ascii'),'%PDF-',`${kind}: invalid PDF header`);
  assert.ok(buf.subarray(-2048).toString('latin1').includes('%%EOF'),`${kind}: missing PDF trailer`);
  result[`${kind}.pdf`]=buf;
  console.log(`PASS ${kind}: ${buf.length} bytes`);
 }
 const zip=makeZip(result);
 assert.equal(zip.subarray(0,2).toString(),'PK');
 console.log(`PASS ZIP of 3 PDF files: ${zip.length} bytes`);
 console.log('PDF runtime OK. Now test your /api/cases/[id]/export route on localhost.');
}catch(err){
 console.error('PDF runtime FAILED:',err);
 console.error('Make sure you are in the project directory and ran npm install.');
 process.exitCode=1;
}
