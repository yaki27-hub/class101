"use client";

/*
 * 로그인 게이트 (T-15, F-13') — 세션 없으면 /login으로.
 * MVP는 카카오 로그인 필수 (D-00: 비로그인 체험 모드 없음).
 * ALLOW_GUEST=1인 개발 환경에서만 우회한다.
 */

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ALLOW_GUEST, supabase } from "@/lib/supabase";

export default function AuthGate({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (ALLOW_GUEST) {
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
