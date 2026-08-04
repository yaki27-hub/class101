/*
 * 다묘 구분용 고양이별 색상 — 기록·목록에서 "어느 아이 것인지" 한눈에 보이게.
 * 등록 순서(목록 인덱스)로 배정해 같은 화면 안에서 색이 절대 겹치지 않게 한다.
 * (해시 방식은 3마리에서도 충돌이 나 구분 목적을 잃음)
 * 색은 스티키노트 4색(민트/틸/하이라이터/블러시)만 사용. 글자는 전부 잉크 —
 * 파스텔 위 잉크는 9.9~11.6:1이라 어느 조합에서도 읽힌다.
 */

import type { Cat } from "@/lib/storage";

export interface CatAccent {
  /** 아바타 링 */
  ring: string;
  /** 이름 배지 배경 */
  soft: string;
  /** 이름 배지 글자 */
  text: string;
  /** 좌측 세로 바 */
  bar: string;
}

export const ACCENTS: CatAccent[] = [
  { ring: "ring-mint", soft: "bg-mint-soft", text: "text-ink", bar: "bg-mint" },
  { ring: "ring-sky", soft: "bg-sky-soft", text: "text-sky-ink", bar: "bg-sky" },
  { ring: "ring-butter", soft: "bg-butter-soft", text: "text-ink", bar: "bg-butter" },
  { ring: "ring-soft-pink", soft: "bg-soft-pink/40", text: "text-ink", bar: "bg-soft-pink" },
];

/** 목록 인덱스로 색 배정 (오픈테스트 최대 3마리 → 항상 서로 다른 색) */
export function accentAt(index: number): CatAccent {
  return ACCENTS[index % ACCENTS.length];
}

/** 고양이 목록 → { catId: 색 } 맵 */
export function buildAccentMap(cats: Cat[]): Record<string, CatAccent> {
  const map: Record<string, CatAccent> = {};
  cats.forEach((c, i) => {
    map[c.id] = accentAt(i);
  });
  return map;
}
