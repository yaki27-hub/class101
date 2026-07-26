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

  // 동기화용 Supabase 신원 확보: 세션 없으면 익명 로그인 (D-09).
  // 단, OAuth 콜백 처리 중(URL에 토큰/코드)에는 건너뛴다 — 카카오 로그인이
  // 완료되기 전에 익명 로그인이 덮어쓰는 경쟁 상태 방지 (T-15).
  useEffect(() => {
    const inOAuthCallback =
      typeof window !== "undefined" &&
      (window.location.hash.includes("access_token") ||
        new URLSearchParams(window.location.search).has("code"));
    if (inOAuthCallback) return;
    void supabase.auth.getSession().then(({ data }) => {
      if (!data.session) void supabase.auth.signInAnonymously().catch(() => {});
    });
  }, []);

  // 동기화가 켜져 있으면, 켜기 전에 브라우저에만 쌓였던 기록을 계정으로 한 번 올린다.
  // 이걸 안 하면 동기화를 켜는 순간 예전 기록이 사라진 것처럼 보인다.
  useEffect(() => {
    if (!USE_SUPABASE) return;
    const run = (uid: string) => {
      void migrateLocalToServer(uid)
        .then((r) => {
          if (r.ran && (r.cats || r.failed)) {
            console.info("[migrate] 로컬→서버 이관", r);
          }
        })
        .catch((e) => console.warn("[migrate] 실패 — 다음 실행에 재시도", e));
    };
    void supabase.auth.getUser().then(({ data }) => {
      if (data.user) run(data.user.id);
    });
    // 카카오 승격 직후에도 한 번 더 (uid가 그대로여도 세션 교체 시점을 놓치지 않게)
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      if (session?.user) run(session.user.id);
    });
    return () => sub.subscription.unsubscribe();
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

  // 로그인 페이지는 항상 렌더, 그 외엔 세션 확인 후 렌더 (깜빡임 방지)
  if (pathname !== "/login" && !ready) return null;
  return <>{children}</>;
}
