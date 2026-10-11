import test from 'node:test';
import assert from 'node:assert/strict';
import {officialExample} from '../lib/example-request.mjs';
import {parseTechnicalRequest} from '../lib/requirement-parser.mjs';
import {parseTdsText} from '../lib/tds-parser.mjs';
import {rankProduct,groupTdsRows} from '../lib/matching-engine.mjs';
import e from '../lib/demo-evidence.json' with {type:'json'};
import {readFileSync} from 'node:fs';
import {aggregateBomRows} from '../lib/import-helpers.mjs';
import {draftBom} from '../lib/draft-bom.mjs';
const parsed=parseTechnicalRequest(officialExample);
const product={id:'TM.08.04-15::2',code:'TM.08.04-15',version:2,name:'BỘ KHĂN PHẪU THUẬT TIM'};
const candidate=rankProduct(parsed.items,product,[],new Map(e.catalog.map(x=>[x.code,x])),new Map(),
  {bom:true,tds:true,sop:false},e.tds.items,parsed.conditions,{packaging:e.tds.packaging,sterilization_verified:false});
test('15 original requirements, 13 BTP and 2 NVL, preserve all dimensions',()=>{
 assert.equal(parsed.items.length,15);
 assert.equal(parsed.items.filter(x=>x.itemType==='SEMIPRODUCT').length,13);
 assert.equal(parsed.items.filter(x=>x.itemType==='MATERIAL').length,2);
 assert.equal(parsed.items[13].heightCm,6);
 assert.equal(parsed.items[14].heightCm,3.5);
 assert.equal(parsed.items[10].tolerancePct,5);
 assert.equal(parsed.items[0].quantity,2);
 assert.equal(parsed.conditions.packaging,'Tyvek');
 assert.equal(parsed.conditions.requiresSterile,true);
});
test('TDS version 2 has 16 physical lines and 15 grouped codes, two table covers',()=>{
 assert.equal(e.tds.items.length,16);
 assert.equal(groupTdsRows(e.tds.items).length,15);
 assert.equal(groupTdsRows(e.tds.items).find(x=>x.component_code==='SP.01.01-04').quantity,2);
});
test('matching 15-row request to actual TDS preserves documented differences',()=>{
 assert.equal(candidate.code,'TM.08.04-15');assert.equal(candidate.version,2);
 assert.equal(candidate.rows.length,15);
 assert.deepEqual(candidate.rows.filter(x=>x.status==='difference').map(x=>x.requirement.sourceIndex),[11,13]);
 assert.equal(candidate.rows.find(x=>x.requirement.sourceIndex===11).selected.widthCm,18);
 assert.equal(candidate.rows.find(x=>x.requirement.sourceIndex===11).selected.lengthCm,20);
 assert.equal(candidate.rows.find(x=>x.requirement.sourceIndex===13).selected.name,'Khăn không keo');
 assert.equal(candidate.rows.find(x=>x.requirement.sourceIndex===1).selected.qty,2);
 assert.equal(candidate.rows.find(x=>x.requirement.sourceIndex===14).selected.heightCm,6);
 assert.ok(candidate.conditionsReview.some(x=>x.includes('Tyvek')&&x.includes('giấy/PET')));
 assert.ok(candidate.conditionsReview.some(x=>x.includes('SOP')));
 assert.notEqual(candidate.recommendation,'existing');
});
test('explicit size tolerance not applied to 15x15 vs 18x20',()=>{
 assert.match(candidate.rows.find(x=>x.requirement.sourceIndex===11).remarks.join(' '),/20.0%/);
});
test('TDS parser extracts full 16-row mock TDS with packaging safely',()=>{
 const mock=`Mã sản phẩm/Ref: TM.08.04-15\nPhiên bản/Version: TDS ver 2\n 1 SP.01.01-04        Khăn trải bàn dụng cụ L        1    140 x 200   - test\n 2 SP.01.01-04        Khăn trải bàn dụng cụ L        1    140 x 200   - test\nĐÓNG GÓI/PACKAGING:\n- Bộ khăn được đóng gói trong bao giấy/PET.`;
 const x=parseTdsText(mock);
 assert.equal(x.items.length,2);assert.equal(x.packaging,'giấy/PET');assert.equal(x.sourceVersion,2);
});

test('real BOM 55 flattened rows yield 15 visible TDS component codes with true L1 quantities',()=>{
 const raw=JSON.parse(readFileSync(new URL('./fixtures/tm2-bom.json',import.meta.url),'utf8'));
 assert.equal(raw.length,55);
 const agg=aggregateBomRows(raw), tdsQty=new Map(groupTdsRows(e.tds.items).map(x=>[x.component_code,x.quantity]));
 const visible=agg.components.filter(x=>x.visible_on_tds);
 assert.equal(visible.length,15);
 for(const item of visible)assert.equal(item.quantity,tdsQty.get(item.component_code),item.component_code);
});

test('Step 5 draft keeps mismatched components unassigned, never silently reusing incorrect codes',()=>{
 const rows=draftBom(candidate);
 assert.equal(rows.length,15);
 assert.equal(rows.find(x=>x.sequence===1).proposedCode,'SP.01.01-04');
 assert.equal(rows.find(x=>x.sequence===11).existingReference,'SP.28.05-01');
 assert.equal(rows.find(x=>x.sequence===11).proposedCode,null);
 assert.equal(rows.find(x=>x.sequence===13).proposedCode,null);
});

test('missing BOM quantity must not silently become one unit',()=>{
 const agg=aggregateBomRows([{rowIndex:1,productCode:'TP.X',productVersion:2,componentCode:'SP.X',componentName:'Khăn',qtyL1:null,showOnTds:'1'}]);
 assert.equal(agg.components[0].quantity,0);
 assert.equal(agg.components[0].quantity_basis,'missing_source');
});
