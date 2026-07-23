"use client";

/* 하단 4탭 — 홈/냥박사/기록/우리 아이. 채움형 아이콘 + 코랄 활성색 (핸드오프 §Bottom Navigation) */

import Link from "next/link";
import { usePathname } from "next/navigation";
import { IconHome, IconChat, IconRecord, IconCat } from "@/components/icons";

const TABS = [
  { href: "/", Icon: IconHome, label: "홈" },
  { href: "/chat", Icon: IconChat, label: "냥박사" },
  { href: "/records", Icon: IconRecord, label: "기록" },
  { href: "/cats", Icon: IconCat, label: "우리 아이" },
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
    <nav className="sticky bottom-0 z-40 border-t border-hairline bg-white/95 backdrop-blur">
      <div className="mx-auto flex max-w-[420px] items-stretch justify-around px-2 pt-2 pb-[max(8px,env(safe-area-inset-bottom))]">
        {TABS.map((t) => {
          const active =
            t.href === "/" ? pathname === "/" : pathname.startsWith(t.href);
          const { Icon } = t;
          return (
            <Link
              key={t.href}
              href={t.href}
              className={`flex flex-1 flex-col items-center gap-1 py-1 ${active ? "text-primary" : "text-[#9a918d]"}`}
            >
              <Icon size={24} />
              <span className="text-[12px] font-medium">{t.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
