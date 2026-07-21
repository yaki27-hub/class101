"use client";

/* 우리 고양이 탭 — 프로필 목록 (D-10) */

import Link from "next/link";
import { useEffect, useState } from "react";
import { storage, type Cat } from "@/lib/storage";
import { getCatAge } from "@/lib/catAge";

export default function CatsList() {
  const [cats, setCats] = useState<Cat[] | null>(null);
  useEffect(() => {
    void storage.listCats().then(setCats);
  }, []);
  if (cats === null) return null;

  return (
    <main className="flex flex-1 flex-col gap-3 px-5 pt-8 pb-6">
      <h1 className="display text-[22px] text-secondary">우리 고양이</h1>
      {cats.map((cat) => {
        const age = getCatAge(cat.birthDate);
        return (
          <Link
            key={cat.id}
            href={`/cats/${cat.id}`}
            className="flex items-center gap-4 rounded-card bg-white p-4 shadow-[0_2px_16px_rgba(122,92,67,0.06)]"
          >
            {cat.photo ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={cat.photo} alt="" className="size-16 flex-none rounded-[18px] object-cover" />
            ) : (
              <span className="flex size-16 flex-none items-center justify-center rounded-[18px] bg-surface-soft text-3xl">🐱</span>
            )}
            <div>
              <p className="font-bold text-secondary">{cat.name}</p>
              <p className="text-[12px] text-muted">
                {age.stageEmoji} {age.stageLabel} · {age.ageLabel}
                {cat.weightKg ? ` · ${cat.weightKg}kg` : ""}
              </p>
              <p className="text-[12px] text-muted-soft">{cat.breedGroup}</p>
            </div>
          </Link>
        );
      })}
      <Link
        href="/profile/new"
        className="rounded-button border border-dashed border-hairline bg-white py-3.5 text-center text-sm font-semibold text-muted"
      >
        + 다른 아이 등록
      </Link>
    </main>
  );
}
