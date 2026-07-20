"use client";

/*
 * 로그인 게이트 (T-15, F-13') — 세션 없으면 /login으로.
 * MVP는 카카오 로그인 필수 (D-00: 비로그인 체험 모드 없음).
 * ALLOW_GUEST=1인 개발 환경에서만 우회한다.
 */

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ALLOW_GUEST, supabase } from "@/lib/supabase";

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

  // 동기화용 Supabase 신원 확보: 세션 없으면 익명 로그인 (D-09)
  useEffect(() => {
    void supabase.auth.getSession().then(({ data }) => {
      if (!data.session) void supabase.auth.signInAnonymously().catch(() => {});
    });
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
