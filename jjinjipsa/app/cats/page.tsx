"use client";

/* 우리 고양이 탭 — 프로필 목록 (D-10) */

import Link from "next/link";
import { useEffect, useState } from "react";
import { storage, type Cat } from "@/lib/storage";
import { getCatAge } from "@/lib/catAge";
import { IconPencil, IconGear } from "@/components/icons";
import { getTier, maxCatsFor, maxCatsMessage, type Tier } from "@/lib/limits";
import BackButton from "@/components/BackButton";
import CatAvatar from "@/components/CatAvatar";
import { accentAt } from "@/lib/catColor";

export default function CatsList() {
  const [cats, setCats] = useState<Cat[] | null>(null);
  const [tier, setTier] = useState<Tier>("guest");
  useEffect(() => {
    void storage.listCats().then(setCats);
    void getTier().then(setTier);
  }, []);
  if (cats === null) return null;

  return (
    <main className="flex flex-1 flex-col gap-3 px-5 pt-8 pb-nav">
      {/* 하단 탭에 없는 화면이라(홈 헤더에서 진입) 뒤로가기가 유일한 복귀 경로다 */}
      <header className="flex items-center gap-2">
        <BackButton fallback="/" />
        <h1 className="display text-[22px] text-rd-ink">우리 고양이</h1>
      </header>
      {cats.map((cat, i) => {
        const age = getCatAge(cat.birthDate);
        return (
          <div
            key={cat.id}
            className="flex items-center gap-4 rounded-3xl bg-rd-card p-4"
          >
            <Link href={`/cats/${cat.id}`} className="flex flex-1 items-center gap-4">
              <CatAvatar cat={cat} size={64} radius={18} accent={cats.length > 1 ? accentAt(i) : undefined} />
              <div>
                <p className="font-bold text-rd-ink">{cat.name}</p>
                <p className="text-[12px] text-rd-muted">
                  {age.stageEmoji} {age.stageLabel} · {age.ageLabel}
                  {cat.weightKg ? ` · ${cat.weightKg}kg` : ""}
                </p>
                <p className="text-[12px] text-rd-faint">{cat.breedGroup}</p>
              </div>
            </Link>
            <Link
              href={`/cats/${cat.id}/edit`}
              className="flex min-h-11 flex-none items-center gap-1 rounded-[14px] bg-rd-page px-3.5 text-[12px] font-semibold text-rd-ink"
            >
              <IconPencil size={13} /> 수정
            </Link>
          </div>
        );
      })}
      {cats.length < maxCatsFor(tier) ? (
        <Link
          href="/profile/new"
          className="rounded-[14px] border border-dashed border-rd-line bg-white py-3.5 text-center text-sm font-semibold text-rd-muted"
        >
          + 다른 아이 등록
        </Link>
      ) : (
        <p className="rounded-[14px] bg-rd-page py-3.5 text-center text-[13px] text-rd-muted">
          {maxCatsMessage(tier)} 🐾
        </p>
      )}

      {/* 계정 설정 진입 */}
      <Link
        href="/account"
        className="mt-2 flex items-center justify-between rounded-3xl bg-white px-5 py-4 text-sm font-semibold text-rd-ink border border-rd-line"
      >
        <span className="flex items-center gap-2">
          <IconGear size={18} className="text-rd-muted" /> 계정 설정
        </span>
        <span className="text-rd-faint">›</span>
      </Link>
    </main>
  );
}
