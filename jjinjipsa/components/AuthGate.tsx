"use client";

/*
 * 로그인 게이트 (T-15, F-13') — 세션 없으면 /login으로.
 * MVP는 카카오 로그인 필수 (D-00: 비로그인 체험 모드 없음).
 * ALLOW_GUEST=1인 개발 환경에서만 우회한다.
 */

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ALLOW_GUEST, supabase } from "@/lib/supabase";
import { USE_SUPABASE } from "@/lib/storage";
import { migrateLocalToServer } from "@/lib/storage/migrateLocal";
import { hydrateKv } from "@/lib/kvSync";
import { trackOncePerDay } from "@/lib/analytics";
import {
  clearSignInRetryFlag,
  recoverFromOAuthError,
  signInWithKakao,
} from "@/lib/auth/kakao";
import GuestDataWarning from "@/components/auth/GuestDataWarning";

/**
 * 임시(D-07): 카카오 로그인 검증이 끝날 때까지 게이트를 기본 OFF.
 * NEXT_PUBLIC_REQUIRE_AUTH=1 을 넣으면 다시 로그인 필수로 전환된다.
 */
const REQUIRE_AUTH = process.env.NEXT_PUBLIC_REQUIRE_AUTH === "1";

export default function AuthGate({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [ready, setReady] = useState(false);
  /** 승격 불가로 멈춘 상태 — 게스트 기록을 잃기 전에 물어본다 */
  const [linkBlocked, setLinkBlocked] = useState<number | null>(null);
  const [proceeding, setProceeding] = useState(false);

  // 동기화용 Supabase 신원 확보: 세션 없으면 익명 로그인 (D-09).
  // 단, OAuth 콜백 처리 중(URL에 토큰/코드)에는 건너뛴다 — 카카오 로그인이
  // 완료되기 전에 익명 로그인이 덮어쓰는 경쟁 상태 방지 (T-15).
  useEffect(() => {
    const inOAuthCallback =
      typeof window !== "undefined" &&
      (window.location.hash.includes("access_token") ||
        new URLSearchParams(window.location.search).has("code"));
    if (inOAuthCallback) return;

    // 링크 실패로 돌아온 경우 먼저 복구한다.
    // (linkIdentity는 바로 리다이렉트되므로 실패가 URL로 온다 — lib/auth/kakao 참고)
    void recoverFromOAuthError().then((r) => {
      if (r?.kind === "link-blocked") setLinkBlocked(r.guestCats);
      if (r?.kind === "retrying") return; // 곧 카카오로 다시 넘어간다
      void supabase.auth.getSession().then(({ data }) => {
        if (!data.session) void supabase.auth.signInAnonymously().catch(() => {});
        // 정식 계정으로 들어왔으면 재시도 플래그를 비워 다음 로그인에 영향 없게 한다
        if (data.session?.user && data.session.user.is_anonymous === false) {
          clearSignInRetryFlag();
        }
      });
    });
  }, []);

  // 동기화가 켜져 있으면, 켜기 전에 브라우저에만 쌓였던 기록을 계정으로 한 번 올린다.
  // 이걸 안 하면 동기화를 켜는 순간 예전 기록이 사라진 것처럼 보인다.
  //
  // **이관이 끝나기 전에는 화면을 그리지 않는다.** 앱은 서버에서 읽으므로,
  // 업로드 전에 렌더하면 "기록 0건"이 잠깐 보였다가 나타나 집사를 놀라게 한다.
  const [migrating, setMigrating] = useState(USE_SUPABASE);
  // 이관 결과 안내 — 조용히 실패하면 집사는 기록이 사라졌다고 느낀다 (QA 제보)
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    if (!notice) return;
    const t = setTimeout(() => setNotice(null), 6000);
    return () => clearTimeout(t);
  }, [notice]);

  useEffect(() => {
    if (!USE_SUPABASE) return;
    let done = false;
    const run = async (uid: string) => {
      try {
        const r = await migrateLocalToServer(uid);
        if (r.ran && (r.cats || r.failed)) {
          console.info("[migrate] 로컬→서버 이관", r);
          const moved =
            r.cats + r.traits + r.symptoms + r.weights + r.sessions + r.messages;
          if (r.failed === 0 && moved > 0) {
            setNotice(`이 기기의 예전 기록 ${moved}건을 계정으로 옮겼어요.`);
          } else if (r.failed > 0) {
            setNotice(
              r.gaveUp
                ? "예전 기록 일부를 계정으로 옮기지 못했어요. 기록은 이 기기에 남아 있어요."
                : "예전 기록 일부를 옮기지 못했어요. 다음 접속에 다시 시도할게요.",
            );
          }
        }
        // 오늘 상태·루틴·메모를 계정에서 내려받는다 (기기 간 동기화, 0007)
        await hydrateKv(uid);
        // 리텐션의 기준선 — "그날 앱을 열었는가" 하루 한 번 (0008, docs/지표.md)
        trackOncePerDay("app_open");
      } catch (e) {
        // 실패해도 화면은 열어준다 — 완료 표시를 안 남기므로 다음 실행에 재시도한다
        console.warn("[migrate] 실패 — 다음 실행에 재시도", e);
      } finally {
        if (!done) {
          done = true;
          setMigrating(false);
        }
      }
    };

    void supabase.auth.getUser().then(({ data }) => {
      if (data.user) void run(data.user.id);
      else setMigrating(false); // 아직 세션이 없으면 아래 onAuthStateChange가 받는다
    });
    // 카카오 승격 직후에도 한 번 더 (uid가 그대로여도 세션 교체 시점을 놓치지 않게)
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      if (session?.user) void run(session.user.id);
    });
    // 서버가 느리거나 응답이 없어도 화면이 영원히 막히지 않게 상한을 둔다
    const timer = setTimeout(() => {
      if (!done) {
        done = true;
        setMigrating(false);
      }
    }, 8000);
    return () => {
      clearTimeout(timer);
      sub.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!REQUIRE_AUTH || ALLOW_GUEST) {
      setReady(true);
      return;
    }
    let cancelled = false;

    void supabase.auth.getSession().then(({ data }) => {
      if (cancelled) return;
      if (!data.session && pathname !== "/login") {
        router.replace("/login");
      } else {
        setReady(true);
      }
    });

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session && pathname !== "/login") router.replace("/login");
    });
    return () => {
      cancelled = true;
      sub.subscription.unsubscribe();
    };
  }, [pathname, router]);

  // 로그인 페이지는 항상 렌더, 그 외엔 세션 확인 + 이관 완료 후 렌더 (깜빡임 방지)
  if (pathname !== "/login" && (!ready || migrating)) return null;
  return (
    <>
      {children}
      {linkBlocked !== null && (
        <GuestDataWarning
          guestCats={linkBlocked}
          busy={proceeding}
          onCancel={() => setLinkBlocked(null)}
          onProceed={() => {
            setProceeding(true);
            void signInWithKakao(undefined, { force: true }).then((res) => {
              if (!res.ok) setProceeding(false);
            });
          }}
        />
      )}
      {notice && (
        <div
          role="status"
          className="fixed bottom-24 left-1/2 z-[70] w-[calc(100%-48px)] max-w-[372px] -translate-x-1/2 rounded-2xl bg-rd-ink px-4 py-3 text-[13px] font-semibold leading-relaxed text-white shadow-[0_10px_26px_-8px_rgba(0,0,0,.4)]"
          onClick={() => setNotice(null)}
        >
          {notice}
        </div>
      )}
    </>
  );
}
