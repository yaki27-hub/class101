"use client";

/* 홈 최근 기록 — 선택된 고양이의 증상 기록 최신순 (기본 2개) */

import { useEffect, useState } from "react";
import { storage, type SymptomLog } from "@/lib/storage";

export function useRecentRecords(catId: string | undefined, limit = 2) {
  const [rows, setRows] = useState<SymptomLog[] | null>(null);

  useEffect(() => {
    if (!catId) {
      setRows([]);
      return;
    }
    void storage.listSymptoms(catId).then((list) =>
      setRows(
        [...list]
          .sort((a, b) => (a.occurredAt < b.occurredAt ? 1 : -1))
          .slice(0, limit),
      ),
    );
  }, [catId, limit]);

  return rows;
}
