-- ─────────────────────────────────────────────────────────────
-- 0004: IP 기준 일일 사용량 상한 (비용 통제 보강)
--
-- 배경: 0003의 계정 기준 한도는 우회가 쉽다.
--   ① Authorization 헤더를 안 보내면 서버가 통과시킨다
--   ② 사이트 데이터를 지우면 새 익명 계정이 생겨 한도가 초기화된다
-- 그래서 **토큰 유무와 무관하게** 걸리는 상한이 하나 더 필요하다.
--
-- 개인정보: 원본 IP를 저장하지 않는다. 서버에서 솔트를 섞어 해시한 값만 넣는다.
--
-- Supabase SQL Editor에 붙여넣고 Run.
-- ─────────────────────────────────────────────────────────────

create table if not exists public.ip_usage_counters (
  ip_hash    text    not null,
  date       date    not null default current_date,
  chat_count integer not null default 0,
  primary key (ip_hash, date)
);

-- 이 테이블은 RPC로만 접근한다. 직접 select/insert는 막는다.
alter table public.ip_usage_counters enable row level security;
-- (정책을 만들지 않으면 anon/authenticated는 아무 행도 못 본다 — 의도된 동작)

create or replace function public.bump_ip_usage(p_ip_hash text)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count integer;
begin
  if p_ip_hash is null or length(p_ip_hash) < 16 then
    -- 해시가 없거나 이상하면 카운트하지 않는다 (0을 돌려 통과시킨다)
    return 0;
  end if;

  insert into public.ip_usage_counters (ip_hash, date, chat_count)
  values (p_ip_hash, current_date, 1)
  on conflict (ip_hash, date)
  do update set chat_count = ip_usage_counters.chat_count + 1
  returning chat_count into v_count;

  return v_count;
end;
$$;

-- 비로그인(anon) 호출도 카운트해야 하므로 anon에도 실행 권한을 준다.
revoke all on function public.bump_ip_usage(text) from public;
grant execute on function public.bump_ip_usage(text) to anon, authenticated;

-- 오래된 행 정리용 (선택) — 30일 지난 카운터는 지워도 된다.
-- delete from public.ip_usage_counters where date < current_date - 30;

-- 검증: 아래가 함수명을 반환하면 성공
select proname from pg_proc where proname = 'bump_ip_usage';
