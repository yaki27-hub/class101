"use client";

/* F-05 증상 수동 기록 (T-11) — 3탭 이내: 진입 → 태그 선택 → 저장 */

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { newId, storage, type Cat, type SymptomLog } from "@/lib/storage";
import { EMERGENCY_TAG_LIST, SYMPTOM_TAG_LIST } from "@/lib/symptomTags";
import { EMERGENCY_MAP_URL } from "@/lib/redFlags";

export default function ManualLogPage() {
  const { id: catId } = useParams<{ id: string }>();
  const router = useRouter();
  const [cat, setCat] = useState<Cat | null | undefined>(undefined);
  const [tags, setTags] = useState<string[]>([]);
  const [memo, setMemo] = useState("");
  const [showEmergency, setShowEmergency] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    void storage.getCat(catId).then(setCat);
  }, [catId]);

  function toggle(tag: string, emergency: boolean) {
    setError("");
    setTags((prev) => {
      const on = !prev.includes(tag);
      if (on && emergency) setShowEmergency(true);
      return on ? [...prev, tag] : prev.filter((t) => t !== tag);
    });
  }

  async function save() {
    if (!cat) return;
    if (tags.length === 0) return setError("증상 태그를 하나 이상 골라 주세요.");
    const log: SymptomLog = {
      id: newId(),
      catId: cat.id,
      tags,
      summary: memo.trim() || tags.join(", "),
      source: "manual",
      chatSessionId: null,
      occurredAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
    };
    await storage.addSymptom(log);
    router.push(`/cats/${cat.id}`);
  }

  if (cat === undefined) return null;
  if (cat === null)
    return (
      <main className="flex flex-1 flex-col items-center justify-center gap-3 px-6">
        <p className="text-sm text-body">등록된 아이를 찾을 수 없어요.</p>
        <Link href="/" className="text-sm font-semibold text-ink underline">
          홈으로
        </Link>
      </main>
    );

  const chip = (tag: string, selected: boolean, emergency: boolean) =>
    `rounded-full px-3.5 py-2 text-[13px] font-medium ${
      selected
        ? emergency
          ? "bg-error text-white"
          : "bg-ink text-white"
        : emergency
          ? "border border-error/40 bg-canvas text-error"
          : "bg-surface-card text-ink"
    }`;

  return (
    <main className="flex-1 space-y-6 px-5 py-8">
      <header className="flex items-center justify-between">
        <Link href={`/cats/${catId}`} className="text-sm font-medium text-muted">
          ← 돌아가기
        </Link>
        <p className="text-[12px] font-semibold uppercase tracking-[1.5px] text-muted">
          Symptom Log
        </p>
      </header>

      <div>
        <h1 className="display text-2xl text-ink">
          {cat.name}에게 어떤 증상이 있나요?
        </h1>
        <p className="mt-1 text-sm text-body">
          해당하는 태그를 고르고 저장하면 끝이에요.
        </p>
      </div>

      <section className="space-y-2">
        <p className="text-sm font-semibold text-ink">증상 태그</p>
        <div className="flex flex-wrap gap-2">
          {SYMPTOM_TAG_LIST.map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => toggle(t, false)}
              className={chip(t, tags.includes(t), false)}
            >
              {t}
            </button>
          ))}
        </div>
      </section>

      <section className="space-y-2">
        <p className="text-sm font-semibold text-error">응급 신호</p>
        <div className="flex flex-wrap gap-2">
          {EMERGENCY_TAG_LIST.map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => toggle(t, true)}
              className={chip(t, tags.includes(t), true)}
            >
              ⚠️ {t}
            </button>
          ))}
        </div>
      </section>

      <label className="block space-y-1.5">
        <span className="text-sm font-semibold text-ink">메모 (선택)</span>
        <textarea
          value={memo}
          onChange={(e) => setMemo(e.target.value)}
          rows={3}
          placeholder="예: 아침 사료 먹고 30분 뒤에 토함. 노란 거품."
          className="w-full rounded-md border border-hairline bg-canvas px-4 py-3 text-base text-ink placeholder:text-muted-soft focus:border-ink focus:outline-none"
        />
      </label>

      {error && (
        <p className="rounded-md border border-error/30 bg-error/5 px-4 py-3 text-sm text-error">
          {error}
        </p>
      )}

      <button
        onClick={() => void save()}
        className="h-12 w-full rounded-md bg-ink text-sm font-semibold text-white active:bg-[#1f1f1f]"
      >
        기록 저장하기
      </button>

      {/* 응급 태그 선택 시 병원 안내 모달 (F-05) */}
      {showEmergency && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-ink/50 sm:items-center">
          <div className="w-full max-w-[380px] space-y-4 rounded-t-xl bg-canvas p-6 sm:rounded-xl">
            <p className="text-lg font-semibold text-error">
              🔴 이 신호는 기록보다 병원이 먼저예요
            </p>
            <p className="text-sm leading-relaxed text-body">
              선택하신 증상은 지켜보며 기다리면 위험할 수 있는 응급 신호예요.
              지금 바로 가까운 병원(야간·휴일이면 24시 동물병원)에 데려가
              주세요. 기록은 다녀와서 남겨도 늦지 않아요.
            </p>
            <a
              href={EMERGENCY_MAP_URL}
              target="_blank"
              rel="noopener"
              className="flex h-12 items-center justify-center rounded-md bg-error text-sm font-semibold text-white"
            >
              🗺️ 가까운 24시 동물병원 찾기
            </a>
            <button
              onClick={() => setShowEmergency(false)}
              className="h-11 w-full rounded-md border border-hairline text-sm font-semibold text-body"
            >
              확인했어요 — 기록 계속하기
            </button>
          </div>
        </div>
      )}
    </main>
  );
}
