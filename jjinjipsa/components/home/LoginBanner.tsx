"use client";

/*
 * 홈 로그인 유도 배너 (value-first) — 익명(게스트) 세션일 때만 노출.
 * 카카오 로그인하면 사라지고, 닫으면 그 세션 동안만 숨긴다(재접속 시 다시).
 * D-00의 "비로그인 체험 금지"를 강제 게이트 대신 '먼저 써보고 유도'로 완화.
 */

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { signInWithKakao } from "@/lib/auth/kakao";
import { USE_SUPABASE } from "@/lib/storage";
import { IconClose } from "@/components/icons";

const DISMISS_KEY = "jjinjipsa:loginBannerDismissed";

export default function LoginBanner() {
  // null = 판별 전(렌더 보류, 깜빡임 방지), true = 게스트, false = 로그인됨
  const [guest, setGuest] = useState<boolean | null>(null);
  const [dismissed, setDismissed] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (typeof window !== "undefined") {
      setDismissed(sessionStorage.getItem(DISMISS_KEY) === "1");
    }
    let cancelled = false;
    void supabase.auth.getUser().then(({ data }) => {
      if (cancelled) return;
      const u = data.user;
      // 세션이 없거나(아직 익명 로그인 전) 익명이면 게스트로 본다
      setGuest(!u || u.is_anonymous !== false);
    });
    // 로그인 성공 시 실시간으로 배너 감춤
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      setGuest(!session?.user || session.user.is_anonymous !== false);
    });
    return () => {
      cancelled = true;
      sub.subscription.unsubscribe();
    };
  }, []);

  async function onKakao() {
    setError("");
    // 익명 세션이면 승격(linkIdentity)해 지금까지의 기록을 그대로 가져간다
    const res = await signInWithKakao();
    if (!res.ok) setError("로그인에 실패했어요. 잠시 후 다시 시도해 주세요.");
  }

  function close() {
    setDismissed(true);
    if (typeof window !== "undefined") sessionStorage.setItem(DISMISS_KEY, "1");
  }

  if (guest !== true || dismissed) return null;

  return (
    <section className="relative rounded-card border border-hairline bg-white p-4">
      <button
        type="button"
        onClick={close}
        aria-label="로그인 안내 닫기"
        className="absolute right-2.5 top-2.5 flex size-7 items-center justify-center rounded-full text-muted-soft active:bg-surface-soft"
      >
        <IconClose size={16} />
      </button>

      <p className="pr-7 text-[13px] leading-relaxed text-body">
        지금은 <b className="text-secondary">게스트</b>로 이용 중이에요.
        <br />
        {USE_SUPABASE
          ? "카카오로 로그인하면 지금까지의 기록이 계정에 그대로 보관돼요."
          : "기록은 이 기기에만 저장돼요. 로그인해 두면 나중에 계정으로 이어받을 수 있어요."}
      </p>

      <button
        type="button"
        onClick={() => void onKakao()}
        className="mt-3 flex h-11 w-full items-center justify-center gap-2 rounded-button bg-[#FEE500] text-sm font-bold text-[#3A1D1D] active:brightness-95"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
          <path d="M12 3C6.48 3 2 6.48 2 10.8c0 2.76 1.86 5.18 4.66 6.55l-.95 3.51c-.08.31.27.56.54.38l4.18-2.77c.51.06 1.03.13 1.57.13 5.52 0 10-3.48 10-7.8S17.52 3 12 3z" />
        </svg>
        카카오로 로그인하기
      </button>

      {error && (
        <p className="mt-2 text-center text-[12px] text-error">{error}</p>
      )}
    </section>
  );
}
