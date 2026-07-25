"use client";

/* 고양이 아바타 — 사진 있으면 사진, 없으면 아이콘. 다묘 구분용 색 링(옵션). */

import type { CatAccent } from "@/lib/catColor";
import { IconCat } from "@/components/icons";
import type { Cat } from "@/lib/storage";

export default function CatAvatar({
  cat,
  size = 40,
  radius = 14,
  accent,
  className = "",
}: {
  cat: Pick<Cat, "id" | "name" | "photo">;
  size?: number;
  radius?: number;
  /** 넘기면 다묘 구분 색 링을 두른다 */
  accent?: CatAccent;
  className?: string;
}) {
  const ringCls = accent ? `ring-2 ring-offset-1 ring-offset-white ${accent.ring}` : "";
  const style = { width: size, height: size, borderRadius: radius };

  return cat.photo ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={cat.photo}
      alt={`${cat.name} 프로필 사진`}
      style={style}
      className={`flex-none object-cover ${ringCls} ${className}`}
    />
  ) : (
    <span
      style={style}
      className={`flex flex-none items-center justify-center bg-surface-soft text-muted-soft ${ringCls} ${className}`}
    >
      <IconCat size={Math.round(size * 0.55)} />
    </span>
  );
}
