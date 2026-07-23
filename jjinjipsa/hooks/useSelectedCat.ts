"use client";

/* 현재 선택된 고양이 — 저장값 우선, 없거나 삭제됐으면 첫 번째로 폴백 (지시서 §17) */

import { useCallback, useEffect, useState } from "react";
import { storage, type Cat } from "@/lib/storage";
import { getSelectedCatId, setSelectedCatId } from "@/lib/selectedCat";
import { supabase } from "@/lib/supabase";

export function useSelectedCat() {
  const [cats, setCats] = useState<Cat[] | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const reload = useCallback(async () => {
    const list = await storage.listCats();
    setCats(list);
    setSelectedId((prev) => {
      const wanted = prev ?? getSelectedCatId();
      return (list.find((c) => c.id === wanted) ?? list[0])?.id ?? null;
    });
  }, []);

  useEffect(() => {
    void reload();
    // 로그인/로그아웃 등 인증 변화 시 목록 재로딩
    const { data: sub } = supabase.auth.onAuthStateChange(() => void reload());
    return () => sub.subscription.unsubscribe();
  }, [reload]);

  const select = useCallback((id: string) => {
    setSelectedId(id);
    setSelectedCatId(id);
  }, []);

  const cat = cats?.find((c) => c.id === selectedId) ?? cats?.[0] ?? null;
  return { cats, cat, select, reload, loading: cats === null };
}
