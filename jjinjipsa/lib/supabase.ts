/*
 * Supabase 클라이언트 (T-15) — 인증 + (T-16부터) 데이터 동기화.
 * anon 키는 공개용 키이며, 데이터 보호는 RLS(0001_init.sql)가 담당한다.
 */

import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!url || !anonKey) {
  // 빌드는 통과시키되, 런타임에서 명확히 알린다
  console.warn("[supabase] NEXT_PUBLIC_SUPABASE_URL / ANON_KEY가 비어 있습니다.");
}

// createClient는 빈 URL을 받으면 throw하므로, 미설정 시 자리표시자로 빌드를 통과시킨다
export const supabase = createClient(
  url ?? "https://placeholder.supabase.co",
  anonKey ?? "placeholder-anon-key",
);

/** 샌드박스 등 OAuth 불가 환경에서 로그인 게이트를 끄는 개발용 플래그 */
export const ALLOW_GUEST = process.env.NEXT_PUBLIC_ALLOW_GUEST === "1";
