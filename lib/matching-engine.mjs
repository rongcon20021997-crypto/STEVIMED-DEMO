/** R&D comparison: evidence first. Scoring is only for candidate ordering, NEVER an approval. */
export function normalize(v='') {return String(v??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/đ/g,'d').replace(/Đ/g,'D').toLowerCase().replace(/[^a-z0-9.]+/g,' ').trim();}
export function tokens(v){const stop=new Set(['va','cai','chiec','bo','cua','cho','loai','kich','thuoc','cm','dai','rong','mot','tu']);return [...new Set(normalize(v).split(' ').filter(x=>x.length>1&&!stop.has(x)))];}
export function nameSimilarity(a,b){
 const aa=normalize(a),bb=normalize(b);if(!aa||!bb)return 0;if(aa===bb)return 1;
 const x=tokens(aa),y=tokens(bb);if(!x.length||!y.length)return 0;
 const common=x.filter(t=>y.includes(t)).length;const dice=2*common/(x.length+y.length);
 return aa.includes(bb)||bb.includes(aa)?Math.min(.97,Math.max(dice,.86)):dice;
}
function tapeKind(v){const n=normalize(v);if(/\bkhong (co )?keo\b/.test(n))return 'no-tape';if(/\bco keo\b|\bbang keo\b/.test(n))return 'tape';return '';}
export function sizeSimilarity(req,catalog,tolerance=null){
 const axes=[['widthCm','width_cm','rộng'],['lengthCm','length_cm','dài'],['heightCm','height_cm','cao']].filter(([k])=>Number(req[k])>0);
 if(!axes.length)return {score:1,reason:null,verified:false};
 const tol=tolerance==null?Math.max(0,Number(req.tolerancePct)||0)/100:tolerance;
 let score=0,missing=[],differences=[];
 for(const [k,source,desc] of axes){const r=Number(req[k]),v=Number(catalog[source]);
  if(!(v>0)){missing.push(desc);continue;}
  const d=Math.abs(v-r)/r;if(d<=tol+1e-9)score++;else differences.push(`${desc}: ${v} cm (yêu cầu ${r} cm, sai lệch ${(100*d).toFixed(1)}%)`);
 }
 const total=axes.length;const pct=(score+.25*missing.length)/total;
 if(missing.length||differences.length)return {score:pct,reason:[differences.length&&`Sai kích thước ${differences.join('; ')}`,missing.length&&`Chưa có kích thước ${missing.join(', ')} trên TDS/danh mục`].filter(Boolean).join('. '),verified:false};
 return {score:1,reason:null,verified:true};
}
function measureFromCatalog(item){
 const out={...item};const n=String(item.name||'');const m=n.match(/(\d+(?:[.,]\d+)?)\s*mm\s*x\s*(\d+(?:[.,]\d+)?)\s*mm\s*x\s*(\d+(?:[.,]\d+)?)\s*mm/i);
 if(m){const vals=m.slice(1).map(x=>Number(x.replace(',','.'))/10);if(!Number(out.width_cm))out.width_cm=vals[0];if(!Number(out.length_cm))out.length_cm=vals[1];if(!Number(out.height_cm))out.height_cm=vals[2];}
 return out;
}
export function itemSimilarity(req,item,materials=[]){
 const codeMatch=Boolean(req.code)&&normalize(req.code)===normalize(item.code);
 let nameScore=codeMatch?1:nameSimilarity(req.name,item.name);
 // Family naming seen in the supplied Word/TDS: 'Bông cầm máu' vs 'Bông nén cầm máu'.
 // Do not use this to infer material or sterile status; dimensions are still checked independently.
 if(/\bbong\b.*\bcam mau\b/.test(normalize(req.name))&&/\bbong\b.*\bcam mau\b/.test(normalize(item.name)))nameScore=Math.max(nameScore,.90);
 const rt=tapeKind(req.name),it=tapeKind(item.name);
 if(rt&&it&&rt!==it)nameScore*=.4;
 const catalog=measureFromCatalog(item);
 const size=sizeSimilarity(req,catalog);
 let materialScore=1,materialReason=null;
 if(req.material?.trim()){
   const evidence=normalize([item.tds_description||'',...materials].join(' ')),r=normalize(req.material);
   const gsm=r.match(/(?:>=|>|≥)\s*(\d+)\s*gsm|\b(\d+)\s*gsm/);const layers=r.match(/(\d+)\s*lop/);
   const eGsm=[...evidence.matchAll(/\b(\d+)\s*gsm/g)].map(m=>Number(m[1]));const eLayers=evidence.match(/(\d+)\s*lop/);
   let known=0,good=0;
   if(gsm){known++;if(eGsm.length){const threshold=Number(gsm[1]||gsm[2]);if(eGsm.some(x=>x>=threshold))good++;else materialReason=`Định lượng vải trong TDS/BOM thấp hơn ${threshold}gsm`;}}
   if(layers){known++;if(eLayers){if(Number(eLayers[1])>=Number(layers[1]))good++;else materialReason=`Số lớp vải trong TDS/BOM thấp hơn ${layers[1]}`;}}
   if(/vai khong det/.test(r)){known++;if(/vai khong det|vai sms|smmms|nonwoven/.test(evidence))good++;}
   materialScore=known>0?(.3+.7*good/known):Math.min(.9,nameSimilarity(r,evidence));
   if(!materialReason&&materialScore<.98)materialReason='Chưa đủ bằng chứng chất liệu từ BOM/TDS/SOP để xác nhận đầy đủ';
 }
 return {score:nameScore*.62+size.score*.32+materialScore*.06,nameScore,sizeReason:size.reason,materialReason,catalog};
}
/** TDS has one row per physical presentation. Aggregate repeated item codes to quantities. */
export function groupTdsRows(rows){
 const out=new Map();for(const row of rows){const k=row.component_code;const found=out.get(k);
  if(found){found.quantity+=Number(row.quantity)||0;found.tdsLines.push(row.line_no);}
  else out.set(k,{...row,quantity:Number(row.quantity)||0,tdsLines:[row.line_no]});
 }return [...out.values()];
}
export function rankProduct(reqs,product,components,catalogByCode,materialsByCode,documents={bom:false,tds:false,sop:false},tdsRows=[],conditions={},tdsSpec=null){
 const tdsAvailable=tdsRows?.length>0;
 const available=tdsAvailable?groupTdsRows(tdsRows).map(r=>({component_code:r.component_code,component_name:r.component_name,quantity:r.quantity,width_cm:r.width_cm,length_cm:r.length_cm,height_cm:r.height_cm,
   quantity_basis:'tds_reference',tdsLines:r.tdsLines}))
   :components.filter(x=>x.visible_on_tds).map(c=>({...c,width_cm:null,length_cm:null,height_cm:null,tdsLines:[]}));
 const pairs=[];
 reqs.forEach((req,i)=>available.forEach((c,j)=>{
  const item=catalogByCode.get(c.component_code)||{code:c.component_code,name:c.component_name,width_cm:null,length_cm:null,height_cm:null,tds_description:''};
  const measured=measureFromCatalog(item);
  const merged={...measured,name:c.component_name||item.name,width_cm:c.width_cm??measured.width_cm,length_cm:c.length_cm??measured.length_cm,height_cm:c.height_cm??measured.height_cm};
  const sim=itemSimilarity(req,merged,materialsByCode.get(c.component_code)||[]);
  const qtyPenalty=(Math.abs(Number(req.quantity)-Number(c.quantity))<.00001)?0:-.08;
  const typePenalty=(req.itemType==='MATERIAL'&&!/^VL\./i.test(c.component_code))||
   (req.itemType==='SEMIPRODUCT'&&/^VL\./i.test(c.component_code))?-.24:0;
  const pairScore=sim.score+qtyPenalty+typePenalty;
  if(sim.nameScore>=.23 && pairScore>=.25)pairs.push({i,j,item:merged,sim,pairScore});
 }));
 pairs.sort((a,b)=>b.pairScore-a.pairScore);
 const assignment=new Map(),taken=new Set();for(const p of pairs){if(!assignment.has(p.i)&&!taken.has(p.j)){assignment.set(p.i,p);taken.add(p.j);}}
 const rows=[];let totalPoints=0;
 reqs.forEach((req,i)=>{
  const matched=assignment.get(i);
  if(!matched){rows.push({requirement:req,selected:null,status:'missing',remarks:['Không tìm được thành phần tương ứng trên '+(tdsAvailable?'TDS':'BOM')]});return;}
  const c=available[matched.j],item=matched.item,sim=matched.sim;
  const remarks=[];const qtyOk=Math.abs(Number(req.quantity)-Number(c.quantity))<.00001;
  if(!qtyOk)remarks.push(`Số lượng ${tdsAvailable?'TDS':'BOM'} ${c.quantity} khác yêu cầu ${req.quantity}`);
  if(sim.nameScore<.85)remarks.push(`Tên khác yêu cầu: ${req.name} ↔ ${c.component_name}; R&D phải xác nhận tương đương`);
  if(sim.sizeReason)remarks.push(sim.sizeReason);
  if(sim.materialReason)remarks.push(sim.materialReason);
  if(!tdsAvailable)remarks.push('BOM chưa được kiểm chứng số lượng và kích thước bằng TDS');
  const ok=qtyOk&&sim.nameScore>=.85&&!sim.sizeReason&&!sim.materialReason;
  totalPoints+=Math.max(0,Math.min(1,sim.score))*(qtyOk?1:.75);
  rows.push({requirement:req,selected:{code:c.component_code,name:c.component_name,qty:c.quantity,widthCm:item.width_cm,lengthCm:item.length_cm,heightCm:item.height_cm,
    origin:tdsAvailable?'TDS + danh mục':'BOM + danh mục',tdsLines:c.tdsLines},status:ok?'match':'difference',remarks});
 });
 const extraComponents=available.length-taken.size;
 const score=Math.max(0,Math.min(100,Math.round(totalPoints/Math.max(1,reqs.length)*100-Math.min(12,extraComponents))));
 const conditionsReview=[];
 if(conditions.packaging){if(!tdsSpec?.packaging)conditionsReview.push(`Chưa xác nhận bao bì ${conditions.packaging} do TDS thiếu dữ liệu đóng gói`);
  else if(normalize(conditions.packaging)!==normalize(tdsSpec.packaging))conditionsReview.push(`Bao bì khác yêu cầu: cần ${conditions.packaging}, TDS ghi ${tdsSpec.packaging}`);}
 if(conditions.requiresSterile&&!tdsSpec?.sterilization_verified)conditionsReview.push('Yêu cầu tiệt trùng: TDS tham chiếu chưa có bằng chứng xác nhận');
 if(!tdsAvailable)conditionsReview.push('Chưa trích/nhập được bảng cấu hình TDS để đối chiếu đầy đủ');
 if(!documents.sop)conditionsReview.push('Chưa có SOP để kiểm chứng BTP/NVL ở bước 3.2');
 const hasMissing=rows.some(x=>x.status==='missing');const hasDifferences=rows.some(x=>x.status==='difference');
 const status=hasMissing?'insufficient':hasDifferences||conditionsReview.length?'review':'close';
 const recommendation=hasMissing?'new_version':hasDifferences?'review_existing':!documents.sop?'add_sop':conditionsReview.length?'review_existing':'existing';
 return {productKey:product.id,code:product.code,version:product.version,name:product.name,score,status,rows,extraComponents,documents,recommendation,
   conditionsReview,tdsEvidence:tdsAvailable?'parsed_reference':'not_available',confidence:'preliminary'};
}
