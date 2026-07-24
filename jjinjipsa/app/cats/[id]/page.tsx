"use client";

/* 우리 고양이 상세 대시보드 — 히어로·오늘 상태·생애시계·기록·CTA (건강점수 제거, 오늘 상태 연동) */

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { storage, type Cat, type SymptomLog } from "@/lib/storage";
import { CLOCK_SEGMENTS, getCatAge } from "@/lib/catAge";
import { setSelectedCatId } from "@/lib/selectedCat";
import { useTodayStatus } from "@/hooks/useTodayStatus";
import DailyStatusCard from "@/components/home/DailyStatusCard";
import HealthCard from "@/components/HealthCard";
import BottomSheet from "@/components/BottomSheet";
import { loadHealthNote, saveHealthNote, buildHealthText } from "@/lib/healthNote";
import { IconCat, IconChat, IconPencil, IconTrash } from "@/components/icons";

function dataURLToFile(dataUrl: string, filename: string): File {
  const [head, b64] = dataUrl.split(",");
  const mime = /:(.*?);/.exec(head)?.[1] ?? "image/png";
  const bin = atob(b64);
  const arr = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
  return new File([arr], filename, { type: mime });
}

function todayLabel(): string {
  const d = new Date();
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, "0")}.${String(d.getDate()).padStart(2, "0")}`;
}

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
  const [busy, setBusy] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);
  const { record, summary, setStatus } = useTodayStatus(id);

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

  async function shareText() {
    if (!cat) return;
    const text = buildHealthText(cat, note, record, logs);
    try {
      if (navigator.share) await navigator.share({ title: `${cat.name} 건강 카드`, text });
      else {
        await navigator.clipboard.writeText(text);
        showToast("요약을 복사했어요");
      }
    } catch {
      /* 사용자 취소 */
    }
  }

  async function shareImage() {
    const node = cardRef.current;
    if (!node || !cat) return;
    setBusy(true);
    try {
      const { toPng } = await import("html-to-image");
      const dataUrl = await toPng(node, {
        pixelRatio: 2,
        backgroundColor: "#ffffff",
        cacheBust: true,
      });
      const file = dataURLToFile(dataUrl, `${cat.name}_건강카드.png`);
      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], title: `${cat.name} 건강 카드` });
      } else {
        const a = document.createElement("a");
        a.href = dataUrl;
        a.download = file.name;
        a.click();
        showToast("이미지를 저장했어요");
      }
    } catch {
      showToast("이미지 생성에 실패했어요");
    } finally {
      setBusy(false);
    }
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

  return (
    <main className="flex-1 space-y-4 px-5 pt-8 pb-24">
      <header className="flex items-center justify-between">
        <Link href="/" className="text-sm font-medium text-muted">
          ← 홈
        </Link>
        <Link
          href={`/cats/${cat.id}/edit`}
          className="flex items-center gap-1 rounded-full bg-surface-soft px-3 py-1.5 text-[12px] font-semibold text-secondary"
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

      {/* 오늘 상태 (홈과 동일 데이터 연동) */}
      <DailyStatusCard
        cat={cat}
        record={record}
        summary={summary}
        onSet={setStatus}
      />

      {/* 건강 카드 — 병원·펫시터 공유 */}
      <section className="space-y-3">
        <div className="flex items-center justify-between px-1">
          <div>
            <p className="display text-[18px] text-secondary">건강 카드</p>
            <p className="text-[12px] text-muted">병원·펫시터에게 한 장으로 공유해요</p>
          </div>
          <button
            onClick={() => {
              setNoteDraft(note);
              setNoteOpen(true);
            }}
            className="flex items-center gap-1 rounded-full bg-surface-soft px-3 py-1.5 text-[12px] font-semibold text-secondary"
          >
            <IconPencil size={13} /> 메모
          </button>
        </div>

        <HealthCard
          ref={cardRef}
          cat={cat}
          note={note}
          record={record}
          logs={logs}
          dateStr={todayLabel()}
        />

        <div className="flex gap-2">
          <button
            onClick={() => void shareText()}
            className="h-11 flex-1 rounded-button border border-hairline bg-white text-sm font-semibold text-secondary"
          >
            텍스트 공유
          </button>
          <button
            onClick={() => void shareImage()}
            disabled={busy}
            className="h-11 flex-1 rounded-button bg-primary text-sm font-bold text-white disabled:opacity-60"
          >
            {busy ? "만드는 중…" : "이미지로 저장·공유"}
          </button>
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

      {/* 최근 증상 기록 */}
      <section className="rounded-card bg-white p-5 border border-hairline">
        <div className="flex items-center justify-between">
          <p className="text-sm font-bold text-secondary">
            최근 증상 기록{logs.length > 0 ? ` · ${logs.length}건` : ""}
          </p>
          <Link
            href={`/cats/${cat.id}/log`}
            className="text-[12px] font-semibold text-primary-deep"
          >
            + 기록하기
          </Link>
        </div>
        {logs.length === 0 ? (
          <p className="mt-3 rounded-input bg-surface-soft/70 py-6 text-center text-[13px] text-muted">
            아직 기록이 없어요. 챗봇 대화나 증상 기록이 여기에 모여요.
          </p>
        ) : (
          <ul className="mt-3 space-y-2.5">
            {[...logs]
              .reverse()
              .slice(0, 4)
              .map((l) => (
                <li key={l.id} className="flex items-start gap-2.5">
                  <span className="mt-0.5 text-[11px] font-medium whitespace-nowrap text-muted">
                    {l.occurredAt.slice(5, 10).replace("-", "/")}
                  </span>
                  <div className="min-w-0">
                    <p className="flex flex-wrap gap-1">
                      {l.tags.map((t) => (
                        <span
                          key={t}
                          className="rounded-full bg-soft-pink px-2 py-0.5 text-[11px] font-semibold text-secondary"
                        >
                          #{t}
                        </span>
                      ))}
                    </p>
                    <p className="mt-0.5 truncate text-[12px] text-body">{l.summary}</p>
                  </div>
                </li>
              ))}
          </ul>
        )}
      </section>

      {/* CTA */}
      <div className="space-y-2">
        <Link
          href={`/cats/${cat.id}/chat`}
          className="flex h-12 w-full items-center justify-center gap-1.5 rounded-full bg-primary text-sm font-bold text-white shadow-[0_8px_20px_rgba(255,141,123,0.35)] active:scale-[0.99]"
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
          className="w-full rounded-input border border-hairline bg-surface-soft/40 p-3 text-[14px] leading-relaxed text-ink focus:border-primary focus:bg-white focus:outline-none"
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
