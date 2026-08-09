"use client";

/* F-13' 카카오 로그인 (T-15) — 스플래시 겸 로그인 화면 */

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ALLOW_GUEST, supabase } from "@/lib/supabase";
import { signInWithKakao } from "@/lib/auth/kakao";
import { USE_SUPABASE } from "@/lib/storage";

export default function LoginPage() {
  const router = useRouter();
  const [error, setError] = useState("");

  // 이미 '진짜(비익명)' 로그인돼 있으면 홈으로.
  // 익명 세션은 누구에게나 있으므로 그것만으론 튕기지 않는다 (그래야 카카오 버튼을 누를 수 있음).
  useEffect(() => {
    void supabase.auth.getUser().then(({ data }) => {
      if (data.user && data.user.is_anonymous === false) router.replace("/");
    });
  }, [router]);

  async function onKakao() {
    setError("");
    // 익명 세션이면 linkIdentity로 승격해 기존 기록을 그대로 가져간다 (lib/auth/kakao)
    const res = await signInWithKakao();
    if (!res.ok) setError(`로그인에 실패했어요: ${res.message}`);
  }

  return (
    <main className="flex flex-1 flex-col justify-between px-6 py-12">
      <div className="flex flex-1 flex-col items-center justify-center gap-4 text-center">
        <span aria-hidden className="text-6xl">🐈</span>
        <h1 className="display text-[32px] text-rd-ink">찐집사</h1>
        <p className="display text-xl leading-snug text-rd-ink">
          갑자기 시작된 인연도,
          <br />
          오래도록 걱정 없이.
        </p>
        <p className="text-sm text-rd-body">
          내 고양이를 기억하는 건강 챗봇
        </p>
      </div>

      <div className="space-y-3">
        <button
          onClick={() => void onKakao()}
          className="flex h-13 w-full items-center justify-center gap-2 rounded-[14px] bg-[#FEE500] py-3.5 text-sm font-semibold text-rd-ink active:brightness-95"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
            <path d="M12 3C6.48 3 2 6.48 2 10.8c0 2.76 1.86 5.18 4.66 6.55l-.95 3.51c-.08.31.27.56.54.38l4.18-2.77c.51.06 1.03.13 1.57.13 5.52 0 10-3.48 10-7.8S17.52 3 12 3z" />
          </svg>
          카카오로 시작하기
        </button>
        {ALLOW_GUEST && (
          <button
            onClick={() => router.replace("/")}
            className="h-11 w-full rounded-[14px] border border-rd-line text-sm font-semibold text-rd-body"
          >
            (개발용) 로그인 없이 둘러보기
          </button>
        )}
        {error && (
          <p className="rounded-md border border-[#F0D5D2] bg-rd-danger/5 px-4 py-3 text-sm text-[#C4453A]">
            {error}
          </p>
        )}
        <p className="text-center text-xs leading-relaxed text-rd-faint">
          {USE_SUPABASE
            ? "로그인하면 기록이 계정에 보관돼 다른 기기에서도 이어볼 수 있어요."
            : "지금은 기록이 이 기기에만 저장돼요. 브라우저 데이터를 지우면 사라집니다."}
          <br />이 서비스의 정보는 참고용이며, 진단·처방은 수의사의 영역입니다.
        </p>
      </div>
    </main>
  );
}
