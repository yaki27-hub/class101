"use client";

/*
 * 우리 고양이 상세 — 리디자인 시안 2b 적용.
 *
 * 정보구조는 그대로다 (docs/정보구조.md 2단계): **그 아이 고유 정보만** 소유하고,
 * 오늘 상태·기록은 한 줄 요약 + 소유 화면 링크로 넘긴다.
 * 2뎁스라 무드 그라디언트는 쓰지 않는다 — 라이트 그레이 위 플랫 카드.
 */

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { newId, storage, type Cat, type SymptomLog, type TraitAnswer } from "@/lib/storage";
import { buildReport, TOTAL_QUESTIONS } from "@/lib/personality";
import { CLOCK_SEGMENTS, getCatAge } from "@/lib/catAge";
import { setSelectedCatId } from "@/lib/selectedCat";
import { useTodayStatus } from "@/hooks/useTodayStatus";
import BottomSheet from "@/components/BottomSheet";
import BackButton from "@/components/BackButton";
import WeightSection from "@/components/WeightSection";
import AdCard from "@/components/home/AdCard";
import CatAvatar from "@/components/CatAvatar";
import { loadHealthNote, saveHealthNote } from "@/lib/healthNote";
import {
  categoryMeta,
  loadNotes,
  saveNotes,
  NOTE_CATEGORIES,
  type ImportantNote,
  type NoteCategory,
} from "@/lib/importantNotes";
import { IconChat, IconPencil } from "@/components/icons";

/*
 * 생애 5단계는 서로 구분되는 것이 전부다. 시안의 스티키노트 4색 + 잉크를 그대로 쓴다.
 * 잉크 계열을 여럿 쓰면 청년·중년·시니어가 같은 초록으로 뭉개진다.
 */
const SEGMENT_COLORS: Record<string, string> = {
  kitten: "#6FD9C5",
  junior: "#8FCACF",
  adult: "#FFE066",
  mature: "#FF9E8C",
  senior: "#1A1A1A",
};

/** 시안 라벨 — CLOCK_SEGMENTS는 온보딩도 함께 쓰므로 여기서만 갈아 끼운다 */
const SEGMENT_LABELS: Record<string, string> = { kitten: "아깽이" };

export default function CatDetailPage() {
  const router = useRouter();
  const { id } = useParams<{ id: string }>();
  const [cat, setCat] = useState<Cat | null | undefined>(undefined);
  const [logs, setLogs] = useState<SymptomLog[]>([]);
  const [traits, setTraits] = useState<TraitAnswer[]>([]);
  const [confirmDel, setConfirmDel] = useState(false);
  const [note, setNote] = useState("");
  const [noteOpen, setNoteOpen] = useState(false);
  const [noteDraft, setNoteDraft] = useState("");
  /** 카테고리 항목 (P1-5) — 자유 메모와 별개로 쌓인다 */
  const [notes, setNotes] = useState<ImportantNote[]>([]);
  /** 편집 중인 항목. id가 없으면 새로 추가 */
  const [editNote, setEditNote] = useState<{
    id: string | null;
    category: NoteCategory;
    content: string;
  } | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  // 오늘 상태는 홈이 소유한다 — 여기서는 한 줄 요약만 쓴다
  const { summary } = useTodayStatus(id);

  useEffect(() => {
    void storage.getCat(id).then((c) => {
      setCat(c);
      if (c) setSelectedCatId(c.id); // 이 아이를 홈·AI 탭 기본 선택으로
    });
    void storage.listSymptoms(id).then(setLogs);
    void storage.listTraits(id).then(setTraits);
    setNote(loadHealthNote(id));
    setNotes(loadNotes(id));
  }, [id]);

  function showToast(m: string) {
    setToast(m);
    window.setTimeout(() => setToast(null), 1800);
  }

  function saveNote() {
    saveHealthNote(id, noteDraft.trim());
    setNote(noteDraft.trim());
    setNoteOpen(false);
    showToast("메모를 저장했어요");
  }

  /** 항목 저장 — 내용이 비면 삭제로 본다 (삭제 버튼을 따로 두지 않는다) */
  function commitNote() {
    if (!editNote) return;
    const content = editNote.content.trim();
    let next: ImportantNote[];
    if (!content) {
      next = notes.filter((n) => n.id !== editNote.id);
    } else if (editNote.id) {
      next = notes.map((n) =>
        n.id === editNote.id ? { ...n, category: editNote.category, content } : n,
      );
    } else {
      next = [
        ...notes,
        {
          id: newId(),
          category: editNote.category,
          content,
          createdAt: new Date().toISOString(),
        },
      ];
    }
    saveNotes(id, next);
    setNotes(loadNotes(id));
    setEditNote(null);
    showToast(content ? "저장했어요" : "항목을 지웠어요");
  }

  async function deleteCat() {
    if (!cat) return;
    await storage.deleteCat(cat.id);
    router.push("/");
  }

  if (cat === undefined) return null;
  if (cat === null)
    return (
      <main className="flex flex-1 flex-col items-center justify-center gap-3 px-6">
        <p className="text-sm text-body">등록된 아이를 찾을 수 없어요.</p>
        <Link href="/" className="text-sm font-semibold text-secondary underline">
          홈으로
        </Link>
      </main>
    );

  const age = getCatAge(cat.birthDate);
  const latestLog = logs.length > 0 ? logs[logs.length - 1] : null;
  const reportFilled = buildReport(traits).filter((r) => r.answered).length;
  // 오늘 상태를 한 줄로 — 살펴볼 항목이 있으면 그것부터 알린다
  const todaySummaryText =
    summary.abnormalItems.length > 0
      ? `${summary.abnormalItems.map((i) => i.label).join(" · ")} 살펴보기`
      : summary.recordedCount > 0
        ? `오늘 ${summary.recordedCount}/${summary.totalCount}개 기록했어요`
        : "아직 오늘 기록이 없어요";

  const rows = [
    {
      // 평소 모습 (모카) — 이 아이의 베이스라인 서술은 이 화면이 소유한다
      href: `/cats/${cat.id}/usual`,
      title: `${cat.name}의 평소 모습`,
      sub: "보통 어떤지, 요즘 달라진 건 없는지",
      cta: "보러 가기",
    },
    {
      // 리디자인으로 홈의 4항목 입력이 빠져(T-51) "기록"이라 쓰면 거짓말이 된다
      href: "/",
      title: "오늘 상태",
      sub: todaySummaryText,
      cta: "홈에서 보기",
    },
    {
      href: "/records",
      title: `기록${logs.length > 0 ? ` · ${logs.length}건` : ""}`,
      sub: latestLog
        ? `${latestLog.occurredAt.slice(5, 10).replace("-", "/")} ${latestLog.summary}`
        : "아직 기록이 없어요",
      cta: "전체 보기",
    },
    {
      href: `/cats/${cat.id}/report`,
      title: `${cat.name}의 생활기록부`,
      sub:
        reportFilled > 0
          ? `${reportFilled}/${TOTAL_QUESTIONS} 기재 · 자랑용으로 뽑아보세요`
          : "성격 항목을 채우면 자랑용 카드가 나와요",
      cta: "보러 가기",
    },
  ];

  return (
    <main className="relative flex-1 bg-rd-page">
      {/* 헤더 — 스크롤되는 카드 위로 페이드아웃하며 덮는다 */}
      <div
        className="fixed inset-x-0 top-0 z-30 mx-auto max-w-[420px] pt-[max(8px,env(safe-area-inset-top))]"
        style={{
          background: "linear-gradient(180deg,#F4F5F2 72%,rgba(244,245,242,0))",
        }}
      >
        <div className="flex h-12.5 items-center justify-between px-4">
          <BackButton fallback="/cats" icon="chevron" className="text-rd-ink" />
          <Link
            href={`/cats/${cat.id}/edit`}
            className="flex min-h-11 items-center gap-1.5 rounded-full bg-white px-3.5 text-[12.5px] font-bold text-rd-ink"
          >
            <IconPencil size={13} /> 프로필 수정
          </Link>
        </div>
      </div>

      {/* grid + auto-rows로 둬야 카드가 flex-shrink에 눌리지 않는다 */}
      <div className="grid auto-rows-max gap-3 px-4 pt-24 pb-32">
        {/* 히어로 */}
        <section className="flex items-center gap-4 rounded-3xl bg-rd-card p-5">
          <CatAvatar cat={cat} size={88} radius={26} />
          <div className="min-w-0">
            <p className="display text-[23px] text-rd-ink">{cat.name}</p>
            <span className="mt-1.5 inline-flex items-center gap-1 rounded-full bg-rd-mint-soft px-2.5 py-1 text-[12px] font-extrabold text-rd-forest">
              {age.stageEmoji} {age.stageLabel}
            </span>
            <p className="mt-1.5 text-[13px] tracking-[-0.01em] text-rd-body">
              {age.ageLabel}
              {cat.birthEstimated ? " (추정)" : ""} · 사람 나이 {age.humanAge}세
            </p>
            <p className="mt-0.5 text-[12px] text-rd-faint">
              {cat.breedGroup}
              {cat.weightKg ? ` · ${cat.weightKg}kg` : ""}
              {cat.neutered ? " · 중성화 완료" : ""}
            </p>
          </div>
        </section>

        {/* 생애 시계 */}
        <section className="rounded-3xl bg-rd-card p-5">
          <h2 className="mb-4 text-[16px] font-extrabold tracking-[-0.02em] text-rd-ink">
            {cat.name}의 생애 시계
          </h2>
          <div className="relative mb-2">
            <div className="flex h-3 overflow-hidden rounded-full">
              {CLOCK_SEGMENTS.map((s) => (
                <div
                  key={s.stage}
                  className="flex-1"
                  style={{
                    background: SEGMENT_COLORS[s.stage],
                    opacity: s.stage === age.stage ? 1 : 0.32,
                  }}
                />
              ))}
            </div>
            <div
              className="absolute -top-1.5 h-6 w-1.5 -translate-x-1/2 rounded-full bg-rd-ink"
              style={{ left: `${age.markerRatio * 100}%` }}
              aria-hidden
            />
          </div>
          <div className="flex">
            {CLOCK_SEGMENTS.map((s) => (
              <span
                key={s.stage}
                className={`flex-1 text-center text-[11px] ${
                  s.stage === age.stage
                    ? "font-extrabold text-rd-ink"
                    : "font-medium text-rd-faint"
                }`}
              >
                {SEGMENT_LABELS[s.stage] ?? s.label}
              </span>
            ))}
          </div>
          <p className="mt-4 rounded-[14px] bg-[#F7F8F5] p-3.5 text-[13.5px] leading-[1.65] tracking-[-0.01em] text-rd-body text-pretty">
            {age.stageMessage}
          </p>
        </section>

        {/*
          체중 추이 — 생애 시계와 같은 '그 아이의 시간축' 정보라 상세가 소유한다.
          홈·기록 탭에는 두지 않는다 (docs/정보구조.md §3-1).
        */}
        <WeightSection cat={cat} onCatChange={setCat} />

        {/*
          오늘·기록·생활기록부 — 소유는 각 탭. 여기서는 상태만 보여주고 넘긴다.
        */}
        <section className="overflow-hidden rounded-3xl bg-rd-card">
          {rows.map((r, i) => (
            <Link
              key={r.title}
              href={r.href}
              className={`flex min-h-[60px] items-center gap-3 px-5 py-4 ${
                i < rows.length - 1 ? "border-b border-rd-line-soft" : ""
              }`}
            >
              <span className="min-w-0 flex-1">
                <span className="block text-[14px] font-bold tracking-[-0.02em] text-rd-ink">
                  {r.title}
                </span>
                <span className="mt-0.5 block truncate text-[12.5px] text-rd-muted">
                  {r.sub}
                </span>
              </span>
              <span className="flex-none text-[12px] font-bold text-rd-forest">
                {r.cta} ›
              </span>
            </Link>
          ))}
        </section>

        {/* 꼭 기억할 것 — 이 아이 고유 정보라 상세가 소유한다 (P1-5: 카테고리 항목) */}
        <section className="rounded-3xl bg-rd-card p-5">
          <div className="mb-1 flex items-center justify-between">
            <h2 className="text-[16px] font-extrabold tracking-[-0.02em] text-rd-ink">
              꼭 기억할 것
            </h2>
            <button
              onClick={() => setEditNote({ id: null, category: "medication", content: "" })}
              className="-my-2 -mr-2 flex min-h-11 items-center gap-1 px-2 text-[12px] font-bold text-rd-forest"
            >
              + 항목 추가
            </button>
          </div>
          <p className="text-[12.5px] text-rd-muted">
            복용약·알레르기는 냥박사와 진료 준비 카드가 항상 먼저 참고해요.
          </p>

          {notes.length > 0 && (
            <ul className="mt-3 divide-y divide-rd-line-soft">
              {notes.map((n) => {
                const meta = categoryMeta(n.category);
                return (
                  <li key={n.id}>
                    <button
                      onClick={() =>
                        setEditNote({ id: n.id, category: n.category, content: n.content })
                      }
                      className="flex w-full items-start gap-2.5 py-3 text-left active:opacity-70"
                    >
                      <span className="flex-none text-[15px]" aria-hidden>
                        {meta.glyph}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block text-[12px] font-bold text-rd-muted">
                          {meta.label}
                        </span>
                        <span className="mt-0.5 block text-[13.5px] leading-[1.6] whitespace-pre-wrap text-rd-ink text-pretty">
                          {n.content}
                        </span>
                      </span>
                      <span aria-hidden className="mt-0.5 flex-none text-rd-faint">
                        ›
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}

          {/* 자유 메모 — 항목으로 나누기 애매한 것들. 기존 데이터가 여기 그대로 남는다 */}
          <div className="mt-3 rounded-2xl bg-rd-well p-3.5">
            <div className="mb-1 flex items-center justify-between">
              <p className="text-[12px] font-bold text-rd-muted">그 밖에 적어둔 것</p>
              <button
                onClick={() => {
                  setNoteDraft(note);
                  setNoteOpen(true);
                }}
                className="-my-2 -mr-2 flex min-h-11 items-center gap-1 px-2 text-[12px] font-bold text-rd-forest"
              >
                <IconPencil size={13} /> {note ? "수정" : "추가"}
              </button>
            </div>
            <p className="text-[13px] leading-[1.6] whitespace-pre-wrap text-rd-body text-pretty">
              {note || "이동장을 무서워해요, 낯선 사람 앞에서 숨어요 같은 메모."}
            </p>
          </div>

          {notes.length === 0 && !note && (
            <p className="mt-3 text-[12.5px] leading-relaxed text-rd-faint">
              아직 적어둔 게 없어요. 복용 중인 약이나 알레르기부터 적어두면
              상담이 훨씬 정확해져요.
            </p>
          )}
        </section>

        {/* 광고 자리 — 프로필 정보와 연동된 네이티브 카드 */}
        <AdCard meta="사료 · 프로필 연동" copy="우리 아이 나이에 맞춘 사료 고르기" />

        <button
          onClick={() => setConfirmDel(true)}
          className="flex h-13 w-full items-center justify-center gap-2 rounded-2xl border border-[#F0D5D2] bg-rd-card text-[14px] font-semibold text-[#C4453A]"
        >
          이 아이 삭제
        </button>

        <p className="text-center text-[11px] text-rd-faint">
          나이 환산은 참고값이에요. 정확한 진단은 수의사 상담이 필요합니다.
        </p>
      </div>

      {/* 고정 CTA */}
      <Link
        href={`/cats/${cat.id}/chat`}
        className="fixed inset-x-4 z-40 mx-auto flex h-13.5 max-w-[388px] items-center justify-center gap-2 rounded-2xl bg-rd-forest text-[15px] font-extrabold tracking-[-0.02em] text-white shadow-[0_10px_26px_-10px_rgba(14,91,65,.6)]"
        style={{ bottom: "max(26px, env(safe-area-inset-bottom))" }}
      >
        <IconChat size={19} dotFill="#0E5B41" /> 냥박사에게 물어보기
      </Link>

      {/* 삭제 확인 */}
      {confirmDel && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-6">
          <div className="w-full max-w-[340px] rounded-3xl bg-white p-6">
            <p className="text-lg font-bold text-rd-ink">{cat.name}를 삭제할까요?</p>
            <p className="mt-2 text-sm text-rd-body">
              프로필·사진·증상 기록·대화가 모두 지워지고 되돌릴 수 없어요.
            </p>
            <div className="mt-4 flex gap-2">
              <button
                onClick={() => setConfirmDel(false)}
                className="h-11 flex-1 rounded-[14px] border border-rd-line text-sm font-semibold text-rd-body"
              >
                취소
              </button>
              <button
                onClick={() => void deleteCat()}
                className="h-11 flex-1 rounded-[14px] bg-rd-danger text-sm font-bold text-white"
              >
                삭제
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 꼭 기억할 것 메모 편집 */}
      <BottomSheet open={noteOpen} onClose={() => setNoteOpen(false)} title="꼭 기억할 것">
        <textarea
          value={noteDraft}
          onChange={(e) => setNoteDraft(e.target.value)}
          rows={5}
          maxLength={300}
          placeholder="알레르기, 복용 중인 약, 주의사항 등을 적어주세요"
          className="w-full rounded-input border border-hairline bg-surface-soft/40 p-3 text-base leading-relaxed text-ink focus:border-primary focus:bg-white focus:outline-none"
        />
        <button
          onClick={saveNote}
          className="mt-3 h-12 w-full rounded-button bg-primary text-sm font-bold text-white"
        >
          저장
        </button>
      </BottomSheet>

      {/* 항목 추가·수정 (P1-5) */}
      <BottomSheet
        open={editNote !== null}
        onClose={() => setEditNote(null)}
        title={editNote?.id ? "항목 수정" : "항목 추가"}
      >
        {editNote && (
          <>
            <div className="flex flex-wrap gap-1.5">
              {NOTE_CATEGORIES.map((c) => {
                const on = c.key === editNote.category;
                return (
                  <button
                    key={c.key}
                    onClick={() => setEditNote({ ...editNote, category: c.key })}
                    className={`min-h-10 rounded-full px-3 text-[13px] font-semibold ${
                      on
                        ? "bg-rd-ink text-white"
                        : "border border-rd-line bg-white text-rd-body"
                    }`}
                  >
                    {c.glyph} {c.label}
                  </button>
                );
              })}
            </div>
            <textarea
              value={editNote.content}
              onChange={(e) => setEditNote({ ...editNote, content: e.target.value })}
              rows={3}
              maxLength={200}
              placeholder={categoryMeta(editNote.category).placeholder}
              className="mt-3 w-full rounded-[14px] border border-rd-line bg-rd-page p-3 text-base leading-relaxed text-rd-ink focus:border-rd-ink focus:bg-white focus:outline-none"
            />
            <p className="mt-1.5 text-[11.5px] text-rd-faint">
              {editNote.id
                ? "내용을 비우고 저장하면 이 항목이 지워져요."
                : "진단·처방은 수의사 몫이에요. 여기 적은 건 참고 메모로만 쓰여요."}
            </p>
            <button
              onClick={commitNote}
              className="mt-3 h-12 w-full rounded-[14px] bg-rd-ink text-sm font-bold text-white"
            >
              저장
            </button>
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
