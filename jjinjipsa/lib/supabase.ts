/*
 * Supabase 클라이언트 (T-15) — 인증 + (T-16부터) 데이터 동기화.
 *
 * URL과 anon 키는 원래 브라우저에 공개되는 값이라 코드에 내장한다 (보호는 RLS가 담당).
 * 환경 변수가 있으면 우선하되, 비었거나 placeholder 오염값이면 내장값으로 폴백 —
 * Vercel 환경 변수 오설정("placeholder.supabase.co")으로 인한 장애를 원천 차단.
 */

import { createClient } from "@supabase/supabase-js";

const DEFAULT_URL = "https://ewdktvbhuwnayahevker.supabase.co";
const DEFAULT_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV3ZGt0dmJodXduYXlhaGV2a2VyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQ0MjcwOTYsImV4cCI6MjEwMDAwMzA5Nn0.HOg5pSiw3eyeqvCY5NktLalI6dMPnvQLxAWjqN90D6o";

function sane(value: string | undefined, fallback: string): string {
  if (!value || value.trim() === "" || value.includes("placeholder")) {
    return fallback;
  }
  return value.trim();
}

export const SUPABASE_URL = sane(process.env.NEXT_PUBLIC_SUPABASE_URL, DEFAULT_URL);
export const SUPABASE_ANON_KEY = sane(
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  DEFAULT_ANON_KEY,
);

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

/** 샌드박스 등 OAuth 불가 환경에서 로그인 게이트를 끄는 개발용 플래그 */
export const ALLOW_GUEST = process.env.NEXT_PUBLIC_ALLOW_GUEST === "1";
