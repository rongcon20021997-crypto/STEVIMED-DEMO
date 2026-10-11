/** Preliminary Step 5 draft, not a new inventory code or released ERP BOM. */
export function draftBom(candidate){
 return (candidate?.rows||[]).map((row,index)=>({
  sequence:row.requirement.sourceIndex||index+1,
  itemType:row.requirement.itemType||'UNKNOWN',
  itemName:row.requirement.name,
  quantity:Number(row.requirement.quantity),
  widthCm:row.requirement.widthCm??null,lengthCm:row.requirement.lengthCm??null,heightCm:row.requirement.heightCm??null,
  tolerancePct:row.requirement.tolerancePct??0,
  materialRequirement:row.requirement.material||'',
  existingReference:row.selected?.code||null,
  proposedCode:row.status==='match'?row.selected?.code||null:null,
  action:row.status==='match'?'reuse_pending_document_review':row.status==='difference'?'review_component_or_create_new':'find_existing_or_create_new',
  reviewNotes:(row.remarks||[]).join('; '),
 }));
}
