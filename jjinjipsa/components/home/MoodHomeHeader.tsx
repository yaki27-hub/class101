"use client";

/*
 * 홈 헤더 — 히어로 씬 위에 떠 있는 크롬.
 *
 * 칩 배경이 **어두운** 글래스인 것이 핵심이다. 흰 반투명으로 하면 밝은 씬 위에서
 * 흰 글자 뒤 배경을 오히려 더 밝게 만들어, 스크림을 아무리 올려도 대비가 상쇄된다.
 */

import Link from "next/link";
import { IconYarn } from "@/components/icons";
import CatAvatar from "@/components/CatAvatar";
import type { Cat } from "@/lib/storage";

const GLASS = "rgba(10,20,16,.36)";
const GLASS_CHIP = "rgba(10,20,16,.42)";

export default function MoodHomeHeader({
  cat,
  catHref,
  onOpenSelector,
}: {
  /** 지금 보고 있는 아이 — 칩에 사진(아바타)을 함께 보여 "누구 화면인지" 잇는다 */
  cat: Pick<Cat, "id" | "name" | "photo">;
  /** 발바닥 버튼 — 지금 보고 있는 아이의 프로필 */
  catHref: string;
  onOpenSelector: () => void;
}) {
  const catName = cat.name;
  return (
    <header className="pointer-events-none absolute inset-x-0 top-0 z-30 pt-[max(12px,env(safe-area-inset-top))]">
      <div className="flex h-13 items-center justify-between px-4">
        {/* 우리 아이 목록 */}
        <Link
          href="/cats"
          aria-label="우리 아이 목록"
          className="pointer-events-auto flex size-9.5 items-center justify-center rounded-full backdrop-blur-lg"
          style={{ background: GLASS }}
        >
          <svg width="19" height="19" viewBox="0 0 24 24" fill="#fff" aria-hidden>
            <rect x="3.5" y="5.6" width="17" height="2.6" rx="1.3" />
            <rect x="3.5" y="10.7" width="17" height="2.6" rx="1.3" />
            <rect x="3.5" y="15.8" width="11" height="2.6" rx="1.3" />
          </svg>
        </Link>

        {/* 보고 있는 아이 — 누르면 전환 시트 */}
        <button
          type="button"
          onClick={onOpenSelector}
          className="pointer-events-auto flex items-center gap-1.5 rounded-full py-1.5 pr-3.5 pl-1.5 text-[14px] font-bold tracking-[-0.02em] text-white backdrop-blur-lg"
          style={{ background: GLASS_CHIP }}
        >
          <CatAvatar cat={cat} size={26} radius={13} />
          {catName}
          <svg width="11" height="7" viewBox="0 0 12 8" fill="#fff" aria-hidden>
            <path d="M1.1 1.4a1.2 1.2 0 0 1 1.7 0L6 4.5l3.2-3.1a1.2 1.2 0 1 1 1.7 1.7L6.85 7.2a1.2 1.2 0 0 1-1.7 0L1.1 3.1a1.2 1.2 0 0 1 0-1.7Z" />
          </svg>
        </button>

        {/* 이 아이 프로필 */}
        <Link
          href={catHref}
          aria-label={`${catName} 프로필`}
          className="pointer-events-auto flex size-9.5 items-center justify-center rounded-full text-white backdrop-blur-lg"
          style={{ background: GLASS }}
        >
          <IconYarn size={19} />
        </Link>
      </div>
    </header>
  );
}
