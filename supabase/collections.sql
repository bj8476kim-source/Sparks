-- ============================================================
-- Sparks · collections + collection_services 테이블
-- Supabase 대시보드 > SQL Editor 에서 실행하세요.
-- ============================================================

-- 1. collections 테이블
create table if not exists public.collections (
  id          uuid         primary key default gen_random_uuid(),
  title       text         not null,
  description text,
  slug        text         not null unique,
  created_at  timestamptz  not null default now()
);

-- 2. N:M 연결 테이블 (collections ↔ ai_services)
create table if not exists public.collection_services (
  collection_id uuid   not null references public.collections(id) on delete cascade,
  service_id    bigint not null references public.ai_services(id) on delete cascade,
  sort_order    int    not null default 0,
  primary key (collection_id, service_id)
);

create index if not exists idx_cs_collection_id on public.collection_services(collection_id);
create index if not exists idx_cs_service_id    on public.collection_services(service_id);

-- ============================================================
-- RLS 활성화
-- ============================================================
alter table public.collections        enable row level security;
alter table public.collection_services enable row level security;

-- collections: 누구나 읽기, service_role만 쓰기
create policy "Public read collections"
  on public.collections for select
  to anon, authenticated
  using (true);

create policy "Service role manages collections"
  on public.collections for all
  to service_role
  using (true) with check (true);

-- collection_services: 누구나 읽기, service_role만 쓰기
create policy "Public read collection_services"
  on public.collection_services for select
  to anon, authenticated
  using (true);

create policy "Service role manages collection_services"
  on public.collection_services for all
  to service_role
  using (true) with check (true);

-- ============================================================
-- 시드 데이터 예시 (선택 실행)
-- ============================================================
-- insert into public.collections (title, description, slug) values
--   ('✨ 신규 AI 서비스', '이번 주 새로 등록된 스파크들', 'new'),
--   ('🔮 이달의 픽', '에디터가 직접 고른 이달의 베스트', 'monthly-pick'),
--   ('🎯 재미로 만든 서비스', '쓸데없지만 너무 재밌는 AI들', 'just-fun');
