export function itemKey(code,version=0){return `${String(code||'').trim()}::${Number(version)||0}`;}
export function categoryOf(cls='',code='') {
  const c=String(cls).toUpperCase();
  if(c.includes('BÁN THÀNH')||c.includes('BAN THANH'))return 'SEMIPRODUCT';
  if(c.includes('THÀNH PHẨM')||c.includes('THANH PHAM'))return 'FINPRODUCT';
  if(c.includes('NGUYÊN')||c.includes('VẬT')||c.includes('VAT'))return 'MATERIAL';
  if(/^SP\./.test(code))return 'SEMIPRODUCT';
  if(/^VL\./.test(code))return 'MATERIAL';
  if(/^(TM|TQ)\./.test(code))return 'FINPRODUCT';
  return 'UNKNOWN';
}
const truthy=x=>['1','true','yes'].includes(String(x||'').trim().toLowerCase());
/** Source excel BOM is a flattened 2-level join. Group leaves without counting each leaf as an entire L1 item. */
export function aggregateBomRows(rows) {
  const components=new Map(),materials=new Map();
  for(const r of rows){
    if(!r.productCode||!r.componentCode)continue;
    const productKey=itemKey(r.productCode,r.productVersion);
    const sourceQty=r.qtyL1==null?null:Number(r.qtyL1);
    const qty=sourceQty!=null&&Number.isFinite(sourceQty)&&sourceQty>0?sourceQty:0,visible=truthy(r.showOnTds);
    const groupKey=[productKey,r.componentCode,qty,visible].join('|');
    if(!components.has(groupKey))components.set(groupKey,{
      product_key:productKey,component_code:r.componentCode,component_name:r.componentName||r.componentCode,
      quantity:0,visible_on_tds:visible,quantity_basis:qty>0?'bom_estimate':'missing_source',occurrence_count:0,raw_row_count:0,
      _firstSignature:null,_seenInOccurrence:new Set(),_lastIndex:-2,_unitQty:qty
    });
    const c=components.get(groupKey);
    const signature=`${r.process||''}|${r.materialCode||'no-material'}`;
    // A restarted leaf sequence can denote a repeated L1 occurrence (not proof; TDS must verify).
    const isNew=c.occurrence_count===0 || r.rowIndex!==c._lastIndex+1 ||
      (signature===c._firstSignature && c._seenInOccurrence.size>1);
    if(isNew){c.occurrence_count++;c._seenInOccurrence=new Set();c._firstSignature=signature;}
    c._seenInOccurrence.add(signature);c._lastIndex=r.rowIndex;c.raw_row_count++;
    if(r.materialCode){
      const k=[productKey,r.componentCode,r.materialCode,r.process||''].join('|');
      if(!materials.has(k))materials.set(k,{
        product_key:productKey,component_code:r.componentCode,material_code:r.materialCode,
        material_name:r.materialName||r.materialCode,process_name:r.process||null,quantity:Number(r.qtyL2)||null
      });
    }
  }
  return {
    components:[...components.values()].map((c,i)=>({
      id:`${c.product_key}::${c.component_code}::${i}`,
      product_key:c.product_key,component_code:c.component_code,component_name:c.component_name,
      quantity:c._unitQty*c.occurrence_count,visible_on_tds:c.visible_on_tds,
      quantity_basis:c.quantity_basis,occurrence_count:c.occurrence_count,raw_row_count:c.raw_row_count
    })),
    materials:[...materials.values()].map((m,i)=>({id:`${m.product_key}::${m.component_code}::${i}`, ...m}))
  };
}
