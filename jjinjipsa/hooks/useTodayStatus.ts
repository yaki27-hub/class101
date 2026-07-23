"use client";

/* 오늘 상태 기록(식사·물·배변·활동) 로드/저장 + 요약 */

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  loadDaily,
  saveDaily,
  summarize,
  type DailyRecord,
  type DailyStatusLevel,
  type DailyStatusType,
} from "@/lib/dailyStatus";

export function useTodayStatus(catId: string | undefined) {
  const [record, setRecord] = useState<DailyRecord>({});

  useEffect(() => {
    setRecord(catId ? loadDaily(catId) : {});
  }, [catId]);

  const setStatus = useCallback(
    (type: DailyStatusType, level: DailyStatusLevel, label: string) => {
      if (!catId) return;
      setRecord(saveDaily(catId, type, level, label));
    },
    [catId],
  );

  const summary = useMemo(() => summarize(record), [record]);
  return { record, summary, setStatus };
}
