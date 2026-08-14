-- 0008: 제품 지표 이벤트 (지시서 Phase 4 — 리텐션 확인 후 수익화)
--
-- 외부 분석 도구를 붙이지 않는다. ①이미 Supabase를 쓰고 ②이 앱은 건강 기록을 다루므로
-- 사용자 행동을 제3자에게 넘기지 않는 편이 낫다. 집계는 SQL Editor에서 직접 한다
-- (docs/지표.md에 KPI별 쿼리가 있다).
--
-- **본문을 저장하지 않는다.** props에는 개수·구분값만 넣는다 — 고양이 이름, 메모,
-- 질문 내용은 절대 들어가지 않는다 (lib/analytics.ts가 화이트리스트로 강제).

create table if not exists public.analytics_events (
  id         bigserial primary key,
  user_id    uuid references auth.users (id) on delete set null,
  name       text not null,
  props      jsonb not null default '{}'::jsonb,
  -- 로컬 날짜(한국 기준 하루)로 집계하려고 클라이언트가 채운다. created_at은 UTC 시각
  day        date not null,
  created_at timestamptz not null default now()
);

create index if not exists analytics_events_name_day_idx
  on public.analytics_events (name, day);
create index if not exists analytics_events_user_day_idx
  on public.analytics_events (user_id, day);

alter table public.analytics_events enable row level security;

-- 쓰기만 허용한다. 읽기 정책은 두지 않는다 —
-- 남의 행동 로그를 앱에서 읽을 이유가 없고, 집계는 service_role(SQL Editor)이 한다.
drop policy if exists "analytics_insert_own" on public.analytics_events;
create policy "analytics_insert_own" on public.analytics_events
  for insert with check (auth.uid() = user_id);
