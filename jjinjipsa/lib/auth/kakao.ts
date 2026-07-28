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
import { storage } from "@/lib/storage";

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

  /*
   * 승격(linkIdentity)은 **지킬 기록이 있을 때만** 시도한다.
   * 이 카카오 계정이 이미 다른 계정에 붙어 있으면 승격은 실패하는데,
   * 지킬 게 없다면 그 실패를 감수할 이유가 없다 — 일반 로그인이 항상 통한다.
   */
  let hasDataToPreserve = false;
  if (isAnonymous) {
    try {
      hasDataToPreserve = (await storage.listCats()).length > 0;
    } catch {
      // 조회 실패 시엔 안전하게 '있다'로 보고 승격을 시도한다
      hasDataToPreserve = true;
    }
  }

  const skipLink =
    !isAnonymous ||
    !hasDataToPreserve ||
    // 이 브라우저에서 이미 "링크 불가"로 확인됐으면 또 시도하지 않는다.
    // 안 그러면 버튼을 누를 때마다 linkIdentity → 같은 에러 → 무한 반복이 된다.
    linkKnownUnavailable();

  if (!skipLink) {
    // 익명 → 카카오 승격. uid가 유지돼 기존 기록이 그대로 따라온다.
    const { error } = await supabase.auth.linkIdentity({ provider: "kakao", options });
    if (!error) return { ok: true, mode: "linked" };

    // 이 카카오 계정이 이미 쓰이고 있으면(다른 기기에서 먼저 가입) 링크가 안 된다.
    // 이때는 기존 계정으로 로그인시키고, 로컬에 남은 기록은 이관 로직이 따로 올린다.
    if (!isAlreadyLinked(error.message)) {
      return { ok: false, message: error.message };
    }
    markLinkUnavailable(); // 다음부터는 시도조차 하지 않는다
  }

  const { error } = await supabase.auth.signInWithOAuth({ provider: "kakao", options });
  if (error) return { ok: false, message: error.message };
  return { ok: true, mode: "signed-in" };
}

/* ────────────────────────────────────────────────────────────────
 * OAuth 콜백 에러 처리
 *
 * linkIdentity는 호출 즉시 카카오로 리다이렉트되기 때문에, 링크 실패는
 * 위 함수의 반환값이 아니라 **돌아온 URL에 실려서** 온다.
 *   /?error=server_error&error_code=identity_already_exists&...
 * 그래서 폴백을 함수 안에서만 처리하면 영영 실행되지 않는다 — 앱이 뜰 때
 * URL을 확인해 여기서 폴백을 태워야 한다.
 * ──────────────────────────────────────────────────────────────── */

const RETRY_FLAG = "jjinjipsa:kakaoSignInRetried";
/**
 * 이 브라우저에서 linkIdentity가 불가능하다고 확인된 상태.
 * (카카오 신원이 이미 다른 계정에 붙어 있음 — 아무리 눌러도 승격은 안 된다)
 * sessionStorage가 아니라 localStorage에 둬서 탭을 닫았다 열어도 유지한다.
 */
const LINK_UNAVAILABLE = "jjinjipsa:kakaoLinkUnavailable";

export function linkKnownUnavailable(): boolean {
  if (typeof window === "undefined") return false;
  return localStorage.getItem(LINK_UNAVAILABLE) === "1";
}

function markLinkUnavailable(): void {
  if (typeof window !== "undefined") localStorage.setItem(LINK_UNAVAILABLE, "1");
}

export interface OAuthCallbackError {
  code: string;
  description: string;
}

/** 현재 URL(쿼리·해시 양쪽)에서 OAuth 에러를 읽는다 */
export function readOAuthError(): OAuthCallbackError | null {
  if (typeof window === "undefined") return null;
  const q = new URLSearchParams(window.location.search);
  const h = new URLSearchParams(window.location.hash.replace(/^#/, ""));
  const code = q.get("error_code") ?? h.get("error_code");
  if (!code) return null;
  return {
    code,
    description: q.get("error_description") ?? h.get("error_description") ?? "",
  };
}

/** 주소창에서 에러 파라미터를 지운다 (새로고침할 때마다 다시 뜨지 않게) */
export function clearOAuthErrorFromUrl(): void {
  if (typeof window === "undefined") return;
  const url = new URL(window.location.href);
  for (const k of ["error", "error_code", "error_description", "sb"]) {
    url.searchParams.delete(k);
  }
  url.hash = "";
  window.history.replaceState({}, "", url.toString());
}

/**
 * 앱 진입 시 호출. 링크 실패로 돌아온 경우 **한 번만** 일반 로그인으로 재시도한다.
 *
 * `identity_already_exists` = 이 카카오 계정이 이미 다른(예전) 계정에 붙어 있다는 뜻.
 * 이 경우 승격은 불가하므로 그 계정으로 그냥 로그인시켜 준다.
 *
 * @returns 재시도를 걸었으면 true (곧 리다이렉트된다)
 */
export async function recoverFromOAuthError(): Promise<boolean> {
  const err = readOAuthError();
  if (!err) return false;

  clearOAuthErrorFromUrl();

  const alreadyLinked = isAlreadyLinked(err.code) || isAlreadyLinked(err.description);

  // 링크가 불가하다는 걸 알았으니 기록해 둔다.
  // 이후에는 버튼을 눌러도 linkIdentity를 건너뛰고 바로 일반 로그인으로 간다.
  if (alreadyLinked) markLinkUnavailable();

  const retried = sessionStorage.getItem(RETRY_FLAG) === "1";
  if (!alreadyLinked || retried) {
    // 다른 에러이거나 이미 한 번 자동 재시도했으면 여기서 멈춘다.
    // (수동으로 버튼을 누르면 위 플래그 덕분에 일반 로그인으로 정상 진행된다)
    console.warn("[auth] 카카오 로그인 실패", err.code, err.description);
    return false;
  }

  sessionStorage.setItem(RETRY_FLAG, "1");
  const { error } = await supabase.auth.signInWithOAuth({
    provider: "kakao",
    options: { redirectTo: window.location.origin },
  });
  if (error) {
    console.warn("[auth] 폴백 로그인도 실패", error.message);
    return false;
  }
  return true;
}

/** 로그인에 성공했으면 재시도 플래그를 비운다 (링크 불가 표시는 사실이므로 유지) */
export function clearSignInRetryFlag(): void {
  if (typeof window !== "undefined") sessionStorage.removeItem(RETRY_FLAG);
}
