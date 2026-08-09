"use client";

/* F-05 증상 수동 기록 (T-11) — 3탭 이내: 진입 → 태그 선택 → 저장 */

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { newId, storage, type Cat, type SymptomLog } from "@/lib/storage";
import { EMERGENCY_TAG_LIST, SYMPTOM_TAG_LIST } from "@/lib/symptomTags";
import { EMERGENCY_MAP_URL } from "@/lib/redFlags";
import BackButton from "@/components/BackButton";

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
      <main className="flex flex-1 flex-col items-center justify-center gap-3 px-6 pb-nav">
        <p className="text-sm text-rd-body">등록된 아이를 찾을 수 없어요.</p>
        <Link href="/" className="text-sm font-semibold text-rd-ink underline">
          홈으로
        </Link>
      </main>
    );

  const chip = (tag: string, selected: boolean, emergency: boolean) =>
    `rounded-full px-3.5 py-2 text-[13px] font-medium ${
      selected
        ? emergency
          ? "bg-rd-danger text-white"
          : "bg-rd-ink text-white"
        : emergency
          ? "border border-[#FFC9BF]/40 bg-rd-page text-[#C4453A]"
          : "bg-surface-card text-rd-ink"
    }`;

  return (
    <main className="flex-1 space-y-6 px-5 pt-8 pb-nav">
      <header className="flex items-center justify-between">
        <BackButton fallback={`/cats/${catId}`} />
        <p className="text-[12px] font-semibold text-rd-muted">증상 기록</p>
      </header>

      <div>
        <h1 className="display text-2xl text-rd-ink">
          {cat.name}에게 어떤 증상이 있나요?
        </h1>
        <p className="mt-1 text-sm text-rd-body">
          해당하는 태그를 고르고 저장하면 끝이에요.
        </p>
      </div>

      <section className="space-y-2">
        <p className="text-sm font-semibold text-rd-ink">증상 태그</p>
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
        <p className="text-sm font-semibold text-[#C4453A]">응급 신호</p>
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
        <span className="text-sm font-semibold text-rd-ink">메모 (선택)</span>
        <textarea
          value={memo}
          onChange={(e) => setMemo(e.target.value)}
          rows={3}
          placeholder="예: 아침 사료 먹고 30분 뒤에 토함. 노란 거품."
          className="w-full rounded-[14px] border border-rd-line bg-rd-page px-4 py-3 text-base text-rd-ink placeholder:text-rd-faint focus:border-rd-ink focus:outline-none"
        />
      </label>

      {error && (
        <p className="rounded-md border border-[#F0D5D2] bg-rd-danger/5 px-4 py-3 text-sm text-[#C4453A]">
          {error}
        </p>
      )}

      <button
        onClick={() => void save()}
        className="h-12 w-full rounded-[14px] bg-rd-ink text-sm font-semibold text-white active:bg-primary-deep"
      >
        기록 저장하기
      </button>

      {/* 응급 태그 선택 시 병원 안내 모달 (F-05) */}
      {showEmergency && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-rd-ink/50 sm:items-center">
          <div className="w-full max-w-[380px] space-y-4 rounded-t-xl bg-rd-page p-6 sm:rounded-xl">
            <p className="text-lg font-semibold text-[#C4453A]">
              🔴 이 신호는 기록보다 병원이 먼저예요
            </p>
            <p className="text-sm leading-relaxed text-rd-body">
              선택하신 증상은 지켜보며 기다리면 위험할 수 있는 응급 신호예요.
              지금 바로 가까운 병원(야간·휴일이면 24시 동물병원)에 데려가
              주세요. 기록은 다녀와서 남겨도 늦지 않아요.
            </p>
            <a
              href={EMERGENCY_MAP_URL}
              target="_blank"
              rel="noopener"
              className="flex h-12 items-center justify-center rounded-[14px] bg-rd-danger text-sm font-semibold text-white"
            >
              🗺️ 가까운 24시 동물병원 찾기
            </a>
            <button
              onClick={() => setShowEmergency(false)}
              className="h-11 w-full rounded-[14px] border border-rd-line text-sm font-semibold text-rd-body"
            >
              확인했어요 — 기록 계속하기
            </button>
          </div>
        </div>
      )}
    </main>
  );
}
