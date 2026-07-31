"use client";

/*
 * 냥이 생활기록부 (D-20) — 자랑용 카드를 보고, 빈 칸을 그 자리에서 채운다.
 *
 * 입력 경로가 둘인 이유: 홈의 "오늘의 체크"는 하루 한 문항이라 마찰이 없는 대신
 * 다 채우는 데 시간이 걸린다. 지금 당장 뽑고 싶은 사람을 위해 여기서 직접 채울 수도 있게 한다.
 */

import { useParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { newId, storage, type Cat, type TraitAnswer } from "@/lib/storage";
import { todayStr } from "@/lib/dailyCheck";
import {
  buildReport,
  summarize,
  traitKey,
  GRADE_STYLE,
  TOTAL_QUESTIONS,
  type PersonalityQuestion,
  type ReportRow,
} from "@/lib/personality";
import { shareNodeAsImage } from "@/lib/shareImage";
import ReportCard from "@/components/ReportCard";
import BottomSheet from "@/components/BottomSheet";
import BackButton from "@/components/BackButton";

export default function ReportPage() {
  const { id } = useParams<{ id: string }>();
  const [cat, setCat] = useState<Cat | null | undefined>(undefined);
  const [traits, setTraits] = useState<TraitAnswer[] | null>(null);
  const [editing, setEditing] = useState<PersonalityQuestion | null>(null);
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const cardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    void storage.getCat(id).then(setCat);
    void storage.listTraits(id).then(setTraits);
  }, [id]);

  function showToast(m: string) {
    setToast(m);
    window.setTimeout(() => setToast(null), 1800);
  }

  async function answer(q: PersonalityQuestion, label: string) {
    const row: TraitAnswer = {
      id: newId(),
      catId: id,
      questionKey: traitKey(q.key),
      answer: label,
      answeredOn: todayStr(),
      createdAt: new Date().toISOString(),
    };
    setEditing(null);
    try {
      await storage.addTrait(row);
      setTraits([...(traits ?? []), row]);
    } catch {
      showToast("저장에 실패했어요");
    }
  }

  async function share() {
    const node = cardRef.current;
    if (!node || !cat) return;
    setBusy(true);
    const r = await shareNodeAsImage(
      node,
      `${cat.name}_생활기록부.png`,
      `${cat.name} 생활기록부`,
    );
    if (r === "downloaded") showToast("이미지를 저장했어요");
    if (r === "failed") showToast("이미지 생성에 실패했어요");
    setBusy(false);
  }

  if (cat === undefined || traits === null) return null;
  if (cat === null)
    return (
      <main className="flex flex-1 items-center justify-center px-6">
        <p className="text-sm text-body">등록된 아이를 찾을 수 없어요.</p>
      </main>
    );

  const rows = buildReport(traits);
  const summary = summarize(rows, cat.name);
  const empty = rows.filter((r) => !r.answered);

  return (
    <main className="flex-1 space-y-4 px-5 pt-8 pb-24">
      <header className="flex items-center justify-between">
        <BackButton fallback={`/cats/${id}`} />
        <span className="text-[12px] font-semibold text-muted tabular-nums">
          {summary.filled}/{TOTAL_QUESTIONS} 기재
        </span>
      </header>

      <ReportCard ref={cardRef} cat={cat} rows={rows} summary={summary} />

      <button
        onClick={() => void share()}
        disabled={busy || summary.filled === 0}
        className="h-12 w-full rounded-button bg-primary text-sm font-bold text-white disabled:opacity-50"
      >
        {busy ? "만드는 중…" : "이미지로 저장·공유"}
      </button>
      {summary.filled === 0 && (
        <p className="-mt-2 text-center text-[12px] text-muted">
          한 칸이라도 채워야 기록부를 뽑을 수 있어요.
        </p>
      )}

      {/* 안 채운 칸 — 여기서 바로 답한다 */}
      {empty.length > 0 && (
        <section className="rounded-card border border-hairline bg-white p-5">
          <p className="text-sm font-bold text-secondary">아직 비어 있는 칸</p>
          <p className="mt-1 text-[12.5px] leading-relaxed text-muted">
            홈의 &ldquo;오늘의 체크&rdquo;에서 하루 한 칸씩 채워지지만, 여기서 바로 답해도 돼요.
          </p>
          <ul className="mt-3 space-y-2">
            {empty.map((r) => (
              <li key={r.key}>
                <button
                  onClick={() => setEditing(r.question)}
                  className="flex min-h-11 w-full items-center justify-between gap-3 rounded-input border border-hairline px-3.5 py-2.5 text-left active:bg-surface-soft/60"
                >
                  <span className="text-[13px] font-semibold text-secondary">{r.key}</span>
                  <span className="flex-none text-[12px] font-semibold text-primary-deep">
                    답하기 ›
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* 채운 칸 — 고칠 수 있게 */}
      {summary.filled > 0 && (
        <section className="rounded-card border border-hairline bg-white p-5">
          <p className="text-sm font-bold text-secondary">기재한 칸 고치기</p>
          <ul className="mt-3 space-y-2">
            {rows
              .filter((r): r is ReportRow & { answered: NonNullable<ReportRow["answered"]> } =>
                Boolean(r.answered),
              )
              .map((r) => (
                <li key={r.key}>
                  <button
                    onClick={() => setEditing(r.question)}
                    className="flex min-h-11 w-full items-center gap-2.5 rounded-input border border-hairline px-3.5 py-2.5 text-left active:bg-surface-soft/60"
                  >
                    <span className="w-[74px] flex-none text-[13px] font-semibold text-secondary">
                      {r.key}
                    </span>
                    <span
                      className={`flex-none rounded-[6px] px-1.5 py-0.5 text-[11px] font-bold ${GRADE_STYLE[r.answered.grade]}`}
                    >
                      {r.answered.grade}
                    </span>
                    <span className="min-w-0 flex-1 truncate text-[12px] text-body">
                      {r.answered.label}
                    </span>
                  </button>
                </li>
              ))}
          </ul>
        </section>
      )}

      <p className="text-center text-[11px] text-muted-soft">
        등급은 성격을 나타낸 것이지 잘하고 못하고가 아니에요.
      </p>

      <BottomSheet
        open={editing !== null}
        onClose={() => setEditing(null)}
        title={editing?.key}
      >
        {editing && (
          <>
            <p className="text-[15px] font-semibold text-secondary">
              {editing.question(cat)}
            </p>
            <div className="mt-4 space-y-2">
              {editing.options.map((o) => (
                <button
                  key={o.label}
                  onClick={() => void answer(editing, o.label)}
                  className="flex min-h-12 w-full items-center gap-2.5 rounded-input border border-hairline px-3.5 py-2.5 text-left active:bg-surface-soft/60"
                >
                  <span
                    className={`flex-none rounded-[6px] px-1.5 py-0.5 text-[11px] font-bold ${GRADE_STYLE[o.grade]}`}
                  >
                    {o.grade}
                  </span>
                  <span className="min-w-0 flex-1 text-[13.5px] text-ink">{o.label}</span>
                </button>
              ))}
            </div>
          </>
        )}
      </BottomSheet>

      {toast && (
        <div
          role="status"
          className="fixed bottom-24 left-1/2 z-[60] -translate-x-1/2 rounded-full bg-ink px-4 py-2.5 text-[13px] font-semibold text-white [animation:toast-in_.2s_ease]"
        >
          {toast}
        </div>
      )}
    </main>
  );
}
