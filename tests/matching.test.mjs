import test from 'node:test';
import assert from 'node:assert/strict';
import {rankProduct, sizeSimilarity, nameSimilarity} from '../lib/matching-engine.mjs';
import {aggregateBomRows, itemKey} from '../lib/import-helpers.mjs';
const product={id:'TM.08.04-15::2',code:'TM.08.04-15',version:2,name:'BỘ KHĂN PHẪU THUẬT TIM'};
const catalog=new Map([['SP.01.22-03',{id:'SP.01.22-03::0',code:'SP.01.22-03',name:'Khăn phủ dụng cụ có keo',width_cm:100,length_cm:200}]]);
const item={id:'r1',name:'Khăn phủ dụng cụ có keo',quantity:1,widthCm:100,lengthCm:200};
const comp={product_key:product.id,component_code:'SP.01.22-03',component_name:'Khăn phủ dụng cụ có keo',quantity:1,visible_on_tds:true,quantity_basis:'bom_estimate'};
test('matching 100×200 correctly',()=>{
  const found=rankProduct([item],product,[comp],catalog,new Map(),{bom:true,tds:true,sop:false});
  assert.equal(found.rows[0].status,'match'); assert.equal(found.recommendation,'add_sop');
});
test('quantity difference is surfaced',()=>{
  const res=rankProduct([{...item,quantity:2}],product,[comp],catalog,new Map());
  assert.equal(res.rows[0].status,'difference');
  assert.match(res.rows[0].remarks.join(' '),/Số lượng/);
});
test('size mismatch is not considered identical',()=>{
  assert.ok(sizeSimilarity({...item,widthCm:120},{width_cm:100,length_cm:200}).score<1);
  assert.ok(nameSimilarity('khăn phủ dụng cụ có keo','Khăn phủ dụng cụ có keo')>.99);
});
test('do not multiply same L1 component by every L2 material',()=>{
  const src=[
    {rowIndex:1,productCode:'TM.X',productVersion:2,componentCode:'SP.X',componentName:'Khăn',qtyL1:1,showOnTds:'1',process:'CUT',materialCode:'VL.A'},
    {rowIndex:2,productCode:'TM.X',productVersion:2,componentCode:'SP.X',componentName:'Khăn',qtyL1:1,showOnTds:'1',process:'PACK',materialCode:'VL.B'},
    {rowIndex:3,productCode:'TM.X',productVersion:2,componentCode:'SP.X',componentName:'Khăn',qtyL1:1,showOnTds:'1',process:'CUT',materialCode:'VL.A'},
    {rowIndex:4,productCode:'TM.X',productVersion:2,componentCode:'SP.X',componentName:'Khăn',qtyL1:1,showOnTds:'1',process:'PACK',materialCode:'VL.B'},
  ];
  const {components,materials}=aggregateBomRows(src);
  assert.equal(components.length,1); assert.equal(components[0].quantity,2);assert.equal(materials.length,2);
  assert.equal(itemKey('TM.X',2),'TM.X::2');
});
