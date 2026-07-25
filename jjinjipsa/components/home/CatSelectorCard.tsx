"use client";

/* 고양이 선택 카드 — 현재 관리 중인 고양이 표시 + 바꾸기(바텀시트) (지시서 §5) */

import { getCatAge } from "@/lib/catAge";
import CatAvatar from "@/components/CatAvatar";
import type { CatAccent } from "@/lib/catColor";
import type { Cat } from "@/lib/storage";

export default function CatSelectorCard({
  cat,
  multiple,
  accent,
  onOpen,
}: {
  cat: Cat;
  multiple: boolean;
  accent?: CatAccent;
  onOpen: () => void;
}) {
  const age = getCatAge(cat.birthDate);
  return (
    <section className="flex items-center gap-3 rounded-card border border-hairline bg-white p-4">
      <CatAvatar cat={cat} size={52} radius={16} accent={accent} />

      <button
        type="button"
        onClick={onOpen}
        className="min-w-0 flex-1 text-left"
        aria-label="고양이 바꾸기"
        aria-haspopup="dialog"
      >
        <span className="flex items-center gap-1">
          <span className="display truncate text-[19px] text-secondary">{cat.name}</span>
          {multiple && <span className="text-[12px] text-muted-soft">▾</span>}
        </span>
        <span className="mt-0.5 block truncate text-[12.5px] text-muted">
          {age.ageLabel} · {cat.breedGroup}
        </span>
      </button>

      {multiple && (
        <button
          type="button"
          onClick={onOpen}
          className="flex-none rounded-[14px] bg-primary-soft px-3 py-1.5 text-[12px] font-bold text-primary-deep"
        >
          바꾸기
        </button>
      )}
    </section>
  );
}
