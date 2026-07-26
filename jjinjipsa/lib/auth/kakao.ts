/*
 * 카카오 로그인 — 익명 계정을 "승격"시키는 방식.
 *
 * 왜 linkIdentity인가:
 * RLS가 `owner_id = auth.uid()`라서, 로그인하며 uid가 바뀌면 익명으로 남긴
 * 기록이 통째로 고아가 된다(= 집사 눈에는 기록이 사라진 것처럼 보인다).
 * linkIdentity는 **같은 uid를 유지한 채** 카카오 신원만 붙이므로 데이터가 그대로 남는다.
 *
 * signInWithOAuth는 새 계정을 만들기 때문에 마지막 수단으로만 쓴다.
 */

import { supabase } from "@/lib/supabase";

export type KakaoSignInResult =
  | { ok: true; mode: "linked" | "signed-in" }
  | { ok: false; message: string };

/** 이 카카오 계정이 이미 다른 계정에 붙어 있을 때 서버가 주는 신호 */
function isAlreadyLinked(message: string): boolean {
  const m = message.toLowerCase();
  return (
    m.includes("already") || m.includes("exists") || m.includes("identity_already")
  );
}

/**
 * 카카오로 로그인한다.
 * - 현재 익명 세션이면 linkIdentity로 승격(기록 유지)
 * - 익명이 아니거나 링크가 불가하면 일반 OAuth 로그인으로 폴백
 *
 * 성공 시 브라우저가 카카오로 리다이렉트되므로, 이 함수 뒤의 코드는
 * 대개 실행되지 않는다(반환값은 실패 처리를 위해 존재).
 */
export async function signInWithKakao(redirectTo?: string): Promise<KakaoSignInResult> {
  const options = { redirectTo: redirectTo ?? window.location.origin };

  const { data } = await supabase.auth.getUser();
  const isAnonymous = data.user?.is_anonymous === true;

  if (isAnonymous) {
    // 익명 → 카카오 승격. uid가 유지돼 기존 기록이 그대로 따라온다.
    const { error } = await supabase.auth.linkIdentity({ provider: "kakao", options });
    if (!error) return { ok: true, mode: "linked" };

    // 이 카카오 계정이 이미 쓰이고 있으면(다른 기기에서 먼저 가입) 링크가 안 된다.
    // 이때는 기존 계정으로 로그인시키고, 로컬에 남은 기록은 이관 로직이 따로 올린다.
    if (!isAlreadyLinked(error.message)) {
      return { ok: false, message: error.message };
    }
  }

  const { error } = await supabase.auth.signInWithOAuth({ provider: "kakao", options });
  if (error) return { ok: false, message: error.message };
  return { ok: true, mode: "signed-in" };
}
