import type { SupabaseClient } from '@supabase/supabase-js';
import type { RequirementItem, CatalogItem, BomComponent, ProductCandidate } from '@/lib/types';
import { itemSimilarity,rankProduct } from '@/lib/matching-engine.mjs';
import {extractConditions} from '@/lib/requirement-parser.mjs';

async function fetchPaged<T>(base:()=>any, maxRows=30000):Promise<T[]> {
  const result:T[]=[];
  for(let offset=0;offset<maxRows;offset+=900){
    const {data,error}=await base().range(offset,offset+899);
    if(error)throw Error(`Supabase: ${error.message}`);
    const rows=(data||[]) as T[];
    result.push(...rows);
    if(rows.length<900)break;
  }
  if(result.length>=maxRows)throw Error(`Tập dữ liệu vượt giới hạn kiểm tra ${maxRows} dòng; không được âm thầm bỏ sót. Cần tối ưu truy vấn/index hoặc chia batch.`);
  return result;
}
function chunks<T>(a:T[],count:number){const out:T[][]=[];for(let i=0;i<a.length;i+=count)out.push(a.slice(i,i+count));return out;}

let catalogCache: { data: CatalogItem[]; timestamp: number } | null = null;
const CATALOG_CACHE_TTL = 5 * 60 * 1000;

export function invalidateCatalogCache() {
  catalogCache = null;
}

export async function performAnalysis(db:SupabaseClient, reqs:RequirementItem[],requestText=''):Promise<{candidates:ProductCandidate[];meta:{matchedCatalogCodes:number;candidateProducts:number;warnings:string[]}}>{
  let catalog: CatalogItem[];
  const now = Date.now();
  if (catalogCache && now - catalogCache.timestamp < CATALOG_CACHE_TTL) {
    catalog = catalogCache.data;
  } else {
    catalog = await fetchPaged<CatalogItem>(()=>db.from('catalog_items').select('id,code,version,category,name,width_cm,length_cm,height_cm,tds_description'),30000);
    catalogCache = { data: catalog, timestamp: now };
  }

  const componentsCatalog=catalog.filter(x=>x.category!=='FINPRODUCT');
  const catalogByCode=new Map<string,CatalogItem>();
  for(const item of componentsCatalog)if(!catalogByCode.has(item.code))catalogByCode.set(item.code,item);
  const matchingCodes=new Set<string>();
  for(const req of reqs){
    const found=componentsCatalog.map(item=>{
      const sim = itemSimilarity(req, item);
      return {item, score: sim.score, nameScore: sim.nameScore};
    })
      .filter(x=>x.nameScore>=0.34||Boolean(req.code&&req.code===x.item.code))
      .sort((a,b)=>b.score-a.score).slice(0,5);
    found.forEach(x=>matchingCodes.add(x.item.code));
  }
  const codes=[...matchingCodes];
  if(!codes.length)return {candidates:[],meta:{matchedCatalogCodes:0,candidateProducts:0,warnings:['Không nhận diện được BTP/NVL; hãy kiểm tra tên, kích thước hoặc mã cấu kiện.']}};
  const keyHits=new Map<string,Set<string>>();
  for(const group of chunks(codes,60)){
    const hits=await fetchPaged<{product_key:string;component_code:string}>(()=>db.from('bom_components').select('product_key,component_code').in('component_code',group),15000);
    for(const hit of hits){if(!keyHits.has(hit.product_key))keyHits.set(hit.product_key,new Set());keyHits.get(hit.product_key)!.add(hit.component_code);}
  }
  const finProductKeys=new Set(catalog.filter(x=>x.category==='FINPRODUCT').map(x=>x.id));
  const prioritized=[...keyHits.entries()].filter(([key])=>finProductKeys.has(key)).sort((a,b)=>b[1].size-a[1].size).map(x=>x[0]);
  if(!prioritized.length)return {candidates:[],meta:{matchedCatalogCodes:codes.length,candidateProducts:0,warnings:['Không tìm thấy thành phẩm chứa các BTP/NVL tra cứu được.']}};

  // Deep query the top 40 candidates with the highest hit count for detailed BOM/TDS verification
  const targetProducts = prioritized.slice(0, 40);
  const candidatesCatalog=catalog.filter(x=>x.category==='FINPRODUCT'&&targetProducts.includes(x.id));
  const allComponents:BomComponent[]=[];
  for(const group of chunks(targetProducts,50)){
    const rows=await fetchPaged<BomComponent>(()=>db.from('bom_components').select('product_key,component_code,component_name,quantity,quantity_basis,visible_on_tds').in('product_key',group),5000);
    allComponents.push(...rows);
  }
  const allMats:{product_key:string;component_code:string;material_name:string}[]=[];
  type TdsRow={product_key:string;line_no:number;component_code:string;component_name:string;quantity:number;width_cm:number|null;length_cm:number|null;height_cm:number|null};
  type TdsSpec={product_key:string;packaging:string|null;sterilization_verified:boolean};
  const allTds:TdsRow[]=[];const allTdsSpec:TdsSpec[]=[];
  const allDocs:{product_key:string;document_kind:string}[]=[];
  for(const group of chunks(targetProducts,50)){
    const [m,d,t,spec]=await Promise.all([
      fetchPaged<{product_key:string;component_code:string;material_name:string}>(()=>db.from('bom_materials').select('product_key,component_code,material_name').in('product_key',group),9000),
      fetchPaged<{product_key:string;document_kind:string}>(()=>db.from('product_documents').select('product_key,document_kind').in('product_key',group),1000),
      fetchPaged<TdsRow>(()=>db.from('tds_lines').select('product_key,line_no,component_code,component_name,quantity,width_cm,length_cm,height_cm').in('product_key',group),9000),
      fetchPaged<TdsSpec>(()=>db.from('tds_specs').select('product_key,packaging,sterilization_verified').in('product_key',group),1000)
    ]);
    allMats.push(...m);allDocs.push(...d);allTds.push(...t);allTdsSpec.push(...spec);
  }
  const output=candidatesCatalog.map(product=>{
    const matMap=new Map<string,string[]>();
    for(const m of allMats){if(m.product_key!==product.id)continue;
      const a=matMap.get(m.component_code)||[];a.push(m.material_name);matMap.set(m.component_code,a);
    }
    const pc=allComponents.filter(x=>x.product_key===product.id);
    const docs=allDocs.filter(d=>d.product_key===product.id);
    return rankProduct(reqs,product,pc,catalogByCode,matMap,{
      bom:pc.length>0,tds:docs.some(d=>d.document_kind==='TDS'),
      // SOP of each BTP (step 3.2) is not represented by a product-level SOP attachment.
      sop:false
    },allTds.filter(d=>d.product_key===product.id),extractConditions(requestText),allTdsSpec.find(d=>d.product_key===product.id)||null);
  }).sort((a,b)=>b.score-a.score).slice(0,12);
  return {candidates:output,meta:{matchedCatalogCodes:codes.length,candidateProducts:prioritized.length,warnings:[
    'Kết quả xếp hạng sơ bộ; TDS trích tự động chỉ là bản tham chiếu, yêu cầu R&D xác minh trước khi phê duyệt.',
    'Số lượng trích từ BOM phẳng có thể cần xác minh với TDS; không cộng các dòng nguyên vật liệu cấp 2.'
  ]}};
}
