-- ============================================================
-- Sparks · contacts 테이블
-- Supabase 대시보드 > SQL Editor 에서 실행하세요.
-- ============================================================

create table if not exists public.contacts (
  id             bigserial    primary key,
  created_at     timestamptz  not null default now(),
  email          text         not null,
  type           text         not null check (type in ('삭제요청', '일반문의')),
  target_service text,
  message        text         not null,
  status         text         not null default '접수' check (status in ('접수', '처리완료'))
);

-- RLS 활성화
alter table public.contacts enable row level security;

-- 비로그인 포함 누구나 문의 제출 가능
create policy "Anyone can insert contacts"
  on public.contacts for insert
  to anon, authenticated
  with check (true);

-- 로그인한 어드민만 조회 가능
create policy "Authenticated users can select contacts"
  on public.contacts for select
  to authenticated
  using (true);

-- 로그인한 어드민만 상태 업데이트 가능
create policy "Authenticated users can update contacts"
  on public.contacts for update
  to authenticated
  using (true)
  with check (true);
