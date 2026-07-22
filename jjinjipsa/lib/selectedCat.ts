/*
 * 홈에서 고른 고양이를 탭 전환 후에도 유지하기 위한 공용 헬퍼.
 * 홈(app/page.tsx)이 jjinjipsa:selectedCat 에 catId를 저장 → 다른 탭이 이걸 읽는다.
 */

import { storage, type Cat } from "@/lib/storage";

export const SELECTED_CAT_KEY = "jjinjipsa:selectedCat";

/** 저장된 선택 catId (없으면 null) */
export function getSelectedCatId(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(SELECTED_CAT_KEY);
}

/** 선택 catId 저장 */
export function setSelectedCatId(id: string): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(SELECTED_CAT_KEY, id);
}

/**
 * 홈에서 고른 고양이를 우선 반환. 저장값이 없거나 삭제된 고양이면 첫 번째로 폴백.
 * 등록된 고양이가 없으면 null.
 */
export async function resolveSelectedCat(): Promise<Cat | null> {
  const cats = await storage.listCats();
  if (cats.length === 0) return null;
  const id = getSelectedCatId();
  return cats.find((c) => c.id === id) ?? cats[0];
}
