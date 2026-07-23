"use client";

/* 하단 4탭 (홈 UX 개편) — 홈/냥박사/기록/우리 아이. 사진진단은 냥박사 카드로 통합 */

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { href: "/", icon: "🏠", label: "홈" },
  { href: "/chat", icon: "💬", label: "냥박사" },
  { href: "/records", icon: "📖", label: "기록" },
  { href: "/cats", icon: "🐱", label: "우리 아이" },
];

export default function BottomNav() {
  const pathname = usePathname();
  // 로그인·온보딩·챗 대화 화면(전체몰입)에서는 숨김
  if (
    pathname === "/login" ||
    pathname === "/onboard" ||
    /\/cats\/[^/]+\/chat$/.test(pathname)
  )
    return null;

  return (
    <nav className="sticky bottom-0 z-40 border-t border-hairline bg-canvas/95 backdrop-blur">
      <div className="mx-auto flex max-w-[420px] items-stretch justify-around px-2 pt-1.5 pb-[max(8px,env(safe-area-inset-bottom))]">
        {TABS.map((t) => {
          const active =
            t.href === "/" ? pathname === "/" : pathname.startsWith(t.href);
          return (
            <Link
              key={t.href}
              href={t.href}
              className="flex flex-1 flex-col items-center gap-0.5 py-1"
            >
              <span
                className={`text-[20px] transition-transform ${active ? "scale-110" : "opacity-55"}`}
              >
                {t.icon}
              </span>
              <span
                className={`text-[10px] font-semibold ${active ? "text-secondary" : "text-muted-soft"}`}
              >
                {t.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
