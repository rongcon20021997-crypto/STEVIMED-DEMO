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

-- Support approval request for review of an existing, almost-matching code.
alter table public.change_proposals drop constraint if exists change_proposals_proposal_type_check;
alter table public.change_proposals add constraint change_proposals_proposal_type_check
  check (proposal_type in ('new_code','new_version','add_sop','review_existing'));

-- Never treat a source BOM with missing/zero quantity as one piece.
alter table public.bom_components drop constraint if exists bom_components_quantity_basis_check;
alter table public.bom_components add constraint bom_components_quantity_basis_check
 check (quantity_basis in ('bom_estimate','tds_verified','missing_source'));
