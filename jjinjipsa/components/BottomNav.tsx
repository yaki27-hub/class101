"use client";

/*
 * 하단 내비 — 모카 리스킨: 검정 알약 → 흰 바 + 4탭 전부 라벨 (피그마 시안).
 *
 * 활성 탭은 모카 그린 + 라벨 아래 점. 알약과 달리 비활성 탭도 라벨을 남긴다 —
 * 아이콘만으로는 "냥박사톡"과 "기록"이 구분되지 않는다는 시안 결정.
 *
 * 탭 구성은 피그마의 4탭(오늘·냥박사톡·기록·정보)을 따르되 경로는 기존 그대로다.
 * "정보"는 아이 자체(/cats)로 간다 — 설정은 상단 기어(TopBar)가 가져갔지만,
 * TopBar가 아직 없는 화면을 위해 /account 경로도 이 탭의 활성 범위에 넣는다.
 */

import Link from "next/link";
import { usePathname } from "next/navigation";
import { IconHome, IconChat, IconRecord, IconCat } from "@/components/icons";

const TABS = [
  { href: "/", match: (p: string) => p === "/", Icon: IconHome, label: "오늘" },
  {
    href: "/chat",
    match: (p: string) => p.startsWith("/chat") || /\/cats\/[^/]+\/chat/.test(p),
    Icon: IconChat,
    label: "냥박사톡",
  },
  {
    href: "/records",
    match: (p: string) => p.startsWith("/records"),
    Icon: IconRecord,
    label: "기록",
  },
  {
    href: "/cats",
    match: (p: string) => p.startsWith("/cats") || p.startsWith("/account"),
    Icon: IconCat,
    label: "정보",
  },
];

export default function BottomNav() {
  const pathname = usePathname();
  /*
   * 숨김 — 로그인·온보딩·대화(전체몰입)에 더해 고양이 상세를 추가한다.
   * 상세는 하단에 고정 CTA("냥박사에게 물어보기")가 있어서 바와 겹친다.
   */
  if (
    pathname === "/login" ||
    pathname === "/onboard" ||
    /^\/cats\/[^/]+$/.test(pathname) ||
    /\/cats\/[^/]+\/chat$/.test(pathname) ||
    // 생활기록부는 자체 스티키 CTA가 있다 — 바와 겹치면 CTA를 가린다
    /\/cats\/[^/]+\/report$/.test(pathname)
  )
    return null;

  return (
    <nav className="pointer-events-none sticky bottom-0 z-40 nav-overlay">
      <div className="pointer-events-auto flex items-start justify-around border-t border-rd-line bg-white pt-2 pb-[max(10px,env(safe-area-inset-bottom))]">
        {TABS.map((t) => {
          const active = t.match(pathname);
          const { Icon } = t;
          return (
            <Link
              key={t.href}
              href={t.href}
              aria-current={active ? "page" : undefined}
              className={`flex min-w-16 flex-col items-center gap-1 ${
                active ? "text-rd-forest" : "text-rd-muted"
              }`}
            >
              <Icon size={21} dotFill="#fff" />
              <span
                className={`text-[11px] tracking-[-0.01em] ${
                  active ? "font-bold" : "font-medium"
                }`}
              >
                {t.label}
              </span>
              {/* 활성 점 — 라벨 아래. 색만으로 활성을 말하지 않는다 */}
              <span
                aria-hidden
                className={`size-1 rounded-full ${active ? "bg-rd-forest" : "bg-transparent"}`}
              />
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
