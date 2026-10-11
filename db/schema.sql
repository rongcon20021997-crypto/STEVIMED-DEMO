-- Run once in Supabase SQL Editor. Imports use the service role from a trusted terminal.
create extension if not exists pg_trgm;

create table if not exists public.catalog_items (
  id text primary key,
  code text not null,
  version integer not null default 0,
  category text not null default 'UNKNOWN' check (category in ('FINPRODUCT','SEMIPRODUCT','MATERIAL','UNKNOWN')),
  name text not null,
  english_name text,
  class_1 text,
  class_2 text,
  base_unit text,
  width_cm numeric,
  length_cm numeric,
  height_cm numeric,
  tds_description text,
  is_active boolean not null default true,
  updated_at timestamptz not null default now(),
  unique (code, version)
);
create index if not exists catalog_items_code_idx on public.catalog_items(code);
create index if not exists catalog_items_name_trgm on public.catalog_items using gin (name gin_trgm_ops);
create index if not exists catalog_items_category_idx on public.catalog_items(category);

-- Aggregated L1 assembly components only. Leaf material data stays separate.
-- Quantities are observational/estimated until checked against an approved TDS.
create table if not exists public.bom_components (
  id text primary key,
  product_key text not null references public.catalog_items(id) on delete cascade,
  component_code text not null,
  component_name text not null,
  quantity numeric not null default 1,
  visible_on_tds boolean not null default true,
  quantity_basis text not null default 'bom_estimate' check (quantity_basis in ('bom_estimate','tds_verified','missing_source')),
  occurrence_count integer not null default 1,
  raw_row_count integer not null default 1,
  updated_at timestamptz not null default now()
);
create index if not exists bom_component_code_idx on public.bom_components(component_code);
create index if not exists bom_component_product_key_idx on public.bom_components(product_key);

create table if not exists public.bom_materials (
  id text primary key,
  product_key text not null references public.catalog_items(id) on delete cascade,
  component_code text not null,
  material_code text not null,
  material_name text not null,
  process_name text,
  quantity numeric,
  updated_at timestamptz not null default now()
);
create index if not exists bom_materials_product_idx on public.bom_materials(product_key);
create index if not exists bom_materials_comp_idx on public.bom_materials(component_code);

create table if not exists public.product_documents (
  id bigint generated always as identity primary key,
  product_key text not null references public.catalog_items(id) on delete cascade,
  document_kind text not null check (document_kind in ('TDS','SOP','BOM')),
  storage_path text,
  original_name text,
  review_status text not null default 'reference_only' check (review_status in ('reference_only','verified')),
  created_at timestamptz not null default now(),
  unique (product_key, document_kind, original_name)
);
create index if not exists documents_product_idx on public.product_documents(product_key);

create table if not exists public.analysis_runs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  request_text text not null default '',
  request_items jsonb not null,
  result jsonb not null,
  created_at timestamptz not null default now()
);
create index if not exists analysis_runs_created_idx on public.analysis_runs(user_id, created_at desc);

create table if not exists public.change_proposals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  analysis_run_id uuid references public.analysis_runs(id) on delete set null,
  proposal_type text not null check (proposal_type in ('new_code','new_version','add_sop','review_existing')),
  base_product_key text references public.catalog_items(id),
  justification text not null,
  suggested_changes jsonb not null default '{}'::jsonb,
  status text not null default 'pending' check (status in ('pending','approved','rejected')),
  created_at timestamptz not null default now()
);

alter table public.catalog_items enable row level security;
alter table public.bom_components enable row level security;
alter table public.bom_materials enable row level security;
alter table public.product_documents enable row level security;
alter table public.analysis_runs enable row level security;
alter table public.change_proposals enable row level security;

-- Only logged-in staff can see internal catalog and private reference information.
drop policy if exists catalog_read on public.catalog_items;
create policy catalog_read on public.catalog_items for select to authenticated using (true);
drop policy if exists bom_read on public.bom_components;
create policy bom_read on public.bom_components for select to authenticated using (true);
drop policy if exists materials_read on public.bom_materials;
create policy materials_read on public.bom_materials for select to authenticated using (true);
drop policy if exists docs_read on public.product_documents;
create policy docs_read on public.product_documents for select to authenticated using (true);
drop policy if exists runs_select on public.analysis_runs;
create policy runs_select on public.analysis_runs for select to authenticated using (auth.uid() = user_id);
drop policy if exists runs_insert on public.analysis_runs;
create policy runs_insert on public.analysis_runs for insert to authenticated with check (auth.uid() = user_id);
drop policy if exists proposals_select on public.change_proposals;
create policy proposals_select on public.change_proposals for select to authenticated using (auth.uid() = user_id);
drop policy if exists proposals_insert on public.change_proposals;
create policy proposals_insert on public.change_proposals for insert to authenticated with check (auth.uid() = user_id and status = 'pending');

insert into storage.buckets (id,name,public,file_size_limit,allowed_mime_types)
values ('rnd-documents','rnd-documents',false,15728640,array['application/pdf'])
on conflict (id) do nothing;
drop policy if exists rnd_documents_read on storage.objects;
create policy rnd_documents_read on storage.objects for select to authenticated
using (bucket_id = 'rnd-documents');
-- No client-side storage write policy: trusted import CLI only.
-- Run this after db/schema.sql on an EXISTING V1 database; new installs use schema.sql only.
create table if not exists public.tds_lines (
 id text primary key,
 product_key text not null references public.catalog_items(id) on delete cascade,
 line_no integer not null,
 component_code text not null,
 component_name text not null,
 quantity numeric not null,
 width_cm numeric, length_cm numeric, height_cm numeric,
 raw_line text,
 source_name text not null,
 extraction_status text not null default 'reference_only',
 updated_at timestamptz not null default now()
);
create index if not exists tds_lines_product_idx on public.tds_lines(product_key);
create table if not exists public.tds_specs (
 product_key text primary key references public.catalog_items(id) on delete cascade,
 packaging text, packaging_text text,
 sterilization_verified boolean not null default false,
 extraction_warnings jsonb not null default '[]'::jsonb,
 source_name text not null,
 updated_at timestamptz not null default now()
);
alter table public.tds_lines enable row level security;
alter table public.tds_specs enable row level security;
drop policy if exists tds_lines_read on public.tds_lines;
create policy tds_lines_read on public.tds_lines for select to authenticated using (true);
drop policy if exists tds_specs_read on public.tds_specs;
create policy tds_specs_read on public.tds_specs for select to authenticated using (true);
-- R&D Full Workflow | V2 -> Full | Run ONCE in Supabase SQL Editor.
-- Explicit reviewer role bootstrap: UPDATE public.rnd_profiles SET role='reviewer' WHERE id='<AUTH_USER_UUID>';
create extension if not exists pgcrypto;
create table if not exists public.rnd_profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  role text not null default 'engineer' check(role in ('engineer','reviewer','admin')),
  created_at timestamptz not null default now()
);
create or replace function public.rnd_new_user() returns trigger
language plpgsql security definer set search_path='' as $$
begin
  insert into public.rnd_profiles(id,role) values(new.id,'engineer') on conflict (id) do nothing;
  return new;
end $$;
drop trigger if exists rnd_profile_on_user_created on auth.users;
create trigger rnd_profile_on_user_created after insert on auth.users for each row execute function public.rnd_new_user();
insert into public.rnd_profiles(id,role) select id,'engineer' from auth.users on conflict (id) do nothing;

create or replace function public.rnd_is_reviewer() returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.rnd_profiles where id=(select auth.uid()) and role in ('reviewer','admin'));
$$;
revoke all on function public.rnd_is_reviewer() from public;
grant execute on function public.rnd_is_reviewer() to authenticated;

create table if not exists public.rnd_cases (
 id uuid primary key default gen_random_uuid(),
 owner_id uuid not null references auth.users(id),
 analysis_run_id uuid references public.analysis_runs(id) on delete set null,
 status text not null default 'draft' check(status in ('draft','submitted','changes_requested','approved','published','rejected')),
 revision integer not null default 1,
 dossier jsonb not null,
 reviewer_id uuid references auth.users(id),
 review_note text,
 official_code text,
 official_version integer,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 reviewed_at timestamptz,
 published_at timestamptz
);
create index if not exists rnd_cases_owner_time on public.rnd_cases(owner_id,created_at desc);
create index if not exists rnd_cases_status_time on public.rnd_cases(status,created_at desc);
create table if not exists public.rnd_case_events (
 id bigint generated always as identity primary key,
 case_id uuid not null references public.rnd_cases(id) on delete cascade,
 actor_id uuid not null references auth.users(id),
 event text not null,
 note text,
 snapshot_revision integer not null,
 created_at timestamptz not null default now()
);
create index if not exists rnd_case_events_case on public.rnd_case_events(case_id,created_at);
create or replace function public.rnd_case_initial_event() returns trigger language plpgsql security definer set search_path='' as $$
begin
 insert into public.rnd_case_events(case_id,actor_id,event,note,snapshot_revision)
 values(new.id,new.owner_id,'created','Khởi tạo từ phiên phân tích R&D',new.revision);
 return new;
end $$;
drop trigger if exists rnd_case_created_event on public.rnd_cases;
create trigger rnd_case_created_event after insert on public.rnd_cases for each row execute function public.rnd_case_initial_event();

create table if not exists public.rnd_component_boms (
 id bigint generated always as identity primary key,
 component_code text not null,
 item_seq integer not null,
 material_code text not null,
 material_name text not null,
 quantity numeric not null check(quantity>0),
 source_case_id uuid not null references public.rnd_cases(id),
 unique(component_code,item_seq)
);
create table if not exists public.rnd_released_dossiers (
 case_id uuid primary key references public.rnd_cases(id),
 code text not null,
 version integer not null,
 dossier jsonb not null,
 approved_by uuid not null references auth.users(id),
 published_at timestamptz not null default now()
);

alter table public.rnd_profiles enable row level security;
alter table public.rnd_cases enable row level security;
alter table public.rnd_case_events enable row level security;
alter table public.rnd_component_boms enable row level security;
alter table public.rnd_released_dossiers enable row level security;

drop policy if exists rnd_profile_read on public.rnd_profiles;
create policy rnd_profile_read on public.rnd_profiles for select to authenticated using (id=(select auth.uid()) or public.rnd_is_reviewer());
drop policy if exists rnd_cases_read on public.rnd_cases;
create policy rnd_cases_read on public.rnd_cases for select to authenticated using(owner_id=(select auth.uid()) or public.rnd_is_reviewer());
drop policy if exists rnd_cases_insert on public.rnd_cases;
create policy rnd_cases_insert on public.rnd_cases for insert to authenticated
with check(owner_id=(select auth.uid()) and status='draft' and revision=1 and reviewer_id is null and official_code is null and published_at is null
  and analysis_run_id is not null and exists(select 1 from public.analysis_runs a where a.id=analysis_run_id and a.user_id=(select auth.uid())));
-- Intentionally NO general UPDATE policy. All state changes use controlled RPCs below.
drop policy if exists rnd_events_read on public.rnd_case_events;
create policy rnd_events_read on public.rnd_case_events for select to authenticated
using(exists(select 1 from public.rnd_cases c where c.id=case_id and (c.owner_id=(select auth.uid()) or public.rnd_is_reviewer())));
drop policy if exists rnd_parts_read on public.rnd_component_boms;
create policy rnd_parts_read on public.rnd_component_boms for select to authenticated using(true);
drop policy if exists rnd_release_read on public.rnd_released_dossiers;
create policy rnd_release_read on public.rnd_released_dossiers for select to authenticated using(true);

-- At API/RPC boundary: reject missing real production content and unresolved differences.
-- The JS validator provides more detailed per-field messages; SQL gate is authoritative.
create or replace function public.rnd_assert_ready(p jsonb) returns void
language plpgsql set search_path='' as $$
declare x jsonb; j jsonb; b jsonb; s jsonb; t jsonb; req jsonb; cmp jsonb; i int; axis text; expected numeric; actual numeric; tol numeric; allowed boolean;
begin
 if p is null or jsonb_typeof(p) <> 'object' then raise exception 'Hồ sơ chưa hợp lệ'; end if;
 if coalesce(length(btrim(p->>'productName')),0)=0 then raise exception 'Thiếu tên thành phẩm'; end if;
 if p->>'strategy' not in ('existing','new_version','new_code') then raise exception 'Phương án không hợp lệ'; end if;
 if p->>'strategy' <> 'new_code' and coalesce(p->>'baseProductKey','')='' then raise exception 'Thiếu mã nền'; end if;
 if p->>'strategy' = 'new_code' and coalesce(p->>'requestedCode','') !~ '^[A-Za-z0-9][A-Za-z0-9._-]{3,60}$' then raise exception 'Chưa cung cấp mã thành phẩm được phép dùng'; end if;
 if coalesce(length(btrim(p->>'justification')),0)<15 then raise exception 'Thiếu giải trình kỹ thuật'; end if;
 if jsonb_typeof(p->'bom') <> 'array' or jsonb_array_length(p->'bom')=0 then raise exception 'BOM chưa có cấu kiện'; end if;
 if jsonb_typeof(p->'requirements')<>'array' or jsonb_array_length(p->'requirements')<>jsonb_array_length(p->'bom') then raise exception 'BOM thiếu dòng yêu cầu'; end if;
 if jsonb_typeof(p->'comparisons')<>'array' or jsonb_array_length(p->'comparisons')<>jsonb_array_length(p->'bom') then raise exception 'Chưa đối chiếu đủ thành phần'; end if;
 for b in select value from jsonb_array_elements(p->'bom') loop
   if coalesce(length(btrim(b->>'code')),0)=0 or coalesce(length(btrim(b->>'name')),0)=0 or
      b->>'kind' not in ('SEMIPRODUCT','MATERIAL') or coalesce((b->>'quantity')::numeric,0)<=0 or coalesce(b->>'verified','false')<>'true' then
     raise exception 'BOM chưa đủ mã, phân loại, số lượng hoặc xác nhận nguồn';
   end if;
 end loop;
 i:=0;
 for b in select value from jsonb_array_elements(p->'bom') loop
   req:=p->'requirements'->i;cmp:=p->'comparisons'->i;
   allowed:=coalesce(cmp->>'resolution','')='accepted' and length(btrim(coalesce(cmp->>'resolutionNote','')))>=15;
   if coalesce((b->>'quantity')::numeric,0)<>coalesce((req->>'quantity')::numeric,0) and not allowed then
     raise exception 'BOM sai số lượng yêu cầu tại dòng %',i+1;
   end if;
   tol:=coalesce((req->>'tolerancePct')::numeric,0)/100;
   foreach axis in array array['widthCm','lengthCm','heightCm'] loop
     expected:=coalesce(nullif(req->>axis,'')::numeric,0);
     actual:=coalesce(nullif(b->>axis,'')::numeric,0);
     if expected>0 and abs(actual-expected)>expected*tol+0.000001 and not allowed then
       raise exception 'BOM sai kích thước % tại dòng %',axis,i+1;
     end if;
   end loop;
   if coalesce(req->>'material','')<>'' and coalesce(b->>'material','')='' and not allowed then
     raise exception 'Thiếu điều kiện chất liệu tại dòng %',i+1;
   end if;
   i:=i+1;
 end loop;
 if jsonb_typeof(p->'comparisons')='array' then
   for x in select value from jsonb_array_elements(p->'comparisons') loop
     if x->>'status'<>'match' and (x->>'resolution' not in ('accepted','corrected') or coalesce(length(btrim(x->>'resolutionNote')),0)<15) then
       raise exception 'Chưa giải quyết sai khác kỹ thuật';
     end if;
   end loop;
 end if;
 if jsonb_typeof(p->'evidenceWarnings')='array' then
  for x in select value from jsonb_array_elements(p->'evidenceWarnings') loop
    if x->>'resolution' not in ('accepted','corrected') or length(btrim(coalesce(x->>'note','')))<15 then
      raise exception 'Chưa giải quyết cảnh báo TDS/SOP/bao bì';
    end if;
  end loop;
 end if;
 t:=p->'tds';
 foreach j in array array[t->'description',t->'packaging',t->'packagingSpecification',t->'inspectionCriteria',t->'labeling',t->'storage'] loop
   if j is null or coalesce(length(btrim(j #>> '{}')),0)=0 then raise exception 'Thiếu nội dung TDS'; end if;
 end loop;
 if coalesce(p->'conditions'->>'packaging','')<>'' and lower(t->>'packaging')<>lower(p->'conditions'->>'packaging') then
   raise exception 'Bao bì TDS khác yêu cầu khách hàng';
 end if;
 if coalesce(p->'conditions'->>'requiresSterile','false')='true' and coalesce(t->>'sterileRequired','false')<>'true' then
   raise exception 'Không được bỏ yêu cầu tiệt trùng gốc';
 end if;
 if coalesce(t->>'sterileRequired','false')='true' and
   (coalesce(length(btrim(t->>'sterilizationMethod')),0)=0 or coalesce(length(btrim(t->>'sterilizationValidation')),0)=0) then
   raise exception 'Thiếu quy trình hoặc thẩm định tiệt trùng';
 end if;
 s:=p->'sop';
 foreach j in array array[s->'code',s->'purpose',s->'scope',s->'responsible',s->'equipment',s->'ppe',s->'references'] loop
   if j is null or coalesce(length(btrim(j #>> '{}')),0)=0 then raise exception 'Thiếu nội dung SOP'; end if;
 end loop;
 if jsonb_typeof(s->'steps')<>'array' or jsonb_array_length(s->'steps')=0 then raise exception 'SOP chưa có bước thao tác'; end if;
 for x in select value from jsonb_array_elements(s->'steps') loop
   if coalesce(length(btrim(x->>'operation')),0)=0 or coalesce(length(btrim(x->>'instruction')),0)=0 or
      coalesce(length(btrim(x->>'parameters')),0)=0 or coalesce(length(btrim(x->>'acceptance')),0)=0 or
      coalesce(length(btrim(x->>'record')),0)=0 then raise exception 'SOP còn bước trống'; end if;
 end loop;
 if p->>'referenceVerified' <> 'true' then raise exception 'Chưa xác minh tài liệu gốc'; end if;
 if jsonb_typeof(p->'newParts')='array' then
  for x in select value from jsonb_array_elements(p->'newParts') loop
    if coalesce(x->>'code','')='' or coalesce(x->>'name','')='' or x->>'kind' not in ('SEMIPRODUCT','MATERIAL') then raise exception 'Thiếu dữ liệu BTP/NVL mới'; end if;
    if x->>'kind'='SEMIPRODUCT' then
      if jsonb_typeof(x->'materials')<>'array' or jsonb_array_length(x->'materials')=0 or jsonb_typeof(x->'steps')<>'array' or jsonb_array_length(x->'steps')=0 then
        raise exception 'BTP mới cần BOM và SOP riêng';
      end if;
      for j in select value from jsonb_array_elements(x->'materials') loop
        if coalesce(j->>'code','')='' or coalesce((j->>'quantity')::numeric,0)<=0 then raise exception 'BOM BTP mới không hợp lệ'; end if;
      end loop;
      for j in select value from jsonb_array_elements(x->'steps') loop
        if coalesce(j->>'instruction','')='' or coalesce(j->>'acceptance','')='' then raise exception 'SOP BTP mới không hợp lệ'; end if;
      end loop;
    end if;
  end loop;
 end if;
end $$;
revoke all on function public.rnd_assert_ready(jsonb) from public;

create or replace function public.rnd_save_case(p_id uuid,p_revision integer,p_dossier jsonb)
returns integer language plpgsql security definer set search_path='' as $$
declare c public.rnd_cases%rowtype;
begin
 if (select auth.uid()) is null then raise exception 'Chưa đăng nhập'; end if;
 select * into c from public.rnd_cases where id=p_id for update;
 if not found or c.owner_id<>(select auth.uid()) then raise exception 'Không có quyền sửa'; end if;
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
 select * into c from public.rnd_cases where id=p_id for update;
 if not found or c.owner_id is distinct from (select auth.uid()) then raise exception 'Không có quyền gửi duyệt'; end if;
 if c.status not in ('draft','changes_requested') then raise exception 'Trạng thái không cho phép gửi duyệt'; end if;
 perform public.rnd_assert_ready(c.dossier);
 update public.rnd_cases set status='submitted',updated_at=now() where id=p_id;
 insert into public.rnd_case_events(case_id,actor_id,event,snapshot_revision) values(p_id,(select auth.uid()),'submitted',c.revision);
 return 'submitted';
end $$;

create or replace function public.rnd_review_case(p_id uuid,p_decision text,p_note text)
returns text language plpgsql security definer set search_path='' as $$
declare c public.rnd_cases%rowtype; next_status text;
begin
 if not public.rnd_is_reviewer() then raise exception 'Chỉ reviewer/admin có quyền duyệt'; end if;
 select * into c from public.rnd_cases where id=p_id for update;
 if not found or c.status<>'submitted' then raise exception 'Hồ sơ không ở trạng thái chờ duyệt'; end if;
 if c.owner_id=(select auth.uid()) then raise exception 'Không được tự phê duyệt hồ sơ của mình'; end if;
 if coalesce(length(btrim(p_note)),0)<10 then raise exception 'Cần nhận xét có nội dung ≥ 10 ký tự'; end if;
 next_status:=case p_decision when 'approve' then 'approved' when 'changes' then 'changes_requested' when 'reject' then 'rejected' else null end;
 if next_status is null then raise exception 'Quyết định không hợp lệ'; end if;
 if next_status='approved' then perform public.rnd_assert_ready(c.dossier); end if;
 update public.rnd_cases set status=next_status,reviewer_id=(select auth.uid()),review_note=p_note,reviewed_at=now(),updated_at=now() where id=p_id;
 insert into public.rnd_case_events(case_id,actor_id,event,note,snapshot_revision)
 values(p_id,(select auth.uid()),next_status,p_note,c.revision);
 return next_status;
end $$;

create or replace function public.rnd_publish_case(p_id uuid)
returns jsonb language plpgsql security definer set search_path='' as $$
declare c public.rnd_cases%rowtype; p jsonb; k text; vers integer; product_id text;
 b jsonb; part jsonb; mat jsonb; ix integer; kind text;
begin
 if not public.rnd_is_reviewer() then raise exception 'Chỉ reviewer/admin được phát hành'; end if;
 select * into c from public.rnd_cases where id=p_id for update;
 if not found or c.status<>'approved' or c.reviewer_id is null then raise exception 'Hồ sơ chưa được phê duyệt'; end if;
 if c.reviewer_id<>(select auth.uid()) then raise exception 'Người phát hành phải là người đã duyệt'; end if;
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
 values(p_id,k,vers,p,c.reviewer_id);
 update public.rnd_cases set official_code=k,official_version=vers,status='published',published_at=now(),updated_at=now() where id=p_id;
 insert into public.rnd_case_events(case_id,actor_id,event,note,snapshot_revision)
 values(p_id,(select auth.uid()),'published','BOM, TDS và SOP điện tử được lưu trong rnd_released_dossiers',c.revision);
 return jsonb_build_object('code',k,'version',vers,'caseId',p_id,'kind',kind);
end $$;

revoke all on function public.rnd_save_case(uuid,integer,jsonb) from public;
revoke all on function public.rnd_submit_case(uuid) from public;
revoke all on function public.rnd_review_case(uuid,text,text) from public;
revoke all on function public.rnd_publish_case(uuid) from public;
grant execute on function public.rnd_save_case(uuid,integer,jsonb) to authenticated;
grant execute on function public.rnd_submit_case(uuid) to authenticated;
grant execute on function public.rnd_review_case(uuid,text,text) to authenticated;
grant execute on function public.rnd_publish_case(uuid) to authenticated;
