"use client";

/*
 * 우리 고양이 상세 — **그 아이 고유 정보만** 소유한다 (docs/정보구조.md 2단계).
 *
 * 전에는 오늘 상태·건강 카드·최근 증상을 그대로 안고 있어서 홈·기록 탭을
 * 통째로 복제했다. 지금은 히어로·생애 시계·메모만 두고, 나머지는
 * **한 줄 요약 + 소유 화면 링크**로 넘긴다.
 */

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { storage, type Cat, type SymptomLog } from "@/lib/storage";
import { CLOCK_SEGMENTS, getCatAge } from "@/lib/catAge";
import { setSelectedCatId } from "@/lib/selectedCat";
import { useTodayStatus } from "@/hooks/useTodayStatus";
import BottomSheet from "@/components/BottomSheet";
import BackButton from "@/components/BackButton";
import WeightSection from "@/components/WeightSection";
import { loadHealthNote, saveHealthNote } from "@/lib/healthNote";
import { IconCat, IconChat, IconPencil, IconTrash } from "@/components/icons";

const SEGMENT_COLORS: Record<string, string> = {
  kitten: "bg-mint",
  junior: "bg-primary",
  adult: "bg-soft-pink",
  mature: "bg-primary-deep",
  senior: "bg-ink",
};

export default function CatDetailPage() {
  const router = useRouter();
  const { id } = useParams<{ id: string }>();
  const [cat, setCat] = useState<Cat | null | undefined>(undefined);
  const [logs, setLogs] = useState<SymptomLog[]>([]);
  const [confirmDel, setConfirmDel] = useState(false);
  const [note, setNote] = useState("");
  const [noteOpen, setNoteOpen] = useState(false);
  const [noteDraft, setNoteDraft] = useState("");
  const [toast, setToast] = useState<string | null>(null);
  // 오늘 상태는 홈이 소유한다 — 여기서는 한 줄 요약만 쓴다
  const { summary } = useTodayStatus(id);

  useEffect(() => {
    void storage.getCat(id).then((c) => {
      setCat(c);
      if (c) setSelectedCatId(c.id); // 이 아이를 홈·AI 탭 기본 선택으로
    });
    void storage.listSymptoms(id).then(setLogs);
    setNote(loadHealthNote(id));
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
  // 오늘 상태를 한 줄로 — 살펴볼 항목이 있으면 그것부터 알린다
  const todaySummaryText =
    summary.abnormalItems.length > 0
      ? `${summary.abnormalItems.map((i) => i.label).join(" · ")} 살펴보기`
      : summary.recordedCount > 0
        ? `오늘 ${summary.recordedCount}/${summary.totalCount}개 기록했어요`
        : "아직 오늘 기록이 없어요";

  return (
    <main className="flex-1 space-y-4 px-5 pt-8 pb-24">
      <header className="flex items-center justify-between">
        <BackButton fallback="/cats" />
        <Link
          href={`/cats/${cat.id}/edit`}
          className="flex min-h-11 items-center gap-1 rounded-button bg-surface-soft px-3.5 text-[12px] font-semibold text-secondary"
        >
          <IconPencil size={13} /> 프로필 수정
        </Link>
      </header>

      {/* 히어로 — 사진 + 이름 + 나이 */}
      <section className="flex items-center gap-4 rounded-card bg-white p-5 border border-hairline">
        {cat.photo ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={cat.photo}
            alt={`${cat.name} 사진`}
            className="size-[84px] flex-none rounded-[22px] object-cover"
          />
        ) : (
          <span className="flex size-[84px] flex-none items-center justify-center rounded-[22px] bg-surface-soft text-muted-soft">
            <IconCat size={44} />
          </span>
        )}
        <div className="min-w-0">
          <p className="display text-[22px] text-secondary">{cat.name}</p>
          <p className="mt-1 inline-flex items-center gap-1 rounded-full bg-primary/15 px-2.5 py-1 text-[12px] font-semibold text-primary-deep">
            {age.stageEmoji} {age.stageLabel}
          </p>
          <p className="mt-1.5 text-[13px] text-body">
            {age.ageLabel}
            {cat.birthEstimated ? " (추정)" : ""} · 사람 나이 {age.humanAge}세
          </p>
          <p className="text-[12px] text-muted-soft">
            {cat.breedGroup}
            {cat.weightKg ? ` · ${cat.weightKg}kg` : ""}
            {cat.neutered ? " · 중성화 완료" : ""}
          </p>
        </div>
      </section>

      {/* 생애 시계 */}
      <section className="rounded-card border border-hairline bg-white p-5">
        <p className="text-sm font-bold text-secondary">{cat.name}의 생애 시계</p>
        <div className="relative mt-4">
          <div className="flex h-3 w-full overflow-hidden rounded-full">
            {CLOCK_SEGMENTS.map((s) => (
              <div
                key={s.stage}
                className={`${SEGMENT_COLORS[s.stage]} ${
                  s.stage === age.stage ? "" : "opacity-35"
                }`}
                style={{ width: `${100 / CLOCK_SEGMENTS.length}%` }}
              />
            ))}
          </div>
          <div
            className="absolute -top-1.5 h-6 w-1.5 -translate-x-1/2 rounded-full bg-secondary"
            style={{ left: `${age.markerRatio * 100}%` }}
            aria-hidden
          />
        </div>
        <div className="mt-2 flex text-[11px] text-muted">
          {CLOCK_SEGMENTS.map((s) => (
            <span
              key={s.stage}
              className={`text-center ${
                s.stage === age.stage ? "font-bold text-secondary" : ""
              }`}
              style={{ width: `${100 / CLOCK_SEGMENTS.length}%` }}
            >
              {s.label}
            </span>
          ))}
        </div>
        <p className="mt-4 rounded-input bg-surface-soft/70 p-3.5 text-sm leading-relaxed text-body">
          {age.stageMessage}
        </p>
      </section>

      {/*
        체중 추이 — 생애 시계와 같은 '그 아이의 시간축' 정보라 상세가 소유한다.
        홈·기록 탭에는 두지 않는다 (docs/정보구조.md §3-1).
      */}
      <WeightSection cat={cat} onCatChange={setCat} />

      {/*
        오늘·기록 요약 — 소유는 홈/기록 탭. 여기서는 상태만 보여주고 넘긴다.
        건강 카드는 따로 줄을 두지 않는다 — 기록 탭의 첫 섹션이라 도착하면 바로 보이고,
        같은 곳으로 가는 링크를 두 줄 두면 그 자체가 새로운 중복이 된다.
      */}
      <section className="overflow-hidden rounded-card border border-hairline bg-white">
        <Link
          href="/"
          className="flex min-h-[60px] items-center gap-3 border-b border-hairline px-5 py-3.5"
        >
          <span className="min-w-0 flex-1">
            <span className="block text-[13px] font-bold text-secondary">오늘 상태</span>
            <span className="mt-0.5 block truncate text-[12.5px] text-muted">
              {todaySummaryText}
            </span>
          </span>
          <span className="flex-none text-[12px] font-semibold text-primary-deep">
            홈에서 기록 ›
          </span>
        </Link>

        <Link href="/records" className="flex min-h-[60px] items-center gap-3 px-5 py-3.5">
          <span className="min-w-0 flex-1">
            <span className="block text-[13px] font-bold text-secondary">
              기록{logs.length > 0 ? ` · ${logs.length}건` : ""}
            </span>
            <span className="mt-0.5 block truncate text-[12.5px] text-muted">
              {latestLog
                ? `${latestLog.occurredAt.slice(5, 10).replace("-", "/")} ${latestLog.summary}`
                : "아직 기록이 없어요"}
            </span>
          </span>
          <span className="flex-none text-[12px] font-semibold text-primary-deep">
            전체 보기 ›
          </span>
        </Link>

      </section>

      {/* 꼭 기억할 것 — 이 아이 고유 정보라 상세가 소유한다 */}
      <section className="rounded-card border border-hairline bg-white p-5">
        <div className="flex items-center justify-between">
          <p className="text-sm font-bold text-secondary">꼭 기억할 것</p>
          <button
            onClick={() => {
              setNoteDraft(note);
              setNoteOpen(true);
            }}
            className="-my-2 -mr-2 flex min-h-11 items-center gap-1 px-2 text-[12px] font-semibold text-primary-deep"
          >
            <IconPencil size={13} /> {note ? "수정" : "추가"}
          </button>
        </div>
        <p className="mt-2 text-[13px] leading-relaxed whitespace-pre-wrap text-body">
          {note || "알레르기, 복용 중인 약, 병원에 꼭 알려야 할 것을 적어두세요."}
        </p>
      </section>

      {/* CTA */}
      <div className="space-y-2">
        <Link
          href={`/cats/${cat.id}/chat`}
          className="flex h-12 w-full items-center justify-center gap-1.5 rounded-button bg-primary text-sm font-bold text-white shadow-[0_8px_20px_rgba(255,141,123,0.35)] active:scale-[0.99]"
        >
          <IconChat size={18} /> 냥박사에게 물어보기
        </Link>
        <button
          onClick={() => setConfirmDel(true)}
          className="flex h-11 w-full items-center justify-center gap-1.5 rounded-button border border-error/30 text-sm font-semibold text-error"
        >
          <IconTrash size={16} /> 이 아이 삭제
        </button>
      </div>

      <p className="text-center text-[11px] text-muted-soft">
        나이 환산은 참고값이에요. 정확한 진단은 수의사 상담이 필요합니다.
      </p>

      {/* 삭제 확인 */}
      {confirmDel && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-secondary/40 px-6">
          <div className="w-full max-w-[340px] rounded-card bg-white p-6">
            <p className="text-lg font-bold text-secondary">{cat.name}를 삭제할까요?</p>
            <p className="mt-2 text-sm text-body">
              프로필·사진·증상 기록·대화가 모두 지워지고 되돌릴 수 없어요.
            </p>
            <div className="mt-4 flex gap-2">
              <button
                onClick={() => setConfirmDel(false)}
                className="h-11 flex-1 rounded-button border border-hairline text-sm font-semibold text-body"
              >
                취소
              </button>
              <button
                onClick={() => void deleteCat()}
                className="h-11 flex-1 rounded-button bg-error text-sm font-bold text-white"
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
