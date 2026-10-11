import {writeFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {officialExample} from '../lib/example-request.mjs';
import {parseTechnicalRequest} from '../lib/requirement-parser.mjs';
import {rankProduct} from '../lib/matching-engine.mjs';
import {buildDossier,inspectDossier} from '../lib/dossier.mjs';
import {exportCaseZip} from '../lib/export-dossier.mjs';
import data from '../lib/demo-evidence.json' with {type:'json'};
const {items,conditions}=parseTechnicalRequest(officialExample);
const product={id:'TM.08.04-15::2',code:'TM.08.04-15',version:2,name:'BỘ KHĂN PHẪU THUẬT TIM'};
const candidate=rankProduct(items,product,[],new Map(data.catalog.map(x=>[x.code,x])),new Map(),
 {bom:true,tds:true,sop:false},data.tds.items,conditions,{packaging:data.tds.packaging,sterilization_verified:false});
const dossier=buildDossier({run:{id:'sample-run',request_text:officialExample,request_items:items},candidate,strategy:'new_version'});
dossier.justification='Đối chiếu với mã TM.08.04-15 version 2 và đề xuất cấu hình đáp ứng khách hàng; cần R&D xác minh.';
const sample={id:'00000000-0000-4000-8000-000000000000',owner_id:'DEMO_ONLY',status:'draft',revision:1,official_code:null,official_version:null,review_note:null,dossier};
const out=resolve(process.argv[2]||'RND_AI_SAMPLE_DRAFT.zip');writeFileSync(out,await exportCaseZip(sample,[]));
console.log(`Đã tạo ví dụ (CHƯA PHÁT HÀNH): ${out}. ${items.length} dòng yêu cầu, ${candidate.rows.length} dòng so sánh, ${inspectDossier(dossier).length} việc cần làm.`);
console.log('Cảnh báo tài liệu:',candidate.conditionsReview);
