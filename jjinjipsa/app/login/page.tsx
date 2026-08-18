"use client";

/* F-13' 카카오 로그인 (T-15) — 스플래시 겸 로그인 화면 */

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ALLOW_GUEST, supabase } from "@/lib/supabase";
import { signInWithKakao } from "@/lib/auth/kakao";
import GuestDataWarning from "@/components/auth/GuestDataWarning";
import { USE_SUPABASE } from "@/lib/storage";

export default function LoginPage() {
  const router = useRouter();
  const [error, setError] = useState("");
  const [warnCats, setWarnCats] = useState<number | null>(null);
  /*
   * 히어로 이미지는 마운트 후에만 렌더한다 — 이 페이지는 정적 프리렌더라
   * 하이드레이션 전에 이미지 로드 실패 이벤트가 지나가면 onError가 못 잡아서
   * 깨진 이미지 아이콘이 남는다. 마운트 후 렌더면 핸들러가 처음부터 붙는다.
   */
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  // 이미 '진짜(비익명)' 로그인돼 있으면 홈으로.
  // 익명 세션은 누구에게나 있으므로 그것만으론 튕기지 않는다 (그래야 카카오 버튼을 누를 수 있음).
  useEffect(() => {
    void supabase.auth.getUser().then(({ data }) => {
      if (data.user && data.user.is_anonymous === false) router.replace("/");
    });
  }, [router]);

  async function onKakao(force = false) {
    setError("");
    // 익명 세션이면 linkIdentity로 승격해 기존 기록을 그대로 가져간다 (lib/auth/kakao)
    const res = await signInWithKakao(undefined, { force });
    if (res.ok) return;
    if (res.needsConfirm) return setWarnCats(res.guestCats); // 잃을 게 있으면 먼저 묻는다
    setError(`로그인에 실패했어요: ${res.message}`);
  }

  return (
    <main className="flex flex-1 flex-col justify-between pb-12">
      {/*
       * 방 일러스트 히어로 (피그마 모카 시안) — 그림이 크림으로 녹고 그 위에 브랜드.
       * 에셋(/scenes/moka-login.png)이 아직 없으면 이미지만 조용히 사라지고
       * 크림 배경 위 텍스트 레이아웃은 그대로 동작한다.
       */}
      <div className="relative -mx-0">
        <div className="relative h-[46vh] min-h-[300px] w-full overflow-hidden">
          {mounted && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src="/scenes/moka-login.png"
              alt=""
              aria-hidden
              onError={(e) => {
                e.currentTarget.style.display = "none";
              }}
              className="absolute inset-0 size-full object-cover"
              style={{ objectPosition: "center 30%" }}
            />
          )}
          <div
            aria-hidden
            className="absolute inset-x-0 bottom-0 h-[45%]"
            style={{
              background:
                "linear-gradient(180deg, rgba(245,243,239,0) 0%, rgba(245,243,239,.7) 60%, #f5f3ef 100%)",
            }}
          />
        </div>
        <div className="px-6 pt-2">
          <h1 className="display text-[32px] text-rd-ink">찐집사</h1>
          {/* 피그마 모카 시안 카피 — "기억하는 챗봇"보다 "함께 알아가는" 쪽으로 */}
          <p className="mt-2 text-[17px] leading-relaxed font-medium text-rd-body">
            우리 아이의 건강정보, 평소
            <br />
            상태들을 함께 알아가요.
          </p>
        </div>
      </div>

      <div className="space-y-3 px-6">
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

      {warnCats !== null && (
        <GuestDataWarning
          guestCats={warnCats}
          onCancel={() => setWarnCats(null)}
          onProceed={() => {
            setWarnCats(null);
            void onKakao(true);
          }}
        />
      )}
    </main>
  );
}
