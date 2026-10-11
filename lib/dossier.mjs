import {extractConditions} from './requirement-parser.mjs';

/** Deterministic draft builder. No invented codes, production settings or certifications. */
export function buildDossier({run, candidate=null, strategy='new_version'}) {
  const requests=run.request_items||[], conditions=extractConditions(run.request_text||'');
  const rows=candidate?.rows||requests.map(requirement=>({requirement,selected:null,status:'missing',remarks:['Không tìm thấy thành phần tương ứng']}));
  const bom=rows.map((r,i)=>({
    sequence:r.requirement.sourceIndex||i+1,
    kind:r.requirement.itemType||'UNKNOWN',
    name:r.requirement.name,
    code:r.status==='match'&&r.selected?.code?r.selected.code:'',
    quantity:Number(r.requirement.quantity),unit:'cái',
    widthCm:r.requirement.widthCm??null,lengthCm:r.requirement.lengthCm??null,heightCm:r.requirement.heightCm??null,
    tolerancePct:r.requirement.tolerancePct??0,
    material:r.requirement.material||'',
    origin:r.selected?.code||'',verified:false,
    notes:r.remarks?.join('; ')||''
  }));
  const comparisons=rows.map((r,i)=>({sequence:r.requirement.sourceIndex||i+1,
    requirement:r.requirement.name, status:r.status, selectedCode:r.selected?.code||'',
    remarks:r.remarks||[], resolution:r.status==='match'?'matched':'pending',resolutionNote:''}));
  return {
    schema:1,strategy,baseProductKey:candidate?.productKey||null,
    baseCode:candidate?.code||'',baseVersion:candidate?.version??null,
    requestedCode:'',productName:candidate?.name||'Bộ thành phẩm theo yêu cầu',
    sourceRequest:run.request_text||'',sourceAnalysisId:run.id||'',
    justification:'',conditions,
    requirements:requests,comparisons,bom,
    evidenceWarnings:(candidate?.conditionsReview||[]).map((warning,i)=>({id:i+1,warning,resolution:'pending',note:''})),
    tds:{description:'',packaging:conditions.packaging||'',packagingSpecification:'',
      sterileRequired:Boolean(conditions.requiresSterile),sterilizationMethod:'',sterilizationValidation:'',
      inspectionCriteria:'',labeling:'',storage:'',notes:'',revision:'01'},
    sop:{code:'',revision:'01',purpose:'',scope:'',responsible:'',equipment:'',ppe:'',
      steps:[
        {number:1,operation:'Chuẩn bị cấu kiện',instruction:'',parameters:'',acceptance:'',record:''},
        {number:2,operation:'Kiểm tra và lắp bộ',instruction:'',parameters:'',acceptance:'',record:''},
        {number:3,operation:'Đóng gói và kiểm tra',instruction:'',parameters:'',acceptance:'',record:''}
      ],
      safetyNotes:'',references:''},
    newParts:[],technicalNotes:'',referenceVerified:false
  };
}

const text=v=>String(v??'').trim();
const real=v=>typeof v==='number'&&Number.isFinite(v);
export function inspectDossier(d){
  const issues=[];const push=(path,detail)=>issues.push({path,detail});
  if(!d||typeof d!=='object'){push('root','Hồ sơ không hợp lệ');return issues;}
  if(!text(d.productName))push('productName','Chưa có tên thành phẩm');
  if(!['existing','new_version','new_code'].includes(d.strategy))push('strategy','Chưa chọn phương án chính xác');
  if(d.strategy!=='new_code'&&!text(d.baseProductKey))push('baseProductKey','Cần mã thành phẩm/version tham chiếu');
  if(d.strategy==='new_code'&&!/^[A-Z0-9][A-Z0-9._-]{3,60}$/i.test(text(d.requestedCode)))push('requestedCode','Mã thành phẩm chính thức phải do người có thẩm quyền cung cấp (4–61 ký tự)');
  if(!text(d.justification)||text(d.justification).length<15)push('justification','Lý do/phương án kỹ thuật tối thiểu 15 ký tự');
  if(!Array.isArray(d.requirements)||!d.requirements.length)push('requirements','Thiếu yêu cầu gốc');
  if(!Array.isArray(d.bom)||!d.bom.length)push('bom','BOM không được rỗng');
  if(d.bom?.length!==d.requirements?.length)push('bom','BOM phải phản ánh đủ số thành phần yêu cầu ban đầu');
  if(d.comparisons?.length!==d.requirements?.length)push('comparisons','Thiếu dòng đối chiếu so với yêu cầu gốc');
  else d.bom.forEach((r,i)=>{
    if(!text(r.name))push(`bom.${i}.name`,'Thiếu tên cấu kiện');
    if(!text(r.code))push(`bom.${i}.code`,'Chưa xác nhận mã BTP/NVL; không được tự tạo');
    if(!real(Number(r.quantity))||Number(r.quantity)<=0)push(`bom.${i}.quantity`,'Số lượng phải > 0');
    if(!['SEMIPRODUCT','MATERIAL'].includes(r.kind))push(`bom.${i}.kind`,'Cần xác định BTP hoặc NVL');
    if(r.verified!==true)push(`bom.${i}.verified`,'Chưa xác minh nguồn mã và cấu kiện');
  });
  // Compare FINAL BOM against customer's ORIGINAL specification, not only initial candidate.
  (d.bom||[]).forEach((r,i)=>{
    const q=(d.requirements||[]).find(x=>(x.sourceIndex||i+1)===r.sequence)||(d.requirements||[])[i];
    if(!q)return;
    const comparison=(d.comparisons||[]).find(c=>c.sequence===r.sequence)||{};
    const accepted=comparison.resolution==='accepted'&&text(comparison.resolutionNote).length>=15;
    if(Number(r.quantity)!==Number(q.quantity)&&!accepted)push(`bom.${i}.quantity`,'SL BOM khác số lượng khách yêu cầu; cần chỉnh lại hoặc giải trình chấp nhận sai khác');
    for(const axis of ['widthCm','lengthCm','heightCm']){
      if(!(Number(q[axis])>0))continue;
      const delta=(Number(r[axis])>0)?Math.abs(Number(r[axis])-Number(q[axis]))/Number(q[axis]):Infinity;
      if(delta>((Number(q.tolerancePct)||0)/100)+1e-9&&!accepted)push(`bom.${i}.${axis}`,'Kích thước BOM vượt dung sai khách yêu cầu; cần chỉnh hoặc xác nhận sai khác');
    }
    if(text(q.material)&&!text(r.material)&&!accepted)push(`bom.${i}.material`,'Cấu kiện có điều kiện chất liệu nhưng BOM chưa ghi nhận');
  });
  const nums=new Set();
  for(const [i,r] of (d.bom||[]).entries()){
    if(nums.has(r.sequence))push(`bom.${i}.sequence`,'Trùng STT');nums.add(r.sequence);
  }
  (d.evidenceWarnings||[]).forEach((w,i)=>{
    if(!['accepted','corrected'].includes(w.resolution)||text(w.note).length<15)push(`evidenceWarnings.${i}`,'Cảnh báo tài liệu/bao bì/SOP chưa được giải trình đầy đủ');
  });
  (d.comparisons||[]).forEach((r,i)=>{
    if(r.status!=='match'&&r.resolution==='pending')push(`comparisons.${i}`,'Sai khác chưa được R&D xử lý');
    if(r.status!=='match'&&(!['accepted','corrected'].includes(r.resolution)||text(r.resolutionNote).length<15))push(`comparisons.${i}.resolutionNote`,'Cần kết luận và lý do giải quyết sai khác ≥ 15 ký tự');
  });
  const t=d.tds||{};
  for(const p of ['description','packaging','packagingSpecification','inspectionCriteria','labeling','storage'])if(!text(t[p]))push(`tds.${p}`,`TDS còn thiếu trường ${p}`);
  if(t.sterileRequired&&(!text(t.sterilizationMethod)||!text(t.sterilizationValidation)))push('tds.sterilization','Cần phương pháp tiệt trùng và bằng chứng xác nhận được phê duyệt');
  if(d.conditions?.packaging&&text(t.packaging).toLowerCase()!==text(d.conditions.packaging).toLowerCase())push('tds.packaging','Bao bì khác yêu cầu; cần sửa cấu hình hoặc xác nhận thay đổi (không được bỏ qua)');
  if(d.conditions?.requiresSterile&&t.sterileRequired!==true)push('tds.sterileRequired','Không được bỏ yêu cầu tiệt trùng gốc');
  const s=d.sop||{};
  for(const p of ['code','purpose','scope','responsible','equipment','ppe','references'])if(!text(s[p]))push(`sop.${p}`,`SOP còn thiếu trường ${p}`);
  if(!Array.isArray(s.steps)||!s.steps.length)push('sop.steps','SOP phải có các bước thao tác');
  else s.steps.forEach((step,i)=>{for(const p of ['operation','instruction','parameters','acceptance','record'])if(!text(step[p]))push(`sop.steps.${i}.${p}`,`SOP bước ${i+1} thiếu ${p}`);});
  for(const [i,p] of (d.newParts||[]).entries()){
    if(!['SEMIPRODUCT','MATERIAL'].includes(p.kind)||!text(p.code)||!text(p.name))push(`newParts.${i}`,'BTP/NVL mới cần mã, loại và tên');
    if(!d.bom?.some(b=>b.code===p.code))push(`newParts.${i}.code`,'Mã cấu kiện mới chưa có trong BOM thành phẩm');
    if(p.kind==='SEMIPRODUCT'){
      if(!Array.isArray(p.materials)||!p.materials.length||p.materials.some(m=>!text(m.code)||!(Number(m.quantity)>0)))push(`newParts.${i}.materials`,'BTP mới phải có BOM NVL cấp 2');
      if(!Array.isArray(p.steps)||!p.steps.length||p.steps.some(st=>!text(st.instruction)||!text(st.acceptance)))push(`newParts.${i}.steps`,'BTP mới phải có SOP thao tác + tiêu chí kiểm tra');
    }
  }
  if(d.referenceVerified!==true)push('referenceVerified','R&D chưa xác nhận nguồn, TDS/BOM/SOP và phiên bản tài liệu');
  return issues;
}

export function dossierStats(d){const issues=inspectDossier(d);return {requirements:d.requirements?.length||0,bom:d.bom?.length||0,newParts:d.newParts?.length||0,issues:issues.length,ready:issues.length===0};}
