import test from 'node:test';import assert from 'node:assert/strict';
import {buildDossier,inspectDossier} from '../lib/dossier.mjs';
import {parseTechnicalRequest} from '../lib/requirement-parser.mjs';
import {officialExample} from '../lib/example-request.mjs';
const parsed=parseTechnicalRequest(officialExample);
const draft=()=>buildDossier({run:{id:'example',request_text:officialExample,request_items:parsed.items},strategy:'new_code'});
test('Tạo đủ 15 dòng BOM và giữ bao Tyvek / điều kiện tiệt trùng',()=>{
 const d=draft();assert.equal(d.bom.length,15);assert.equal(d.tds.packaging,'Tyvek');assert.equal(d.tds.sterileRequired,true);assert.equal(d.bom[13].heightCm,6);
});
test('Không tự bịa mã BTP, mã thành phẩm, thông số SOP',()=>{
 const d=draft();assert.ok(d.bom.every(x=>x.code===''));assert.equal(d.requestedCode,'');assert.ok(d.sop.steps.every(x=>x.instruction===''));assert.ok(inspectDossier(d).length>25);
});
test('Bộ kiểm tra phát hiện sai khác chưa được giải quyết và đổi bao bì',()=>{
 const d=draft();d.tds.packaging='giấy/PET';d.comparisons[0].status='difference';assert.ok(inspectDossier(d).some(x=>x.path==='tds.packaging'));assert.ok(inspectDossier(d).some(x=>x.path==='comparisons.0'));
});
test('Hồ sơ đầy đủ không báo thiếu giả tạo',()=>{
 const d=draft();d.productName='Bộ thử';d.requestedCode='TM.NEW-TEST';d.justification='Sản phẩm hoàn toàn mới theo yêu cầu được duyệt';
 d.bom.forEach((r,i)=>{r.code='PART.'+i;r.kind=i<13?'SEMIPRODUCT':'MATERIAL';r.verified=true;});
 d.comparisons.forEach(r=>{r.resolution='corrected';r.resolutionNote='Tạo cấu hình mới đáp ứng thông số yêu cầu';});
 Object.assign(d.tds,{description:'Mô tả bộ',packagingSpecification:'Tyvek theo hồ sơ xác minh',inspectionCriteria:'Kiểm tra kích thước và nhãn',labeling:'Nhãn mẫu',storage:'Theo yêu cầu kho',sterilizationMethod:'Phương pháp được phê duyệt',sterilizationValidation:'Hồ sơ thẩm định cụ thể'});
 Object.assign(d.sop,{code:'SOP-RND-01',purpose:'Hướng dẫn lắp bộ',scope:'Sản phẩm này',responsible:'Nhân sự sản xuất',equipment:'Dụng cụ được phê duyệt',ppe:'Trang bị bảo hộ theo quy định',references:'TDS và hồ sơ xác minh'});
 d.sop.steps.forEach(s=>Object.assign(s,{instruction:'Thao tác chi tiết đã phê duyệt',parameters:'Thông số chi tiết đã xác minh',acceptance:'Tiêu chí nghiệm thu đã thẩm định',record:'Biểu mẫu kiểm soát'}));
 d.referenceVerified=true;assert.deepEqual(inspectDossier(d),[]);
});
test('So BOM cuối cùng với số lượng / kích thước / chất liệu gốc, không chỉ chấm điểm ứng viên',()=>{
 const d=draft();d.bom[0].quantity=1;d.bom[1].widthCm=99;d.bom[2].material='';
 const issue=inspectDossier(d).map(x=>x.path);
 assert.ok(issue.includes('bom.0.quantity'));assert.ok(issue.includes('bom.1.widthCm'));assert.ok(issue.includes('bom.2.material'));
});
test('Không bỏ cờ tiệt trùng nếu khách yêu cầu',()=>{
 const d=draft();d.tds.sterileRequired=false;assert.ok(inspectDossier(d).some(x=>x.path==='tds.sterileRequired'));
});
