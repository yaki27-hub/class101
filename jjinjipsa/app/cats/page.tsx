"use client";

/* 우리 고양이 탭 — 프로필 목록 (D-10) */

import Link from "next/link";
import { useEffect, useState } from "react";
import { storage, type Cat } from "@/lib/storage";
import { getCatAge } from "@/lib/catAge";
import { IconPencil, IconGear } from "@/components/icons";
import { getTier, maxCatsFor, maxCatsMessage, type Tier } from "@/lib/limits";
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
    <main className="flex flex-1 flex-col gap-3 px-5 pt-8 pb-6">
      <h1 className="display text-[22px] text-secondary">우리 고양이</h1>
      {cats.map((cat, i) => {
        const age = getCatAge(cat.birthDate);
        return (
          <div
            key={cat.id}
            className="flex items-center gap-4 rounded-card bg-white p-4 border border-hairline"
          >
            <Link href={`/cats/${cat.id}`} className="flex flex-1 items-center gap-4">
              <CatAvatar cat={cat} size={64} radius={18} accent={cats.length > 1 ? accentAt(i) : undefined} />
              <div>
                <p className="font-bold text-secondary">{cat.name}</p>
                <p className="text-[12px] text-muted">
                  {age.stageEmoji} {age.stageLabel} · {age.ageLabel}
                  {cat.weightKg ? ` · ${cat.weightKg}kg` : ""}
                </p>
                <p className="text-[12px] text-muted-soft">{cat.breedGroup}</p>
              </div>
            </Link>
            <Link
              href={`/cats/${cat.id}/edit`}
              className="flex min-h-11 flex-none items-center gap-1 rounded-button bg-surface-soft px-3.5 text-[12px] font-semibold text-secondary"
            >
              <IconPencil size={13} /> 수정
            </Link>
          </div>
        );
      })}
      {cats.length < maxCatsFor(tier) ? (
        <Link
          href="/profile/new"
          className="rounded-button border border-dashed border-hairline bg-white py-3.5 text-center text-sm font-semibold text-muted"
        >
          + 다른 아이 등록
        </Link>
      ) : (
        <p className="rounded-button bg-surface-soft py-3.5 text-center text-[13px] text-muted">
          {maxCatsMessage(tier)} 🐾
        </p>
      )}

      {/* 계정 설정 진입 */}
      <Link
        href="/account"
        className="mt-2 flex items-center justify-between rounded-card bg-white px-5 py-4 text-sm font-semibold text-secondary border border-hairline"
      >
        <span className="flex items-center gap-2">
          <IconGear size={18} className="text-muted" /> 계정 설정
        </span>
        <span className="text-muted-soft">›</span>
      </Link>
    </main>
  );
}
