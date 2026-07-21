"use client";

/* F-13' 카카오 로그인 (T-15) — 스플래시 겸 로그인 화면 */

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ALLOW_GUEST, supabase } from "@/lib/supabase";

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

  async function signInWithKakao() {
    setError("");
    // 표준 카카오 OAuth 로그인 (안정적). 익명 데이터 이관은 추후 별도 처리.
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "kakao",
      options: { redirectTo: window.location.origin },
    });
    if (error) setError(`로그인에 실패했어요: ${error.message}`);
  }

  return (
    <main className="flex flex-1 flex-col justify-between px-6 py-12">
      <div className="flex flex-1 flex-col items-center justify-center gap-4 text-center">
        <span aria-hidden className="text-6xl">🐈</span>
        <h1 className="display text-[32px] text-ink">찐집사</h1>
        <p className="display text-xl leading-snug text-ink">
          갑자기 시작된 인연도,
          <br />
          오래도록 걱정 없이.
        </p>
        <p className="text-sm text-body">
          내 고양이를 기억하는 건강 챗봇
        </p>
      </div>

      <div className="space-y-3">
        <button
          onClick={() => void signInWithKakao()}
          className="flex h-13 w-full items-center justify-center gap-2 rounded-md bg-[#FEE500] py-3.5 text-sm font-semibold text-ink active:brightness-95"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
            <path d="M12 3C6.48 3 2 6.48 2 10.8c0 2.76 1.86 5.18 4.66 6.55l-.95 3.51c-.08.31.27.56.54.38l4.18-2.77c.51.06 1.03.13 1.57.13 5.52 0 10-3.48 10-7.8S17.52 3 12 3z" />
          </svg>
          카카오로 시작하기
        </button>
        {ALLOW_GUEST && (
          <button
            onClick={() => router.replace("/")}
            className="h-11 w-full rounded-md border border-hairline text-sm font-semibold text-body"
          >
            (개발용) 로그인 없이 둘러보기
          </button>
        )}
        {error && (
          <p className="rounded-md border border-error/30 bg-error/5 px-4 py-3 text-sm text-error">
            {error}
          </p>
        )}
        <p className="text-center text-xs leading-relaxed text-muted-soft">
          로그인하면 기록이 계정에 안전하게 보관돼요.
          <br />이 서비스의 정보는 참고용이며, 진단·처방은 수의사의 영역입니다.
        </p>
      </div>
    </main>
  );
}
