"use client";

/* F-15 오늘의 체크 배너 (T-12) — 홈에서 하루 1문항, 답하면 습관 베이스라인 저장 */

import { useEffect, useState } from "react";
import {
  newId,
  storage,
  type Cat,
  type TraitAnswer,
} from "@/lib/storage";
import {
  pickTodayQuestion,
  todayStr,
  type DailyQuestion,
} from "@/lib/dailyCheck";

export default function DailyCheck({ cat }: { cat: Cat }) {
  const [question, setQuestion] = useState<DailyQuestion | null | undefined>(
    undefined,
  );
  const [justAnswered, setJustAnswered] = useState(false);

  useEffect(() => {
    void storage
      .listTraits(cat.id)
      .then((traits) => setQuestion(pickTodayQuestion(traits)));
  }, [cat.id]);

  async function answer(option: string) {
    if (!question) return;
    const row: TraitAnswer = {
      id: newId(),
      catId: cat.id,
      questionKey: question.key,
      answer: option,
      answeredOn: todayStr(),
      createdAt: new Date().toISOString(),
    };
    await storage.addTrait(row);
    setQuestion(null);
    setJustAnswered(true);
  }

  if (question === undefined) return null;

  if (question === null)
    return (
      <div className="rounded-xl bg-surface-card p-4">
        <p className="text-[12px] font-semibold uppercase tracking-[1.5px] text-muted">
          오늘의 체크
        </p>
        <p className="mt-1 text-sm font-medium text-ink">
          {justAnswered
            ? `🐾 고마워요! ${cat.name}의 평소 모습을 하나 더 알게 됐어요.`
            : `오늘 체크는 완료했어요. 내일 또 만나요! 🐾`}
        </p>
      </div>
    );

  return (
    <div className="rounded-xl bg-brand-ochre p-5">
      <p className="text-[12px] font-semibold uppercase tracking-[1.5px] text-ink/60">
        오늘의 체크 · 하루 1문항
      </p>
      <p className="mt-1.5 text-base font-semibold text-ink">
        {question.question(cat)}
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        {question.options.map((o) => (
          <button
            key={o}
            onClick={() => void answer(o)}
            className="rounded-full bg-canvas px-3.5 py-2 text-[13px] font-medium text-ink active:bg-surface-strong"
          >
            {o}
          </button>
        ))}
      </div>
      <p className="mt-2.5 text-[12px] text-ink/60">
        답이 쌓일수록 챗봇이 "{cat.name}의 평소"를 알게 돼요.
      </p>
    </div>
  );
}
