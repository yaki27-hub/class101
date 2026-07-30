-- ─────────────────────────────────────────────────────────────
-- 0005: 체중 기록 (추이 · 감소 감지)
--
-- Cat.weight_kg는 '현재 체중' 한 값이라 추이를 볼 수 없다. 매달 잰 값을
-- 쌓아 변화를 보기 위한 테이블.
-- 체중 감소는 갑상선기능항진증·당뇨·만성 신부전·종양의 이른 신호라,
-- 기록 자체보다 **변화를 잡아내는 것**이 목적이다.
--
-- RLS는 기존 symptom_logs와 같은 방식 — 내 고양이의 기록만 보이고 쓸 수 있다.
--
-- Supabase SQL Editor에 붙여넣고 Run.
-- ─────────────────────────────────────────────────────────────

create table if not exists public.weight_logs (
  id          uuid primary key,
  cat_id      uuid not null references public.cats (id) on delete cascade,
  weight_kg   numeric(4,2) not null check (weight_kg > 0 and weight_kg <= 20),
  measured_at date not null,
  created_at  timestamptz not null default now()
);

create index if not exists weight_logs_cat_idx
  on public.weight_logs (cat_id, measured_at);

alter table public.weight_logs enable row level security;

drop policy if exists "weight_logs_own" on public.weight_logs;
create policy "weight_logs_own" on public.weight_logs
  for all
  using (exists (select 1 from public.cats c
                 where c.id = cat_id and c.owner_id = (select auth.uid())))
  with check (exists (select 1 from public.cats c
                      where c.id = cat_id and c.owner_id = (select auth.uid())));

-- 검증: 아래가 테이블명을 반환하면 성공
select tablename from pg_tables where tablename = 'weight_logs';
