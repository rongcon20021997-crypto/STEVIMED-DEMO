export interface RequirementItem {
  id: string;
  name: string;
  code?: string;
  quantity: number;
  itemType?: 'SEMIPRODUCT' | 'MATERIAL' | 'UNKNOWN';
  sourceIndex?: number;
  heightCm?: number | null;
  tolerancePct?: number;
  widthCm?: number | null;
  lengthCm?: number | null;
  material?: string;
  notes?: string;
}
export interface CatalogItem {
  id: string; code: string; version: number;
  category: string; name: string; width_cm: number | null; length_cm: number | null;
  height_cm?: number | null; tds_description?: string | null;
}
export interface BomComponent {
  product_key: string; component_code: string; component_name: string;
  quantity: number;
  quantity_basis: 'bom_estimate' | 'tds_verified' | 'missing_source'; visible_on_tds: boolean;
}
export interface RowComparison {
  requirement: RequirementItem;
  selected: {code:string; name:string; qty:number; widthCm:number|null; lengthCm:number|null; heightCm?:number|null; origin?:string;tdsLines?:number[]} | null;
  status: 'match' | 'difference' | 'missing';
  remarks: string[];
}
export interface ProductCandidate {
  productKey:string; code:string; version:number; name:string; score:number;
  status: 'close' | 'review' | 'insufficient';
  rows: RowComparison[]; extraComponents: number;
  documents: {bom:boolean; tds:boolean; sop:boolean};
  recommendation: 'existing'|'add_sop'|'new_version'|'review_existing';
  conditionsReview?:string[]; tdsEvidence?:string;
  confidence: 'preliminary';
}
