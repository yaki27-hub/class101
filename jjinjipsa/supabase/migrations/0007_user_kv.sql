-- 0007: 사용자 키-값 동기화 (QA 제보 #2 — "기록도 계정에 보관돼요"의 약속 이행)
--
-- 오늘 상태·케어 루틴·꼭 기억할 것(건강 메모)은 localStorage에만 있어서
-- 기기를 바꾸면 비어 보였다. 구조가 단순한 키-값이라 테이블을 셋 만들지 않고
-- localStorage 키를 그대로 미러링하는 한 테이블로 동기화한다.
-- (증상·체중·대화·생활기록부는 이미 전용 테이블로 동기화 중)

create table if not exists public.user_kv (
  user_id    uuid not null references auth.users (id) on delete cascade,
  key        text not null,
  value      text not null,
  updated_at timestamptz not null default now(),
  primary key (user_id, key)
);

alter table public.user_kv enable row level security;

drop policy if exists "user_kv_select_own" on public.user_kv;
create policy "user_kv_select_own" on public.user_kv
  for select using (auth.uid() = user_id);

drop policy if exists "user_kv_insert_own" on public.user_kv;
create policy "user_kv_insert_own" on public.user_kv
  for insert with check (auth.uid() = user_id);

drop policy if exists "user_kv_update_own" on public.user_kv;
create policy "user_kv_update_own" on public.user_kv
  for update using (auth.uid() = user_id);

drop policy if exists "user_kv_delete_own" on public.user_kv;
create policy "user_kv_delete_own" on public.user_kv
  for delete using (auth.uid() = user_id);
