-- ─────────────────────────────────────────────────────────────
-- 찐집사 초기 스키마 (T-14) — Supabase SQL Editor에 붙여넣고 Run
-- 원칙(D-06): MVP는 개인용 RLS(본인 소유 행만). cats.household_id는
--             v1.1 가족 공유 대비 컬럼만 선반영 (지금은 사용 안 함).
-- ─────────────────────────────────────────────────────────────

-- 1) 프로필 (auth.users 1:1, 가입 시 자동 생성)
create table if not exists public.profiles (
  id         uuid primary key references auth.users (id) on delete cascade,
  nickname   text,
  created_at timestamptz not null default now()
);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, nickname)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'name', '집사'))
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- 2) 묘 프로필 (F-01)
create table if not exists public.cats (
  id              uuid primary key default gen_random_uuid(),
  owner_id        uuid not null references auth.users (id) on delete cascade,
  household_id    uuid,                       -- v1.1 가족 공유 대비 (현재 미사용)
  name            text not null,
  birth_date      date not null,
  birth_estimated boolean not null default false,
  gender          text not null default 'unknown'
                  check (gender in ('male', 'female', 'unknown')),
  neutered        boolean not null default false,
  breed_group     text not null,
  weight_kg       numeric(4, 1),
  conditions      text[] not null default '{}',
  indoor          boolean not null default true,
  avatar          jsonb,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
create index if not exists cats_owner_idx on public.cats (owner_id);

-- 3) 오늘의 체크 답변 (F-15, 습관 베이스라인)
create table if not exists public.trait_answers (
  id           uuid primary key default gen_random_uuid(),
  cat_id       uuid not null references public.cats (id) on delete cascade,
  question_key text not null,
  answer       text not null,
  answered_on  date not null,
  created_at   timestamptz not null default now()
);
create index if not exists trait_answers_cat_idx on public.trait_answers (cat_id, answered_on);

-- 4) 증상 기록 (F-05)
create table if not exists public.symptom_logs (
  id              uuid primary key default gen_random_uuid(),
  cat_id          uuid not null references public.cats (id) on delete cascade,
  tags            text[] not null default '{}',
  summary         text not null default '',
  source          text not null default 'manual' check (source in ('chat', 'manual')),
  chat_session_id uuid,
  occurred_at     timestamptz not null default now(),
  created_at      timestamptz not null default now()
);
create index if not exists symptom_logs_cat_idx on public.symptom_logs (cat_id, occurred_at);

-- 5) 챗봇 대화 (F-08)
create table if not exists public.chat_sessions (
  id         uuid primary key default gen_random_uuid(),
  cat_id     uuid not null references public.cats (id) on delete cascade,
  user_id    uuid not null references auth.users (id) on delete cascade,
  title      text not null default '',
  started_at timestamptz not null default now()
);
create index if not exists chat_sessions_cat_idx on public.chat_sessions (cat_id, started_at);

create table if not exists public.chat_messages (
  id         uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.chat_sessions (id) on delete cascade,
  role       text not null check (role in ('user', 'assistant')),
  content    text not null,
  image_url  text,
  model      text,
  created_at timestamptz not null default now()
);
create index if not exists chat_messages_session_idx on public.chat_messages (session_id, created_at);

-- 6) 비용 통제: 유저·일자별 챗봇 호출 수 (COST, 일 10회 한도)
create table if not exists public.usage_counters (
  user_id    uuid not null references auth.users (id) on delete cascade,
  date       date not null,
  chat_count integer not null default 0,
  primary key (user_id, date)
);

-- ─────────────────────────────────────────────────────────────
-- RLS — 전 테이블 활성화, "본인 소유 행만" (D-06)
-- ─────────────────────────────────────────────────────────────
alter table public.profiles       enable row level security;
alter table public.cats           enable row level security;
alter table public.trait_answers  enable row level security;
alter table public.symptom_logs   enable row level security;
alter table public.chat_sessions  enable row level security;
alter table public.chat_messages  enable row level security;
alter table public.usage_counters enable row level security;

-- profiles: 본인 행만
drop policy if exists "profiles_own" on public.profiles;
create policy "profiles_own" on public.profiles
  for all to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

-- cats: owner 본인만
drop policy if exists "cats_own" on public.cats;
create policy "cats_own" on public.cats
  for all to authenticated
  using (owner_id = (select auth.uid()))
  with check (owner_id = (select auth.uid()));

-- 자식 테이블: 소유한 고양이의 행만
drop policy if exists "trait_answers_own" on public.trait_answers;
create policy "trait_answers_own" on public.trait_answers
  for all to authenticated
  using (exists (select 1 from public.cats c
                 where c.id = cat_id and c.owner_id = (select auth.uid())))
  with check (exists (select 1 from public.cats c
                      where c.id = cat_id and c.owner_id = (select auth.uid())));

drop policy if exists "symptom_logs_own" on public.symptom_logs;
create policy "symptom_logs_own" on public.symptom_logs
  for all to authenticated
  using (exists (select 1 from public.cats c
                 where c.id = cat_id and c.owner_id = (select auth.uid())))
  with check (exists (select 1 from public.cats c
                      where c.id = cat_id and c.owner_id = (select auth.uid())));

-- chat_sessions: 세션 소유자만
drop policy if exists "chat_sessions_own" on public.chat_sessions;
create policy "chat_sessions_own" on public.chat_sessions
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

-- chat_messages: 소유한 세션의 메시지만
drop policy if exists "chat_messages_own" on public.chat_messages;
create policy "chat_messages_own" on public.chat_messages
  for all to authenticated
  using (exists (select 1 from public.chat_sessions s
                 where s.id = session_id and s.user_id = (select auth.uid())))
  with check (exists (select 1 from public.chat_sessions s
                      where s.id = session_id and s.user_id = (select auth.uid())));

-- usage_counters: 본인 행만 (증가는 서버(service_role)에서도 수행)
drop policy if exists "usage_counters_own" on public.usage_counters;
create policy "usage_counters_own" on public.usage_counters
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

-- ─────────────────────────────────────────────────────────────
-- 검증용 (Run 후 아래 셀렉트가 7줄을 반환하면 성공)
-- ─────────────────────────────────────────────────────────────
select tablename, rowsecurity
from pg_tables
where schemaname = 'public'
  and tablename in ('profiles','cats','trait_answers','symptom_logs',
                    'chat_sessions','chat_messages','usage_counters')
order by tablename;
