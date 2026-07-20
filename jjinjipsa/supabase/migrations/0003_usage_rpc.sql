-- ─────────────────────────────────────────────────────────────
-- 0003: 챗봇 일일 사용량 원자적 증가 RPC (T-17 비용 통제)
-- 호출자(JWT)의 auth.uid() 기준으로 오늘 카운트를 +1 하고 새 값을 반환.
-- Supabase SQL Editor에 붙여넣고 Run.
-- ─────────────────────────────────────────────────────────────
create or replace function public.bump_chat_usage()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count integer;
begin
  insert into public.usage_counters (user_id, date, chat_count)
  values (auth.uid(), current_date, 1)
  on conflict (user_id, date)
  do update set chat_count = usage_counters.chat_count + 1
  returning chat_count into v_count;
  return v_count;
end;
$$;

-- 로그인(익명 포함) 사용자만 호출 가능
revoke all on function public.bump_chat_usage() from public, anon;
grant execute on function public.bump_chat_usage() to authenticated;

-- 검증: 아래가 1을 반환하면 성공 (SQL Editor는 service_role이라 auth.uid()가 null일 수 있음 —
-- 그 경우 에러 없이 함수가 생성됐는지만 확인하면 됩니다)
select proname from pg_proc where proname = 'bump_chat_usage';
