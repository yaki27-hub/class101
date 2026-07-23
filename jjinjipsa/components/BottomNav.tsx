"use client";

/* 하단 5탭 (D-10) — 홈/AI상담/사진진단/건강기록/우리고양이 */

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { href: "/", icon: "🏠", label: "홈" },
  { href: "/chat", icon: "💬", label: "AI 상담" },
  { href: "/diagnose", icon: "📷", label: "사진 진단" },
  { href: "/records", icon: "📖", label: "건강 기록" },
  { href: "/cats", icon: "🐱", label: "우리 고양이" },
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
