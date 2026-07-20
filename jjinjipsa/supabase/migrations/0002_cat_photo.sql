-- ─────────────────────────────────────────────────────────────
-- 0002: cats에 사진·AI 일러스트 컬럼 추가 (D-08/T-22, T-25)
-- Supabase SQL Editor에 붙여넣고 Run.
-- ─────────────────────────────────────────────────────────────
alter table public.cats add column if not exists photo  text;
alter table public.cats add column if not exists illust text;

-- 검증: 두 컬럼이 보이면 성공
select column_name
from information_schema.columns
where table_schema = 'public' and table_name = 'cats'
  and column_name in ('photo', 'illust')
order by column_name;
