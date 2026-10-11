-- NO LOGIN MODE: chay SAU db/schema.sql (hoac db/migration_full.sql tren project V2).
-- Chay trong Supabase SQL Editor. Server API dung SERVICE ROLE SECRET; khong cung cap khoa nay cho frontend.
-- Không có xác thực danh tính; quy trình phê duyệt chỉ là xác nhận thủ công và lưu tên khai báo.

alter table public.analysis_runs alter column user_id drop not null;
alter table public.change_proposals alter column user_id drop not null;
alter table public.rnd_cases alter column owner_id drop not null;
alter table public.rnd_cases add column if not exists reviewer_name text;
alter table public.rnd_case_events alter column actor_id drop not null;
alter table public.rnd_released_dossiers alter column approved_by drop not null;

-- Chỉ service_role có thể gọi các function thay đổi trạng thái qua server API.
create or replace function public.rnd_save_case(p_id uuid,p_revision integer,p_dossier jsonb)
returns integer language plpgsql security definer set search_path='' as $$
declare c public.rnd_cases%rowtype;
begin
 if (select auth.role()) <> 'service_role' then raise exception 'Yêu cầu đặc quyền server'; end if;
 select * into c from public.rnd_cases where id=p_id for update;
 if not found then raise exception 'Không tìm thấy hồ sơ'; end if;
 if c.status not in ('draft','changes_requested') then raise exception 'Hồ sơ đã khóa, không thể sửa'; end if;
 if c.revision<>p_revision then raise exception 'Phiên bản thay đổi, vui lòng tải lại'; end if;
 if octet_length(p_dossier::text)>524288 then raise exception 'Hồ sơ quá lớn'; end if;
 if p_dossier->>'strategy' not in ('existing','new_version','new_code') then raise exception 'Phương án không hợp lệ'; end if;
 if p_dossier->>'sourceAnalysisId' is distinct from c.dossier->>'sourceAnalysisId' or
    p_dossier->>'sourceRequest' is distinct from c.dossier->>'sourceRequest' or
    p_dossier->'requirements' is distinct from c.dossier->'requirements' or
    p_dossier->'conditions' is distinct from c.dossier->'conditions' or
    jsonb_array_length(coalesce(p_dossier->'evidenceWarnings','[]'::jsonb))<>jsonb_array_length(coalesce(c.dossier->'evidenceWarnings','[]'::jsonb)) or
    p_dossier->>'baseProductKey' is distinct from c.dossier->>'baseProductKey' then
    raise exception 'Không được thay đổi yêu cầu gốc hoặc mã tham chiếu'; end if;
 update public.rnd_cases set dossier=p_dossier,revision=revision+1,updated_at=now() where id=p_id;
 insert into public.rnd_case_events(case_id,actor_id,event,snapshot_revision) values(p_id,(select auth.uid()),'saved',p_revision+1);
 return p_revision+1;
end $$;

create or replace function public.rnd_submit_case(p_id uuid) returns text
language plpgsql security definer set search_path='' as $$
declare c public.rnd_cases%rowtype;
begin
 if (select auth.role()) <> 'service_role' then raise exception 'Yêu cầu đặc quyền server'; end if;
 select * into c from public.rnd_cases where id=p_id for update;
 if not found then raise exception 'Không tìm thấy hồ sơ'; end if;
 if c.status not in ('draft','changes_requested') then raise exception 'Trạng thái không cho phép gửi duyệt'; end if;
 perform public.rnd_assert_ready(c.dossier);
 update public.rnd_cases set status='submitted',updated_at=now() where id=p_id;
 insert into public.rnd_case_events(case_id,actor_id,event,snapshot_revision) values(p_id,(select auth.uid()),'submitted',c.revision);
 return 'submitted';
end $$;

create or replace function public.rnd_review_case(p_id uuid,p_decision text,p_note text,p_reviewer_name text)
returns text language plpgsql security definer set search_path='' as $$
declare c public.rnd_cases%rowtype; next_status text;
begin
 if (select auth.role()) <> 'service_role' then raise exception 'Yêu cầu đặc quyền server'; end if;
 select * into c from public.rnd_cases where id=p_id for update;
 if not found or c.status<>'submitted' then raise exception 'Hồ sơ không ở trạng thái chờ duyệt'; end if;
 if coalesce(length(btrim(p_reviewer_name)),0)<3 or length(p_reviewer_name)>120 then raise exception 'Thiếu họ tên người kiểm tra'; end if;
 if coalesce(length(btrim(p_note)),0)<10 then raise exception 'Cần nhận xét có nội dung ≥ 10 ký tự'; end if;
 next_status:=case p_decision when 'approve' then 'approved' when 'changes' then 'changes_requested' when 'reject' then 'rejected' else null end;
 if next_status is null then raise exception 'Quyết định không hợp lệ'; end if;
 if next_status='approved' then perform public.rnd_assert_ready(c.dossier); end if;
 update public.rnd_cases set status=next_status,reviewer_id=null,reviewer_name=btrim(p_reviewer_name),review_note=p_note,reviewed_at=now(),updated_at=now() where id=p_id;
 insert into public.rnd_case_events(case_id,actor_id,event,note,snapshot_revision)
 values(p_id,null,next_status,'Người kiểm tra tự khai báo: '||btrim(p_reviewer_name)||' | '||p_note,c.revision);
 return next_status;
end $$;

create or replace function public.rnd_publish_case(p_id uuid)
returns jsonb language plpgsql security definer set search_path='' as $$
declare c public.rnd_cases%rowtype; p jsonb; k text; vers integer; product_id text;
 b jsonb; part jsonb; mat jsonb; ix integer; kind text;
begin
 if (select auth.role()) <> 'service_role' then raise exception 'Yêu cầu đặc quyền server'; end if;
 select * into c from public.rnd_cases where id=p_id for update;
 if not found or c.status<>'approved' or coalesce(length(btrim(c.reviewer_name)),0)<3 then raise exception 'Hồ sơ chưa được phê duyệt'; end if;
 -- Chế độ không đăng nhập: không thể xác minh danh tính người phát hành.
 perform public.rnd_assert_ready(c.dossier);
 p:=c.dossier;kind:=p->>'strategy';
 if kind='new_code' then
    k:=upper(btrim(p->>'requestedCode'));
 else
    select code into k from public.catalog_items where id=p->>'baseProductKey' and category='FINPRODUCT';
    if k is null then raise exception 'Mã thành phẩm tham chiếu không tồn tại'; end if;
 end if;
 perform pg_advisory_xact_lock(hashtext('RND-PRODUCT-'||k));
 if kind='existing' then
    select version into vers from public.catalog_items where id=p->>'baseProductKey' and category='FINPRODUCT';
    if vers is null then raise exception 'Không tồn tại version gốc'; end if;
 elsif kind='new_version' then
    select coalesce(max(version),0)+1 into vers from public.catalog_items where code=k;
 else
    if exists(select 1 from public.catalog_items where code=k) then raise exception 'Mã mới đã tồn tại trong danh mục'; end if;
    vers:=1;
 end if;
 product_id:=k||'::'||vers::text;
 -- New component SKUs are explicitly entered by engineers and approved, never AI-generated identifiers.
 if jsonb_typeof(p->'newParts')='array' then
  for part in select value from jsonb_array_elements(p->'newParts') loop
    if exists(select 1 from public.catalog_items where code=part->>'code') then raise exception 'Mã cấu kiện mới bị trùng: %',part->>'code'; end if;
    insert into public.catalog_items(id,code,version,category,name,width_cm,length_cm,height_cm,tds_description)
    values(part->>'code'||'::1',part->>'code',1,part->>'kind',part->>'name',
      nullif(part->>'widthCm','')::numeric,nullif(part->>'lengthCm','')::numeric,nullif(part->>'heightCm','')::numeric,part->>'description');
  end loop;
  -- Second pass: all new MATERIAL codes now exist, regardless of creation order in the JSON array.
  for part in select value from jsonb_array_elements(p->'newParts') loop
    if part->>'kind'='SEMIPRODUCT' then
       ix:=0;
       for mat in select value from jsonb_array_elements(part->'materials') loop
         if not exists(select 1 from public.catalog_items where code=mat->>'code' and category='MATERIAL') then
           raise exception 'NVL cấp 2 của BTP mới chưa tồn tại: %',mat->>'code';
         end if;
         ix:=ix+1;
         insert into public.rnd_component_boms(component_code,item_seq,material_code,material_name,quantity,source_case_id)
         values(part->>'code',ix,mat->>'code',coalesce(mat->>'name',''),(mat->>'quantity')::numeric,p_id);
       end loop;
    end if;
  end loop;
 end if;
 if kind<>'existing' then
    insert into public.catalog_items(id,code,version,category,name,tds_description)
    values(product_id,k,vers,'FINPRODUCT',p->>'productName',p->'tds'->>'description');
    ix:=0;
    for b in select value from jsonb_array_elements(p->'bom') loop
      ix:=ix+1;
      -- Require every component SKU to exist. Release must be referentially complete.
      if not exists(select 1 from public.catalog_items where code=b->>'code' and category in ('SEMIPRODUCT','MATERIAL')) then
        raise exception 'Mã BTP/NVL chưa tồn tại: %',b->>'code';
      end if;
      insert into public.bom_components(id,product_key,component_code,component_name,quantity,quantity_basis,visible_on_tds,occurrence_count,raw_row_count)
      values(product_id||':RND:'||ix,product_id,b->>'code',b->>'name',(b->>'quantity')::numeric,'tds_verified',true,1,1);
      insert into public.tds_lines(id,product_key,line_no,component_code,component_name,quantity,width_cm,length_cm,height_cm,raw_line,source_name,extraction_status)
      values(product_id||':RND:'||ix,product_id,ix,b->>'code',b->>'name',(b->>'quantity')::numeric,
        nullif(b->>'widthCm','')::numeric,nullif(b->>'lengthCm','')::numeric,nullif(b->>'heightCm','')::numeric,b->>'notes','RND_RELEASE:'||p_id,'approved_dossier');
    end loop;
    insert into public.tds_specs(product_key,packaging,packaging_text,sterilization_verified,extraction_warnings,source_name)
    values(product_id,p->'tds'->>'packaging',p->'tds'->>'packagingSpecification',
      coalesce(p->'tds'->>'sterileRequired','false')='true' and coalesce(p->'tds'->>'sterilizationValidation','')<>'',
      '[]'::jsonb,'RND_RELEASE:'||p_id);
 end if;
 insert into public.rnd_released_dossiers(case_id,code,version,dossier,approved_by)
 values(p_id,k,vers,p,null);
 update public.rnd_cases set official_code=k,official_version=vers,status='published',published_at=now(),updated_at=now() where id=p_id;
 insert into public.rnd_case_events(case_id,actor_id,event,note,snapshot_revision)
 values(p_id,null,'published','Phát hành theo hồ sơ; người kiểm tra tự khai báo: '||c.reviewer_name,c.revision);
 return jsonb_build_object('code',k,'version',vers,'caseId',p_id,'kind',kind);
end $$;

-- Vô hiệu hóa API RPC sử dụng JWT người dùng cũ, không mở cho anon/authenticated.
revoke execute on function public.rnd_save_case(uuid,integer,jsonb) from public,anon,authenticated;
revoke execute on function public.rnd_submit_case(uuid) from public,anon,authenticated;
revoke execute on function public.rnd_review_case(uuid,text,text) from public,anon,authenticated;
revoke execute on function public.rnd_review_case(uuid,text,text,text) from public,anon,authenticated;
revoke execute on function public.rnd_publish_case(uuid) from public,anon,authenticated;
grant execute on function public.rnd_save_case(uuid,integer,jsonb) to service_role;
grant execute on function public.rnd_submit_case(uuid) to service_role;
grant execute on function public.rnd_review_case(uuid,text,text,text) to service_role;
grant execute on function public.rnd_publish_case(uuid) to service_role;
