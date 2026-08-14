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
import type { User } from "@supabase/supabase-js";

export type KakaoSignInResult =
  | { ok: true; mode: "linked" | "signed-in" }
  /** 승격 불가 + 잃을 기록 있음 — 화면이 먼저 물어봐야 한다 */
  | { ok: false; needsConfirm: true; guestCats: number }
  | { ok: false; needsConfirm?: false; message: string };

/**
 * 로그인 전에 경고해야 하는가 (순수 함수 — scripts/test-auth-warning.mjs가 고정한다).
 *
 * 세 조건이 **모두** 맞을 때만 묻는다:
 *  - 지금 게스트(익명) 세션이고
 *  - 이 기기에 잃을 기록이 있고 (고양이 ≥ 1)
 *  - 이 브라우저에서 승격이 불가능하다고 이미 확인됐다
 *
 * 잃을 게 없으면 묻지 않는다 — 아무 일도 안 일어나는데 겁을 주는 꼴이다.
 * 승격이 될지 모르는 상태(첫 시도)에서도 묻지 않는다 — 대부분은 그냥 성공하고,
 * 실패는 리다이렉트 뒤에 recoverFromOAuthError가 받아서 그때 묻는다.
 */
export function shouldWarnBeforeKakao(input: {
  isAnonymous: boolean;
  catCount: number;
  linkUnavailable: boolean;
  force?: boolean;
}): boolean {
  if (input.force) return false;
  return input.isAnonymous && input.catCount > 0 && input.linkUnavailable;
}

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
export async function signInWithKakao(
  redirectTo?: string,
  opts?: { force?: boolean },
): Promise<KakaoSignInResult> {
  const options = { redirectTo: redirectTo ?? window.location.origin };

  const { data } = await supabase.auth.getUser();
  const isAnonymous = data.user?.is_anonymous === true;

  /*
   * 승격(linkIdentity)은 **지킬 기록이 있을 때만** 시도한다.
   * 이 카카오 계정이 이미 다른 계정에 붙어 있으면 승격은 실패하는데,
   * 지킬 게 없다면 그 실패를 감수할 이유가 없다 — 일반 로그인이 항상 통한다.
   */
  let catCount = 0;
  if (isAnonymous) {
    try {
      catCount = (await storage.listCats()).length;
    } catch {
      // 조회 실패 시엔 안전하게 '있다'로 본다 (승격 시도 + 경고 대상)
      catCount = 1;
    }
  }
  const hasDataToPreserve = catCount > 0;

  // 잃을 기록이 있는데 승격이 안 되는 상황이면, 조용히 갈아타지 않고 먼저 묻는다
  if (
    shouldWarnBeforeKakao({
      isAnonymous,
      catCount,
      linkUnavailable: linkKnownUnavailable(),
      force: opts?.force,
    })
  ) {
    return { ok: false, needsConfirm: true, guestCats: catCount };
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

export type OAuthRecovery =
  | { kind: "retrying" }
  /** 승격 불가 + 이 기기에 게스트 기록 있음 — 화면이 물어봐야 한다 */
  | { kind: "link-blocked"; guestCats: number }
  | null;

/**
 * 앱 진입 시 호출. 링크 실패로 돌아온 경우를 처리한다.
 *
 * `identity_already_exists` = 이 카카오 계정이 이미 다른(예전) 계정에 붙어 있다는 뜻.
 * 승격이 불가하므로 그 계정으로 로그인하는 수밖에 없는데, **그러면 지금 게스트 세션에
 * 쌓인 기록은 주인 없이 남는다.**
 *
 * 예전에는 여기서 조용히 일반 로그인으로 갈아탔다. 그 결과 집사 눈에는 "로그인했더니
 * 기록이 사라졌다"로만 보였다("나비" 사례). 그래서 **잃을 것이 있으면 자동으로 넘어가지
 * 않고 멈춰서 알린다.** 잃을 게 없으면(고양이 0마리) 예전처럼 한 번 자동 재시도한다 —
 * 아무 일도 안 일어나는데 확인 창을 띄울 이유가 없다.
 */
export async function recoverFromOAuthError(): Promise<OAuthRecovery> {
  const err = readOAuthError();
  if (!err) return null;

  clearOAuthErrorFromUrl();

  const alreadyLinked = isAlreadyLinked(err.code) || isAlreadyLinked(err.description);
  if (!alreadyLinked) {
    console.warn("[auth] 카카오 로그인 실패", err.code, err.description);
    return null;
  }

  // 링크가 불가하다는 걸 알았으니 기록해 둔다 (다음부터는 시도조차 하지 않는다)
  markLinkUnavailable();

  let guestCats = 0;
  try {
    guestCats = (await storage.listCats()).length;
  } catch {
    guestCats = 1; // 모르면 '있다'로 본다 — 조용히 잃는 쪽으로 기울지 않는다
  }
  if (guestCats > 0) return { kind: "link-blocked", guestCats };

  const retried = sessionStorage.getItem(RETRY_FLAG) === "1";
  if (retried) return null;

  sessionStorage.setItem(RETRY_FLAG, "1");
  const { error } = await supabase.auth.signInWithOAuth({
    provider: "kakao",
    options: { redirectTo: window.location.origin },
  });
  if (error) {
    console.warn("[auth] 폴백 로그인도 실패", error.message);
    return null;
  }
  return { kind: "retrying" };
}

/** 로그인에 성공했으면 재시도 플래그를 비운다 (링크 불가 표시는 사실이므로 유지) */
export function clearSignInRetryFlag(): void {
  if (typeof window !== "undefined") sessionStorage.removeItem(RETRY_FLAG);
}

/* ────────────────────────────────────────────────────────────────
 * 계정 바뀜 감지
 *
 * 카카오는 브라우저에 카카오계정 세션이 남아 있으면 계정 선택 화면 없이
 * 그 계정으로 바로 로그인시킨다. 카카오 계정이 여러 개인 집사가 로그아웃 후
 * 다시 로그인하면 **다른 계정으로 조용히 들어와서**, 고양이는 같은 이름으로
 * 보이는데 기록만 사라진 것처럼 보인다 (실사례: 오늘 상태 체크 증발 —
 * 실은 아침 계정과 재로그인 계정이 달랐다).
 *
 * 그래서 이 기기의 마지막 정식 로그인 계정을 기억해 두고, 다른 계정으로
 * 들어오면 알린다. 막지는 않는다 — 일부러 계정을 바꾸는 경우도 있다.
 * ──────────────────────────────────────────────────────────────── */

/** 이 기기의 마지막 정식 로그인 (localStorage — 로그아웃해도 남는다. 탈퇴 시엔 함께 지워진다) */
const LAST_ACCOUNT = "jjinjipsa:lastAccount";

type LastAccount = { uid: string; email: string | null };

export type AccountSwitch = "guest" | "first" | "same" | "switched";

/**
 * 지난 로그인과 비교한다 (순수 함수 — scripts/test-auth-warning.mjs가 고정한다).
 * 익명 세션은 비교 대상이 아니다 — 익명 uid는 기기·브라우저마다 갈리는 값이라
 * "바뀌었다"가 아무 정보도 주지 않는다.
 */
export function classifyAccountSwitch(input: {
  isAnonymous: boolean;
  prevUid: string | null;
  uid: string;
}): AccountSwitch {
  if (input.isAnonymous) return "guest";
  if (!input.prevUid) return "first";
  return input.prevUid === input.uid ? "same" : "switched";
}

/**
 * 표시용 이메일 — 카카오는 u.email을 비워 두고 identity_data로만 주는 경우가
 * 있어서 세 곳을 순서대로 본다 (설정 화면과 같은 규칙).
 */
export function resolveAccountEmail(u: User | null): string | null {
  if (!u) return null;
  const kakao = u.identities?.find((i) => i.provider === "kakao");
  return (
    u.email ||
    ((kakao?.identity_data?.email as string | undefined) || null) ||
    ((u.user_metadata?.email as string | undefined) || null)
  );
}

/**
 * 정식 로그인을 이 기기에 기록하고, 지난번과 다른 계정이면 알려준다.
 * 반환이 null이 아니면 화면(AuthGate)이 경고를 띄운다.
 */
export function noteAccountSwitch(
  u: User | null,
): { prevEmail: string | null; email: string | null } | null {
  if (typeof window === "undefined" || !u || u.is_anonymous !== false) return null;
  let prev: LastAccount | null = null;
  try {
    const raw = localStorage.getItem(LAST_ACCOUNT);
    prev = raw ? (JSON.parse(raw) as LastAccount) : null;
  } catch {
    prev = null; // 깨진 값은 첫 로그인처럼 다룬다 — 기록만 하고 경고하지 않는다
  }
  const email = resolveAccountEmail(u);
  const cls = classifyAccountSwitch({
    isAnonymous: false,
    prevUid: prev?.uid ?? null,
    uid: u.id,
  });
  try {
    localStorage.setItem(LAST_ACCOUNT, JSON.stringify({ uid: u.id, email }));
  } catch {
    /* 기록을 못 남기면 다음 로그인 때 경고를 못 할 뿐 — 화면을 막지 않는다 */
  }
  return cls === "switched" ? { prevEmail: prev?.email ?? null, email } : null;
}
