-- ─────────────────────────────────────────────────────────────
-- 0006: 고양이 별명 (개체 혼동 방지)
--
-- 달씨 상담창에서 "로마 비만일까?"라고 물으면 달씨 기준으로 답하던 버그의
-- 일부. 집사들은 이름을 줄이거나 바꿔 부르므로(로매↔로마), 별명을 알아야
-- 질문이 다른 아이 이야기인지 감지할 수 있다.
--
-- Supabase SQL Editor에 붙여넣고 Run.
-- ⚠️ 이 마이그레이션을 실행하기 전에는 프로필 저장이 실패한다
--    (saveCat이 aliases 컬럼에 쓰기 때문).
-- ─────────────────────────────────────────────────────────────

alter table public.cats
  add column if not exists aliases jsonb not null default '[]'::jsonb;

-- 검증: 아래가 컬럼명을 반환하면 성공
select column_name from information_schema.columns
 where table_name = 'cats' and column_name = 'aliases';
