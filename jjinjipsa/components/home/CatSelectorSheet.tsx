"use client";

/* 고양이 선택 바텀시트 — 현재 선택 강조 + 다른 아이 등록 (지시서 §5) */

import Link from "next/link";
import { useEffect, useState } from "react";
import BottomSheet from "@/components/BottomSheet";
import { getCatAge } from "@/lib/catAge";
import CatAvatar from "@/components/CatAvatar";
import { accentAt } from "@/lib/catColor";
import { getTier, maxCatsFor, maxCatsMessage, type Tier } from "@/lib/limits";
import type { Cat } from "@/lib/storage";

export default function CatSelectorSheet({
  open,
  cats,
  selectedId,
  onSelect,
  onClose,
}: {
  open: boolean;
  cats: Cat[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onClose: () => void;
}) {
  // 등록 한도(D-24) — 한도를 다 썼는데 "+ 다른 아이 등록"이 보이면 거짓말이 된다
  const [tier, setTier] = useState<Tier>("guest");
  useEffect(() => {
    if (open) void getTier().then(setTier);
  }, [open]);
  return (
    <BottomSheet open={open} onClose={onClose} title="어떤 아이를 볼까요?">
      <div className="space-y-2">
        {cats.map((c, i) => {
          const on = c.id === selectedId;
          const age = getCatAge(c.birthDate);
          return (
            <button
              key={c.id}
              onClick={() => {
                onSelect(c.id);
                onClose();
              }}
              className={`flex w-full items-center gap-3 rounded-3xl border p-3 text-left transition ${
                on ? "border-rd-mint-line bg-rd-mint-soft" : "border-rd-line bg-white"
              }`}
            >
              <CatAvatar cat={c} size={44} radius={14} accent={cats.length > 1 ? accentAt(i) : undefined} />
              <span className="min-w-0 flex-1">
                <span className="block truncate font-bold text-rd-ink">
                  {c.name}
                </span>
                <span className="block truncate text-[12px] text-rd-muted">
                  {age.ageLabel} · {c.breedGroup}
                </span>
              </span>
              {on && <span className="flex-none text-rd-forest">✓</span>}
            </button>
          );
        })}
      </div>

      {cats.length < maxCatsFor(tier) ? (
        <Link
          href="/profile/new"
          onClick={onClose}
          className="mt-3 flex h-12 items-center justify-center rounded-[14px] border border-dashed border-rd-line text-sm font-semibold text-rd-muted"
        >
          + 다른 아이 등록
        </Link>
      ) : (
        <p className="mt-3 px-1 text-center text-[12px] leading-relaxed text-rd-muted">
          {maxCatsMessage(tier)}
        </p>
      )}
    </BottomSheet>
  );
}
