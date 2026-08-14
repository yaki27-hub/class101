"use client";

/*
 * 냥이 생활기록부 (D-20, 리디자인 핸드오프) — 카드를 보고, 그 자리에서 채운다.
 *
 * 이전 화면은 같은 12항목이 세 번 반복됐다(카드·빈 칸 목록·고치기 목록).
 * 이제 카드 줄을 직접 눌러 고치고, 빈 칸은 카드 아래 칩 한 뭉치로만 남는다.
 * 홈의 "오늘의 체크" 입력 경로는 리디자인으로 빠져 있어 여기가 유일한 입력이다 (T-52).
 */

import { useParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { newId, storage, type Cat, type TraitAnswer } from "@/lib/storage";
import { loadHealthNote } from "@/lib/healthNote";
import { loadNotes } from "@/lib/importantNotes";
import {
  checkReadiness,
  collectEvidenceTexts,
  LOOKBACK_DAYS,
  type Readiness,
} from "@/lib/reportReadiness";
import { loadDailyOn } from "@/lib/dailyStatus";
import { todayStr } from "@/lib/dailyCheck";
import {
  buildReport,
  summarize,
  traitKey,
  GRADE_STYLE,
  PERSONALITY_QUESTIONS,
  TOTAL_QUESTIONS,
  type PersonalityQuestion,
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
  /** 초안 제안 (P2-1) — 집사가 쓴 문장에서 뽑은 것. 적용 전에는 저장하지 않는다 */
  const [readiness, setReadiness] = useState<Readiness | null>(null);
  const [evidence, setEvidence] = useState<string[]>([]);
  const [drafts, setDrafts] = useState<
    Array<{ key: string; label: string; evidence: string }> | null
  >(null);
  const [drafting, setDrafting] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const cardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    void storage.getCat(id).then(setCat);
    void storage.listTraits(id).then(setTraits);
  }, [id]);

  // 준비 상태 + 초안 근거 — 집사가 쓴 문장만 모은다 (건강 수치는 넣지 않는다)
  useEffect(() => {
    void (async () => {
      let recordDays = 0;
      for (let i = 0; i < LOOKBACK_DAYS; i++) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        if (Object.keys(loadDailyOn(id, d)).length > 0) recordDays++;
      }
      const [symptoms, sessions] = await Promise.all([
        storage.listSymptoms(id).catch(() => []),
        storage.listSessions(id).catch(() => []),
      ]);
      const chatQuestions: string[] = [];
      for (const s of sessions.slice(-8)) {
        const msgs = await storage.listMessages(s.id).catch(() => []);
        for (const m of msgs) if (m.role === "user") chatQuestions.push(m.content);
      }
      const texts = collectEvidenceTexts({
        chatQuestions,
        symptomNotes: symptoms.map((s) => s.summary),
        noteTexts: [
          ...loadNotes(id).map((n) => n.content),
          loadHealthNote(id),
        ].filter(Boolean),
      });
      setEvidence(texts);
      setReadiness(checkReadiness({ recordDays, texts }));
    })();
  }, [id]);

  /** 초안 요청 — 제안만 받아온다. 저장은 [적용]을 눌러야 일어난다 */
  async function requestDrafts() {
    setDrafting(true);
    try {
      const res = await fetch("/api/report-draft", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          catName: cat?.name ?? "",
          texts: evidence,
          answeredKeys: (traits ?? [])
            .map((t) => t.questionKey.replace(/^성격:/, ""))
            .filter(Boolean),
        }),
      });
      if (!res.ok) {
        showToast(res.status === 429 ? "오늘은 초안을 더 못 만들어요" : "초안을 만들지 못했어요");
        setDrafts([]);
        return;
      }
      const json = (await res.json()) as {
        suggestions: Array<{ key: string; label: string; evidence: string }>;
      };
      setDrafts(json.suggestions ?? []);
    } catch {
      showToast("초안을 만들지 못했어요");
      setDrafts([]);
    } finally {
      setDrafting(false);
    }
  }

  /** 제안 적용 — 여기서 처음 저장된다 */
  async function applyDraft(d: { key: string; label: string }) {
    const q = PERSONALITY_QUESTIONS.find((x) => x.key === d.key);
    if (!q) return;
    await answer(q, d.label);
    setDrafts((prev) => prev?.filter((x) => x.key !== d.key) ?? null);
  }

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
        <p className="text-sm text-rd-body">등록된 아이를 찾을 수 없어요.</p>
      </main>
    );

  const rows = buildReport(traits);
  const summary = summarize(rows, cat.name);
  const empty = rows.filter((r) => !r.answered);
  // 시트에서 "현재 답"을 강조하려면 지금 답을 알아야 한다
  const currentAnswer = editing
    ? rows.find((r) => r.key === editing.key)?.answered?.label ?? null
    : null;

  return (
    <main className="flex-1 pb-36">
      {/* 스티키 헤더 — 스크롤 콘텐츠가 밑으로 지나가며 자연스럽게 사라진다 */}
      <header
        className="sticky top-0 z-30 flex h-12 items-center justify-between px-2"
        style={{
          background: "linear-gradient(180deg,#F4F5F2 74%,rgba(244,245,242,0))",
        }}
      >
        <BackButton fallback={`/cats/${id}`} icon="chevron" className="!min-w-9 !px-0 text-rd-ink" />
        <p className="text-[14px] font-extrabold tracking-[-0.02em] text-rd-ink">
          {cat.name}의 생활기록부
        </p>
        <span className="w-9 text-right text-[12.5px] font-bold text-rd-muted tabular-nums">
          {summary.filled}/{TOTAL_QUESTIONS}
        </span>
      </header>

      <div className="grid gap-3 px-4 pt-1">
        <ReportCard
          ref={cardRef}
          cat={cat}
          rows={rows}
          summary={summary}
          onEdit={setEditing}
        />

        {/*
          기록으로 초안 만들기 (P2-1) — 집사가 쓴 문장에서만 근거를 찾는다.
          제안은 제안일 뿐이라 [적용]을 눌러야 저장된다. 근거 문장을 함께 보여주는 이유는,
          왜 이 답이 나왔는지 집사가 검증할 수 있어야 하기 때문이다.
        */}
        {empty.length > 0 && readiness && (
          <section className="rounded-3xl bg-white p-5">
            <p className="text-[15px] font-extrabold tracking-[-0.02em] text-rd-ink">
              기록으로 초안 만들기
            </p>

            {!readiness.ready ? (
              <p className="mt-1.5 text-[12.5px] leading-relaxed text-rd-muted">
                {readiness.hint} (지금까지 {readiness.recordDays}일 기록)
              </p>
            ) : !readiness.canDraft ? (
              <p className="mt-1.5 text-[12.5px] leading-relaxed text-rd-muted">
                근거로 삼을 이야기가 아직 적어요. 냥박사에게 물어보거나 증상 메모를
                남기면 그 문장에서 성격을 찾아볼 수 있어요.
              </p>
            ) : drafts === null ? (
              <>
                <p className="mt-1.5 text-[12.5px] leading-relaxed text-rd-muted">
                  냥박사에게 물어본 말, 증상 메모, 꼭 기억할 것에서 성격 단서를 찾아
                  빈 칸의 답을 제안해요. <b className="text-rd-body">근거 문장을 함께 보여주고,
                  적용을 눌러야 기록됩니다.</b>
                </p>
                <button
                  type="button"
                  onClick={() => void requestDrafts()}
                  disabled={drafting}
                  className="mt-3 h-12 w-full rounded-[14px] bg-rd-forest text-sm font-bold text-white disabled:opacity-60"
                >
                  {drafting ? "기록을 읽는 중…" : `내 기록 ${readiness.textCount}줄에서 초안 찾기`}
                </button>
              </>
            ) : drafts.length === 0 ? (
              <p className="mt-1.5 text-[12.5px] leading-relaxed text-rd-muted">
                성격을 알 만한 단서를 찾지 못했어요. 지어내지 않고 그대로 비워둘게요 —
                아래에서 직접 답해 주세요.
              </p>
            ) : (
              <ul className="mt-3 space-y-2">
                {drafts.map((d) => (
                  <li key={d.key} className="rounded-2xl bg-rd-well p-3.5">
                    <p className="text-[12px] font-bold text-rd-muted">{d.key}</p>
                    <p className="mt-0.5 text-[14px] font-bold text-rd-ink">{d.label}</p>
                    <p className="mt-1.5 border-l-2 border-rd-mint-line pl-2 text-[12.5px] leading-relaxed text-rd-body">
                      “{d.evidence}”
                    </p>
                    <div className="mt-2.5 flex gap-2">
                      <button
                        type="button"
                        onClick={() => void applyDraft(d)}
                        className="h-10 flex-1 rounded-[12px] bg-rd-ink text-[13px] font-bold text-white"
                      >
                        맞아요, 이걸로
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          setDrafts((prev) => prev?.filter((x) => x.key !== d.key) ?? null)
                        }
                        className="h-10 flex-1 rounded-[12px] border border-rd-line bg-white text-[13px] font-semibold text-rd-body"
                      >
                        아니에요
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>
        )}

        {/* 비어 있는 칸 — 칩 한 뭉치. 채울수록 담임 의견이 정확해진다 */}
        {empty.length > 0 && (
          <section className="rounded-3xl bg-white p-5">
            <p className="text-[15px] font-extrabold tracking-[-0.02em] text-rd-ink">
              아직 비어 있는 {empty.length}칸
            </p>
            <p className="mt-[5px] mb-3.5 text-[12.5px] text-rd-muted">
              채울수록 담임 의견이 정확해져요.
            </p>
            <div className="flex flex-wrap gap-2">
              {empty.map((r) => (
                <button
                  key={r.key}
                  type="button"
                  onClick={() => setEditing(r.question)}
                  className="flex min-h-11 items-center gap-1.5 rounded-full border border-dashed border-[#C9CEC9] bg-[#FAFBF8] px-3.5 active:scale-[0.98] active:opacity-70"
                >
                  <span className="text-[13px] font-bold text-rd-ink">{r.key}</span>
                  <span className="font-extrabold text-rd-forest" aria-hidden>
                    +
                  </span>
                </button>
              ))}
            </div>
          </section>
        )}

        <p className="text-center text-[11.5px] text-rd-faint">
          등급은 성격을 나타낸 것이지 잘하고 못하고가 아니에요.
        </p>
      </div>

      {/* 스티키 CTA */}
      <div className="fixed inset-x-4 bottom-[max(26px,env(safe-area-inset-bottom))] z-40 mx-auto max-w-[388px]">
        <button
          onClick={() => void share()}
          disabled={busy || summary.filled === 0}
          className="flex h-[54px] w-full items-center justify-center gap-2 rounded-2xl bg-rd-ink text-[15px] font-extrabold tracking-[-0.02em] text-white shadow-[0_10px_26px_-10px_rgba(0,0,0,.5)] disabled:opacity-50"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
            <path d="M11 5.83 8.4 8.4a1 1 0 0 1-1.4-1.42l4.3-4.3a1 1 0 0 1 1.4 0l4.3 4.3a1 1 0 1 1-1.4 1.42L13 5.83V15a1 1 0 1 1-2 0V5.83Z" />
            <path d="M4 14a1 1 0 0 1 1 1v3a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-3a1 1 0 1 1 2 0v3a3 3 0 0 1-3 3H6a3 3 0 0 1-3-3v-3a1 1 0 0 1 1-1Z" />
          </svg>
          {busy ? "만드는 중…" : "이미지로 저장 · 공유"}
        </button>
        {summary.filled === 0 && (
          <p className="mt-2 text-center text-[12px] text-rd-muted">
            한 칸이라도 채워야 기록부를 뽑을 수 있어요.
          </p>
        )}
      </div>

      {/* 문항 답하기 시트 — 선택 즉시 저장·닫힘 (확인 버튼 없음) */}
      <BottomSheet
        open={editing !== null}
        onClose={() => setEditing(null)}
        title={editing?.key}
      >
        {editing && (
          <>
            <p className="text-[16.5px] font-extrabold tracking-[-0.02em] text-rd-ink text-pretty">
              {editing.question(cat)}
            </p>
            <div className="mt-4 grid gap-2">
              {editing.options.map((o) => {
                const on = o.label === currentAnswer;
                return (
                  <button
                    key={o.label}
                    onClick={() => void answer(editing, o.label)}
                    className={`flex min-h-[52px] w-full items-center gap-2.5 rounded-[14px] border-[1.5px] px-3.5 text-left active:scale-[0.98] ${
                      on ? "border-rd-ink bg-[#F7F8F5]" : "border-rd-line bg-white"
                    }`}
                  >
                    <span
                      className={`w-[26px] flex-none rounded-[6px] py-[2px] text-center text-[11px] font-extrabold ${GRADE_STYLE[o.grade]}`}
                    >
                      {o.grade}
                    </span>
                    <span className="min-w-0 flex-1 text-[14px] font-semibold text-rd-ink">
                      {o.label}
                    </span>
                    <span className="flex-none text-[12px] font-semibold text-rd-muted">
                      {o.note}
                    </span>
                  </button>
                );
              })}
            </div>
          </>
        )}
      </BottomSheet>

      {toast && (
        <div
          role="status"
          className="fixed bottom-24 left-1/2 z-[60] -translate-x-1/2 rounded-full bg-rd-ink px-4 py-2.5 text-[13px] font-semibold text-white [animation:toast-in_.2s_ease]"
        >
          {toast}
        </div>
      )}
    </main>
  );
}
