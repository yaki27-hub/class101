"use client";

/*
 * 냥이 생활기록부 — 칠판 버전 (D-20 · 리디자인 핸드오프 A안).
 *
 * **흰 카드가 없다.** 종이 카드를 판 위에 올리면 판이 배경 그림으로 격하되므로,
 * 글씨를 판에 직접 쓴다 — 이 버전의 핵심 결정이다. 섹션 순서는 요약 먼저:
 * 제목 → 오각 레이더 → 담임 의견 → 행동발달상황 12줄 → 빈 칸 칩.
 *
 * 핸드오프에 없지만 유지한 것 둘:
 *  - 초안 제안 (P2-1) — 집사가 쓴 문장에서 빈 칸 답을 제안. 칠판 톤으로 재도색
 *  - SNS 정사각 카드 (P2-3) — 저장 시트에서 "칠판 사진"과 나란히 고른다
 *
 * 배경 판은 핸드오프와 달리 **콘텐츠와 함께 스크롤**한다. 화면에 고정하면
 * 캡처("판 전체")에 배경을 포함시킬 방법이 없어서다 — fixed 요소는 html-to-image
 * 클론에서 위치가 깨진다. 판 무늬가 거의 균일해서 시각 차이는 미미하다.
 *
 * 색은 rd-* 토큰이 아니라 hex다. 이 화면은 사용자가 명시적으로 고른 "칠판" 컨셉이라
 * 흰 종이 팔레트를 쓰지 않고, 판 전체가 캡처 대상이라 자체 완결이어야 한다.
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
  radarAxes,
  summarize,
  traitKey,
  PERSONALITY_QUESTIONS,
  TOTAL_QUESTIONS,
  type Grade,
  type PersonalityQuestion,
} from "@/lib/personality";
import { shareNodeAsImage } from "@/lib/shareImage";
import { track } from "@/lib/analytics";
import PersonalityRadar from "@/components/PersonalityRadar";
import SquareReportCard from "@/components/SquareReportCard";
import BottomSheet from "@/components/BottomSheet";
import BackButton from "@/components/BackButton";

/* 칠판 팔레트 — 판 배경(#2D4C18)은 grass-clean.png를 brightness(.5)로 누른 실효 색 */
const BOARD = "#2D4C18";
const CHALK = "#F2F5EF";
const ACCENT = "#F5E04A";
const chalk = (a: number) => `rgba(242,245,239,${a})`;

/*
 * 등급 잉크 5색 — 선생님이 등급에 동그라미 치는 그 동작이다.
 * **진하기 순이 아니다.** 밝기 순으로 깔면 색이 "A가 좋고 D가 나쁘다"를
 * 말해버린다 (D-20에서 되돌린 결정 — 칠판으로 옮기면서도 유지).
 */
const GRADE_INK: Record<Grade, string> = {
  "A+": "#F5E04A",
  A: "#9FD8E8",
  B: "#F2F5EF",
  C: "#F6C89A",
  D: "#F2808C",
};

/** 등급 동그라미 26×26 — 본문 줄과 시트 선택지가 같은 것을 쓴다 */
function GradeRing({ grade }: { grade: Grade }) {
  const ink = GRADE_INK[grade];
  return (
    <span
      className="flex size-[26px] flex-none items-center justify-center rounded-full text-[11px] font-extrabold"
      style={{ border: `1.6px solid ${ink}`, color: ink }}
    >
      {grade}
    </span>
  );
}

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
  /** 저장 형식 고르기 — 칠판 사진 / SNS 1:1 (P2-3) */
  const [shareOpen, setShareOpen] = useState(false);
  const boardRef = useRef<HTMLDivElement>(null);
  const squareRef = useRef<HTMLDivElement>(null);

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
    // 초안이 실제로 쓰이는지 (0008) — 근거 문장 수만 보내고 문장 자체는 절대 보내지 않는다
    track("report_draft_requested", { texts: evidence.length });
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
    track("report_draft_applied", { count: 1 });
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

  /** @param kind board = 판 전체 캡처 / square = SNS 1:1 카드 (P2-3) */
  async function share(kind: "board" | "square") {
    const node = kind === "square" ? squareRef.current : boardRef.current;
    if (!node || !cat) return;
    setShareOpen(false);
    setBusy(true);
    const r = await shareNodeAsImage(
      node,
      kind === "square" ? `${cat.name}_생활기록부_카드.png` : `${cat.name}_생활기록부.png`,
      `${cat.name} 생활기록부`,
      // 판 캡처가 흰 바탕이면 모서리·투명 영역이 하얗게 뚫린다
      kind === "board" ? { background: BOARD } : undefined,
    );
    if (r === "downloaded") showToast("이미지를 저장했어요");
    if (r === "failed") showToast("이미지 생성에 실패했어요");
    if (r !== "failed") track("share_card_saved", { kind });
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
  const axes = radarAxes(rows);
  const filled = rows.filter((r) => r.answered);
  const empty = rows.filter((r) => !r.answered);
  const currentAnswer = editing
    ? rows.find((r) => r.key === editing.key)?.answered?.label ?? null
    : null;
  // 4자리(2026학년도)는 점선 폭 안에서 답답하다 — 2자리로 (핸드오프)
  const year = String(new Date().getFullYear()).slice(2);

  return (
    <main className="relative flex-1" style={{ background: BOARD }}>
      {/* 스티키 헤더 — 판 색으로 페이드 (판이 어두우므로 흰 페이드를 쓰지 않는다) */}
      <header
        className="sticky top-0 z-30 flex h-12 items-center justify-between px-2 pt-[env(safe-area-inset-top)]"
        style={{ background: `linear-gradient(180deg, ${BOARD} 70%, rgba(45,76,24,0))` }}
      >
        <BackButton
          fallback={`/cats/${id}`}
          icon="chevron"
          className="!min-w-9 !px-0 text-[#F2F5EF]"
        />
        <p className="text-[14px] font-extrabold tracking-[-0.02em]" style={{ color: CHALK }}>
          {cat.name}의 생활기록부
        </p>
        <span
          className="w-9 text-right text-[12.5px] font-bold tabular-nums"
          style={{ color: chalk(0.7) }}
        >
          {summary.filled}/{TOTAL_QUESTIONS}
        </span>
      </header>

      {/* ── 판 전체 (캡처 대상) — 배경 + 히어로 + 본문 ── */}
      <div ref={boardRef} className="relative -mt-12 overflow-hidden" style={{ background: BOARD }}>
        {/* 배경 판 — 원본 풀밭 초록 그대로는 흰 글자가 안 읽혀 절반으로 누른다 (필수) */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/scenes/grass-clean.png"
          alt=""
          aria-hidden
          className="absolute inset-0 size-full object-cover"
          style={{ filter: "brightness(.5) saturate(.9)" }}
        />
        {/* 비네트 — 위를 살짝 밝히고 아래를 눌러 판을 조명 아래 놓는다 */}
        <div
          aria-hidden
          className="absolute inset-0"
          style={{
            background:
              "radial-gradient(ellipse 130% 70% at 50% 8%, rgba(255,255,255,.06), rgba(0,0,0,.16) 78%)",
          }}
        />

        {/* Hero — 제목·점선·레이더·냥박사 */}
        <div className="relative h-[478px]">
          {/*
            점선 두 줄 — 일부러 미세하게 휘어 있다 (손으로 그은 느낌).
            border dashed로 대체하면 완벽한 직선이 되어 인쇄물처럼 보인다.
          */}
          <svg
            viewBox="0 0 390 210"
            className="absolute top-0 left-1/2 h-[210px] w-[390px] -translate-x-1/2"
            fill="none"
            aria-hidden
          >
            <path
              d="M78,150.5 Q137,147.5 196,150.5 T312,148.5"
              stroke={chalk(0.55)}
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeDasharray="9 8"
            />
            <path
              d="M78,197 Q140,200 196,196.5 T312,198.5"
              stroke={chalk(0.55)}
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeDasharray="9 8"
            />
          </svg>
          <p
            className="absolute top-[158px] w-full text-center text-[29px] leading-[1.15] font-bold"
            style={{
              fontFamily: "Gaegu, cursive",
              color: CHALK,
              textShadow: "0 0 3px rgba(255,255,255,.35)", // 분필 가루 번짐
            }}
          >
            {year}학년도 생활기록부
          </p>

          {/*
            레이더 중심은 화면 중앙보다 19px 왼쪽 — 가장 긴 라벨("호기심 A+")의
            오른쪽 끝이 마스코트 앞에서 멈추는 값. 마스코트를 옮기면 같이 조정.
          */}
          <div
            className="absolute top-[210px] left-1/2"
            style={{ transform: "translateX(calc(-50% - 19px))" }}
          >
            <PersonalityRadar axes={axes} />
          </div>

          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/mascot/m3.png"
            alt="냥박사"
            className="absolute top-[343px] w-[86px]"
            style={{
              left: "calc(50% + 57px)",
              filter: "drop-shadow(0 9px 9px rgba(0,0,0,.32))", // 판 위에 서 있는 느낌
            }}
          />
        </div>

        {/* Body — grid가 아니라 flex다: 캡처(data-noncapture 제거) 때 grid는
            행 높이가 굳은 채 자식만 빠져 겹침이 생긴다 (html-to-image 클론 특성) */}
        <div className="relative flex flex-col gap-5 px-[22px] pt-3.5 pb-[130px]">
          {/* 레이더를 "넓을수록 좋은 성적"으로 읽지 않게 하는 유일한 장치 */}
          <p className="text-center text-[11.5px]" style={{ color: chalk(0.55) }}>
            답한 항목만 그렸어요 · 넓다고 좋은 건 아니에요
          </p>

          {/* 담임 의견 — 분필로 대충 그린 사각형(작은 라운드). 경고가 아니므로 붉은색 금지 */}
          <div
            className="rounded-[6px] px-[15px] py-3.5"
            style={{ border: "1.6px dashed rgba(245,224,74,.55)" }}
          >
            <p className="mb-1.5 text-[12px] font-extrabold" style={{ color: ACCENT }}>
              담임 의견 · 냥박사
            </p>
            <p
              className="text-[13px] leading-[1.7] tracking-[-0.01em] text-pretty"
              style={{ color: CHALK }}
            >
              {summary.type && <b>{summary.type}. </b>}
              {summary.comment}
            </p>
          </div>

          {/* 행동발달상황 — 답한 칸만. 줄을 직접 눌러 고친다 */}
          <section>
            <div
              className="flex items-center justify-between pb-[7px]"
              style={{ borderBottom: `1.6px solid ${chalk(0.42)}` }}
            >
              <p className="text-[13px] font-extrabold tracking-[-0.01em]" style={{ color: CHALK }}>
                행동발달상황
              </p>
              {/* 편집 가능하다는 유일한 신호 — 빼지 말 것 */}
              <p className="text-[11.5px] font-semibold" style={{ color: chalk(0.6) }}>
                누르면 고칠 수 있어요
              </p>
            </div>
            {filled.length === 0 ? (
              <p className="py-4 text-center text-[12.5px]" style={{ color: chalk(0.6) }}>
                아직 적은 게 없어요
              </p>
            ) : (
              <ul>
                {filled.map((r) => (
                  <li key={r.key}>
                    <button
                      type="button"
                      onClick={() => setEditing(r.question)}
                      className="flex min-h-11 w-full items-center gap-2.5 text-left active:scale-[0.98] active:opacity-70"
                      style={{ borderBottom: `1px dashed ${chalk(0.2)}` }}
                    >
                      <span
                        className="w-[74px] flex-none text-[12.5px] font-bold tracking-[-0.01em]"
                        style={{ color: CHALK }}
                      >
                        {r.key}
                      </span>
                      <GradeRing grade={r.answered!.grade} />
                      <span
                        className="min-w-0 flex-1 truncate text-[12.5px]"
                        style={{ color: chalk(0.66) }}
                      >
                        {r.answered!.note}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </section>

          {/* 기록으로 초안 만들기 (P2-1) — 칠판 톤. 적용을 눌러야 저장된다.
              data-noncapture: 앱 도구지 기록부 내용이 아니라 공유 사진에서는 뺀다 */}
          {empty.length > 0 && readiness && (
            <section
              data-noncapture=""
              className="rounded-[6px] px-[15px] py-3.5"
              style={{ border: `1.6px dashed ${chalk(0.32)}` }}
            >
              <p className="text-[13px] font-extrabold tracking-[-0.01em]" style={{ color: CHALK }}>
                기록으로 초안 만들기
              </p>

              {!readiness.ready ? (
                <p className="mt-1.5 text-[12.5px] leading-relaxed" style={{ color: chalk(0.6) }}>
                  {readiness.hint} (지금까지 {readiness.recordDays}일 기록)
                </p>
              ) : !readiness.canDraft ? (
                <p className="mt-1.5 text-[12.5px] leading-relaxed" style={{ color: chalk(0.6) }}>
                  근거로 삼을 이야기가 아직 적어요. 냥박사에게 물어보거나 증상 메모를
                  남기면 그 문장에서 성격을 찾아볼 수 있어요.
                </p>
              ) : drafts === null ? (
                <>
                  <p className="mt-1.5 text-[12.5px] leading-relaxed" style={{ color: chalk(0.6) }}>
                    냥박사에게 물어본 말, 증상 메모, 꼭 기억할 것에서 성격 단서를 찾아
                    빈 칸의 답을 제안해요.{" "}
                    <b style={{ color: chalk(0.85) }}>
                      근거 문장을 함께 보여주고, 적용을 눌러야 기록됩니다.
                    </b>
                  </p>
                  <button
                    type="button"
                    onClick={() => void requestDrafts()}
                    disabled={drafting}
                    className="mt-3 h-11 w-full rounded-[14px] text-[13px] font-extrabold disabled:opacity-60 active:scale-[0.98]"
                    style={{ background: CHALK, color: BOARD }}
                  >
                    {drafting ? "기록을 읽는 중…" : `내 기록 ${readiness.textCount}줄에서 초안 찾기`}
                  </button>
                </>
              ) : drafts.length === 0 ? (
                <p className="mt-1.5 text-[12.5px] leading-relaxed" style={{ color: chalk(0.6) }}>
                  성격을 알 만한 단서를 찾지 못했어요. 지어내지 않고 그대로 비워둘게요 —
                  아래에서 직접 답해 주세요.
                </p>
              ) : (
                <ul className="mt-3 space-y-2">
                  {drafts.map((d) => (
                    <li key={d.key} className="rounded-[10px] bg-[#25411A] p-3.5">
                      <p className="text-[12px] font-bold" style={{ color: chalk(0.6) }}>
                        {d.key}
                      </p>
                      <p className="mt-0.5 text-[14px] font-bold" style={{ color: CHALK }}>
                        {d.label}
                      </p>
                      <p
                        className="mt-1.5 pl-2 text-[12.5px] leading-relaxed"
                        style={{ color: chalk(0.66), borderLeft: `2px solid rgba(245,224,74,.55)` }}
                      >
                        “{d.evidence}”
                      </p>
                      <div className="mt-2.5 flex gap-2">
                        <button
                          type="button"
                          onClick={() => void applyDraft(d)}
                          className="h-10 flex-1 rounded-[12px] text-[13px] font-extrabold active:scale-[0.98]"
                          style={{ background: CHALK, color: BOARD }}
                        >
                          맞아요, 이걸로
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            setDrafts((prev) => prev?.filter((x) => x.key !== d.key) ?? null)
                          }
                          className="h-10 flex-1 rounded-[12px] text-[13px] font-semibold active:scale-[0.98]"
                          style={{ border: `1.6px dashed ${chalk(0.32)}`, color: chalk(0.8) }}
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

          {/* 아직 못 적은 칸 — 칩 한 뭉치 (배경 없음: 판이 보여야 한다) */}
          {empty.length > 0 && (
            <section>
              <p className="text-[15px] font-extrabold tracking-[-0.02em]" style={{ color: CHALK }}>
                아직 못 적은 {empty.length}칸
              </p>
              <p className="mt-[5px] mb-[13px] text-[12.5px]" style={{ color: chalk(0.6) }}>
                채울수록 담임 의견이 정확해져요.
              </p>
              <div className="flex flex-wrap gap-2">
                {empty.map((r) => (
                  <button
                    key={r.key}
                    type="button"
                    onClick={() => setEditing(r.question)}
                    className="flex min-h-11 items-center gap-1.5 rounded-full px-3.5 active:scale-[0.98] active:opacity-70"
                    style={{ border: `1.6px dashed ${chalk(0.45)}` }}
                  >
                    <span className="text-[13px] font-bold" style={{ color: CHALK }}>
                      {r.key}
                    </span>
                    <span className="font-extrabold" style={{ color: ACCENT }} aria-hidden>
                      +
                    </span>
                  </button>
                ))}
              </div>
            </section>
          )}

          <p className="text-center text-[11.5px] leading-[1.6]" style={{ color: chalk(0.5) }}>
            등급은 성격을 적은 것이지 잘하고 못하고가 아니에요.
            <br />
            찐집사에서 발급 · 건강 정보는 담지 않아요.
          </p>
        </div>
      </div>

      {/* 스티키 CTA — 어두운 판 위에서는 밝은 버튼이 primary (색 반전) */}
      <div className="fixed inset-x-4 bottom-[max(26px,env(safe-area-inset-bottom))] z-40 mx-auto max-w-[388px]">
        <button
          onClick={() => setShareOpen(true)}
          disabled={busy || summary.filled === 0}
          className="flex h-14 w-full items-center justify-center gap-2 rounded-2xl text-[15px] font-extrabold tracking-[-0.02em] shadow-[0_8px_16px_rgba(0,19,43,.28)] disabled:opacity-50 active:scale-[0.98]"
          style={{ background: CHALK, color: BOARD }}
        >
          <svg width="19" height="19" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
            <path d="M11 5.83 8.4 8.4a1 1 0 0 1-1.4-1.42l4.3-4.3a1 1 0 0 1 1.4 0l4.3 4.3a1 1 0 1 1-1.4 1.42L13 5.83V15a1 1 0 1 1-2 0V5.83Z" />
            <path d="M4 14a1 1 0 0 1 1 1v3a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-3a1 1 0 1 1 2 0v3a3 3 0 0 1-3 3H6a3 3 0 0 1-3-3v-3a1 1 0 0 1 1-1Z" />
          </svg>
          {busy ? "만드는 중…" : "칠판 사진으로 저장"}
        </button>
        {summary.filled === 0 && (
          <p className="mt-2 text-center text-[12px]" style={{ color: chalk(0.6) }}>
            한 칸이라도 채워야 기록부를 뽑을 수 있어요.
          </p>
        )}
      </div>

      {/* 캡처용 정사각 카드 — 화면 밖이지만 레이아웃은 잡혀 있어야 한다 (P2-3) */}
      <div aria-hidden className="pointer-events-none fixed top-0 left-0 -z-10 w-[380px] opacity-0">
        <SquareReportCard ref={squareRef} cat={cat} rows={rows} summary={summary} />
      </div>

      {/* 저장 형식 고르기 */}
      <BottomSheet
        open={shareOpen}
        onClose={() => setShareOpen(false)}
        title="어떤 사진으로 저장할까요?"
        tone="board"
      >
        <div className="grid gap-2">
          <button
            onClick={() => void share("board")}
            className="rounded-[14px] p-4 text-left active:scale-[0.98]"
            style={{ border: `1.6px solid ${ACCENT}`, background: "rgba(245,224,74,.12)" }}
          >
            <span className="block text-[14.5px] font-extrabold" style={{ color: CHALK }}>
              칠판 그대로
            </span>
            <span className="mt-0.5 block text-[12.5px]" style={{ color: chalk(0.6) }}>
              레이더·담임 의견·12항목이 담긴 판 전체
            </span>
          </button>
          <button
            onClick={() => void share("square")}
            className="rounded-[14px] p-4 text-left active:scale-[0.98]"
            style={{ border: `1.6px dashed ${chalk(0.32)}` }}
          >
            <span className="block text-[14.5px] font-extrabold" style={{ color: CHALK }}>
              SNS용 정사각 카드
            </span>
            <span className="mt-0.5 block text-[12.5px]" style={{ color: chalk(0.6) }}>
              유형 · 별점 · 담임 의견 한 줄. 피드에 올리기 좋아요
            </span>
          </button>
        </div>
      </BottomSheet>

      {/* 문항 답하기 시트 — 선택 즉시 저장·닫힘. 점선→실선 전환이 "확정"의 신호 */}
      <BottomSheet
        open={editing !== null}
        onClose={() => setEditing(null)}
        title={editing?.key}
        tone="board"
      >
        {editing && (
          <>
            <p
              className="text-[16.5px] leading-[1.45] font-extrabold tracking-[-0.02em] text-pretty"
              style={{ color: CHALK }}
            >
              {editing.question(cat)}
            </p>
            <div className="mt-4 grid gap-2">
              {editing.options.map((o) => {
                const on = o.label === currentAnswer;
                return (
                  <button
                    key={o.label}
                    onClick={() => void answer(editing, o.label)}
                    className="flex min-h-[52px] w-full items-center gap-2.5 rounded-[14px] px-3.5 text-left active:scale-[0.98]"
                    style={
                      on
                        ? { border: `1.6px solid ${ACCENT}`, background: "rgba(245,224,74,.12)" }
                        : { border: `1.6px dashed ${chalk(0.32)}` }
                    }
                  >
                    <GradeRing grade={o.grade} />
                    <span
                      className="min-w-0 flex-1 text-[14px] font-semibold tracking-[-0.01em]"
                      style={{ color: CHALK }}
                    >
                      {o.label}
                    </span>
                    <span className="flex-none text-[12px] font-semibold" style={{ color: chalk(0.6) }}>
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
