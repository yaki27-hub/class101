"use client";

/* 건강 기록 탭 — 증상 기록 모아보기 (D-10) */

import Link from "next/link";
import { useEffect, useState } from "react";
import { storage, type Cat, type SymptomLog } from "@/lib/storage";

export default function Records() {
  const [rows, setRows] = useState<
    { cat: Cat; log: SymptomLog }[] | null
  >(null);

  useEffect(() => {
    void storage.listCats().then(async (cats) => {
      const all: { cat: Cat; log: SymptomLog }[] = [];
      for (const cat of cats) {
        for (const log of await storage.listSymptoms(cat.id)) all.push({ cat, log });
      }
      all.sort((a, b) => (a.log.occurredAt < b.log.occurredAt ? 1 : -1));
      setRows(all);
    });
  }, []);

  if (rows === null) return null;

  return (
    <main className="flex flex-1 flex-col gap-3 px-5 pt-8 pb-6">
      <h1 className="display text-[22px] text-secondary">건강 기록</h1>
      {rows.length === 0 ? (
        <div className="rounded-card bg-white p-8 text-center shadow-[0_2px_16px_rgba(122,92,67,0.06)]">
          <p className="text-4xl">📖</p>
          <p className="mt-2 font-bold text-secondary">아직 기록이 없어요</p>
          <p className="mt-1 text-sm text-body">
            챗봇 대화나 증상 기록이 여기에 모여요.
          </p>
        </div>
      ) : (
        rows.map(({ cat, log }) => (
          <div
            key={log.id}
            className="rounded-card bg-white p-4 shadow-[0_2px_16px_rgba(122,92,67,0.06)]"
          >
            <div className="flex items-center justify-between">
              <p className="text-[13px] font-bold text-secondary">🐱 {cat.name}</p>
              <span className="text-[11px] text-muted">
                {log.occurredAt.slice(0, 10).replace(/-/g, ".")}
              </span>
            </div>
            <p className="mt-1.5 flex flex-wrap gap-1">
              {log.tags.map((t) => (
                <span key={t} className="rounded-full bg-soft-pink px-2 py-0.5 text-[11px] font-semibold text-secondary">
                  #{t}
                </span>
              ))}
            </p>
            <p className="mt-1 text-[13px] text-body">{log.summary}</p>
          </div>
        ))
      )}
      <Link
        href="/"
        className="mt-1 text-center text-[12px] font-semibold text-muted underline"
      >
        홈으로
      </Link>
    </main>
  );
}
