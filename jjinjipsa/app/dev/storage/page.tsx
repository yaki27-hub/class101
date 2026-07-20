"use client";

/* 저장 어댑터 QA 페이지 (T-03) — 저장 → 새로고침 후 유지 확인용. 배포 화면 아님 */

import { useCallback, useEffect, useState } from "react";
import { newId, storage, type Cat, type SymptomLog } from "@/lib/storage";

export default function StorageDevPage() {
  const [cats, setCats] = useState<Cat[]>([]);
  const [symptomCounts, setSymptomCounts] = useState<Record<string, number>>({});
  const [name, setName] = useState("");

  const refresh = useCallback(async () => {
    const list = await storage.listCats();
    setCats(list);
    const counts: Record<string, number> = {};
    for (const c of list) {
      counts[c.id] = (await storage.listSymptoms(c.id)).length;
    }
    setSymptomCounts(counts);
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  async function addCat() {
    if (!name.trim()) return;
    const now = new Date().toISOString();
    const cat: Cat = {
      id: newId(),
      name: name.trim(),
      birthDate: "2020-01-01",
      birthEstimated: true,
      gender: "unknown",
      neutered: false,
      breedGroup: "코리안숏헤어",
      weightKg: 4.2,
      conditions: [],
      indoor: true,
      avatar: null,
      photo: null,
      illust: null,
      createdAt: now,
      updatedAt: now,
    };
    await storage.saveCat(cat);
    setName("");
    await refresh();
  }

  async function addSymptom(catId: string) {
    const log: SymptomLog = {
      id: newId(),
      catId,
      tags: ["구토"],
      summary: "테스트 증상 기록",
      source: "manual",
      chatSessionId: null,
      occurredAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
    };
    await storage.addSymptom(log);
    await refresh();
  }

  return (
    <main className="flex-1 space-y-6 px-5 py-10">
      <header>
        <p className="text-[12px] font-semibold uppercase tracking-[1.5px] text-muted">
          Dev · Storage Adapter
        </p>
        <h1 className="display mt-2 text-2xl text-ink">저장 어댑터 QA</h1>
        <p className="mt-1 text-sm text-body">
          고양이를 추가하고 <b>새로고침</b>해도 목록이 유지되면 통과.
        </p>
      </header>

      <div className="flex gap-2">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && void addCat()}
          placeholder="고양이 이름 (예: 츄르)"
          className="h-11 flex-1 rounded-md border border-hairline bg-canvas px-4 text-base text-ink placeholder:text-muted-soft focus:border-ink focus:outline-none"
        />
        <button
          onClick={() => void addCat()}
          className="h-11 rounded-md bg-ink px-5 text-sm font-semibold text-white"
        >
          추가
        </button>
      </div>

      <ul className="space-y-2">
        {cats.length === 0 && (
          <li className="rounded-lg bg-surface-soft p-4 text-sm text-muted">
            아직 등록된 고양이가 없어요.
          </li>
        )}
        {cats.map((cat) => (
          <li
            key={cat.id}
            className="flex items-center justify-between rounded-lg border border-hairline bg-canvas p-4"
          >
            <div>
              <p className="text-base font-semibold text-ink">🐈 {cat.name}</p>
              <p className="text-xs text-muted">
                {cat.breedGroup} · {cat.weightKg}kg · 증상기록{" "}
                {symptomCounts[cat.id] ?? 0}건
              </p>
            </div>
            <div className="flex gap-1.5">
              <button
                onClick={() => void addSymptom(cat.id)}
                className="rounded-sm border border-hairline px-2.5 py-1.5 text-xs font-semibold text-body"
              >
                +증상
              </button>
              <button
                onClick={() => void storage.deleteCat(cat.id).then(refresh)}
                className="rounded-sm border border-error/40 px-2.5 py-1.5 text-xs font-semibold text-error"
              >
                삭제
              </button>
            </div>
          </li>
        ))}
      </ul>

      <p className="text-xs text-muted-soft">
        localStorage 키: jjinjipsa:cats · traits:* · symptoms:* · chats:*
      </p>
    </main>
  );
}
