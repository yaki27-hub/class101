"use client";

/* 건강 기록 탭 — 오늘 상태 요약(선택 고양이) + 증상 기록 모아보기 */

import Link from "next/link";
import { useEffect, useState } from "react";
import { storage, type Cat, type SymptomLog } from "@/lib/storage";
import { resolveSelectedCat } from "@/lib/selectedCat";
import { loadDaily, STATUS_ITEMS, type DailyRecord } from "@/lib/dailyStatus";

export default function Records() {
  const [rows, setRows] = useState<{ cat: Cat; log: SymptomLog }[] | null>(null);
  const [today, setToday] = useState<{ cat: Cat; record: DailyRecord } | null>(null);

  async function load() {
    const cats = await storage.listCats();
    const all: { cat: Cat; log: SymptomLog }[] = [];
    for (const cat of cats) {
      for (const log of await storage.listSymptoms(cat.id)) all.push({ cat, log });
    }
    all.sort((a, b) => (a.log.occurredAt < b.log.occurredAt ? 1 : -1));
    setRows(all);
    const sel = await resolveSelectedCat();
    setToday(sel ? { cat: sel, record: loadDaily(sel.id) } : null);
  }

  useEffect(() => {
    void load();
  }, []);

  async function remove(catId: string, id: string) {
    await storage.deleteSymptom(catId, id);
    await load();
  }

  if (rows === null) return null;

  return (
    <main className="flex flex-1 flex-col gap-3 px-5 pt-8 pb-6">
      <h1 className="display text-[22px] text-secondary">건강 기록</h1>

      {/* 오늘의 상태 요약 (선택 고양이, 홈과 동일 데이터) */}
      {today && (
        <section className="rounded-card border border-hairline bg-white p-4">
          <p className="text-[13px] font-bold text-secondary">
            오늘 {today.cat.name}의 상태
          </p>
          <div className="mt-2 grid grid-cols-2 gap-2">
            {STATUS_ITEMS.map((item) => {
              const v = today.record[item.key];
              const abnormal = v?.level === "warning" || v?.level === "danger";
              return (
                <div
                  key={item.key}
                  className={`flex items-center justify-between rounded-[13px] px-3 py-2 text-[12px] ${
                    v
                      ? abnormal
                        ? "bg-[#fff4ec] text-[#b8862e]"
                        : "bg-mint-soft text-success"
                      : "bg-surface-soft text-muted-soft"
                  }`}
                >
                  <span className="font-semibold text-secondary">{item.label}</span>
                  <span className="truncate pl-2">{v ? v.label : "미기록"}</span>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {rows.length === 0 ? (
        <div className="rounded-card bg-white p-8 text-center border border-hairline">
          <p className="text-4xl">📖</p>
          <p className="mt-2 font-bold text-secondary">아직 기록이 없어요</p>
          <p className="mt-1 text-sm text-body">
            챗봇 대화나 증상 기록이 여기에 모여요.
          </p>
        </div>
      ) : (
        rows.map(({ cat, log }) => (
          <div key={log.id} className="rounded-card bg-white p-4 border border-hairline">
            <div className="flex items-center justify-between">
              <p className="text-[13px] font-bold text-secondary">🐱 {cat.name}</p>
              <div className="flex items-center gap-2">
                <span className="text-[11px] text-muted">
                  {log.occurredAt.slice(0, 10).replace(/-/g, ".")}
                </span>
                <button
                  onClick={() => void remove(cat.id, log.id)}
                  aria-label="기록 삭제"
                  className="rounded-full bg-surface-soft px-2 py-0.5 text-[11px] text-muted"
                >
                  🗑️
                </button>
              </div>
            </div>
            <p className="mt-1.5 flex flex-wrap gap-1">
              {log.tags.map((t) => (
                <span
                  key={t}
                  className="rounded-full bg-soft-pink px-2 py-0.5 text-[11px] font-semibold text-secondary"
                >
                  #{t}
                </span>
              ))}
            </p>
            <p className="mt-1 text-[13px] text-body">{log.summary}</p>
          </div>
        ))
      )}
    </main>
  );
}
