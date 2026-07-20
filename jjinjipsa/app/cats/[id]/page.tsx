"use client";

/* F-02 첫 결과 화면 — 나이 환산 + 생애 시계 + 챗봇 진입 CTA (T-05) */

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { storage, type Cat, type SymptomLog } from "@/lib/storage";
import { CLOCK_SEGMENTS, getCatAge } from "@/lib/catAge";

const SEGMENT_COLORS: Record<string, string> = {
  kitten: "bg-brand-mint",
  junior: "bg-brand-ochre",
  adult: "bg-brand-peach",
  mature: "bg-brand-lavender",
  senior: "bg-brand-teal",
};

export default function CatResultPage() {
  const router = useRouter();
  const { id } = useParams<{ id: string }>();
  const [cat, setCat] = useState<Cat | null | undefined>(undefined);
  const [logs, setLogs] = useState<SymptomLog[]>([]);
  const [illustrating, setIllustrating] = useState(false);
  const [illustError, setIllustError] = useState("");
  const [confirmDel, setConfirmDel] = useState(false);

  useEffect(() => {
    void storage.getCat(id).then(setCat);
    void storage.listSymptoms(id).then(setLogs);
  }, [id]);

  async function makeIllustration() {
    if (!cat?.photo) return;
    setIllustrating(true);
    setIllustError("");
    try {
      const res = await fetch("/api/illustrate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          photo: cat.photo,
          name: cat.name,
          birthDate: cat.birthDate,
          breedGroup: cat.breedGroup,
        }),
      });
      if (res.status === 429) {
        setIllustError(
          "지금은 AI 일러스트 생성이 잠시 막혀 있어요 (무료 등급 한도). 잠시 후 다시 시도하거나 관리자에게 문의해 주세요.",
        );
        return;
      }
      if (!res.ok) {
        setIllustError("일러스트 생성에 실패했어요. 잠시 후 다시 시도해 주세요.");
        return;
      }
      const { image } = (await res.json()) as { image: string };
      const updated = { ...cat, illust: image };
      await storage.saveCat(updated);
      setCat(updated);
    } finally {
      setIllustrating(false);
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
        <Link href="/" className="text-sm font-semibold text-ink underline">
          홈으로
        </Link>
      </main>
    );

  const age = getCatAge(cat.birthDate);

  return (
    <main className="flex-1 space-y-6 px-5 py-8">
      <header className="flex items-center justify-between">
        <Link href="/" className="text-sm font-medium text-muted">
          ← 홈
        </Link>
        <p className="text-[12px] font-semibold uppercase tracking-[1.5px] text-muted">
          Life Clock
        </p>
      </header>

      {/* 와우 모먼트 — 나이 환산 */}
      <section className="flex items-center gap-4 rounded-xl bg-brand-pink p-6 text-white">
        <div className="flex-1">
          <p className="text-[12px] font-semibold uppercase tracking-[1.5px] opacity-80">
            {cat.name} · {age.ageLabel}
            {cat.birthEstimated ? " (추정)" : ""}
          </p>
          <p className="display mt-2 text-[28px] leading-[1.15]">
            사람 나이로
            <br />
            {age.humanAge}세예요
          </p>
          <p className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-white/20 px-3 py-1.5 text-[12px] font-medium">
            {age.stageEmoji} {age.stageLabel}
          </p>
        </div>
        {cat.photo && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={cat.photo}
            alt={`${cat.name} 사진`}
            className="size-[92px] flex-none rounded-[20px] border-[3px] border-white/50 object-cover"
          />
        )}
      </section>

      {/* 생애 시계 */}
      <section className="rounded-lg border border-hairline bg-canvas p-5">
        <h2 className="text-sm font-semibold text-ink">
          {cat.name}의 생애 시계
        </h2>
        <div className="relative mt-4">
          <div className="flex h-3 w-full overflow-hidden rounded-full">
            {CLOCK_SEGMENTS.map((s) => (
              <div
                key={s.stage}
                className={`${SEGMENT_COLORS[s.stage]} ${
                  s.stage === age.stage ? "" : "opacity-40"
                }`}
                style={{ width: `${100 / CLOCK_SEGMENTS.length}%` }}
              />
            ))}
          </div>
          {/* 현재 위치 마커 — 균등 단계 바에서 현재 단계 안 진행도로 배치 */}
          <div
            className="absolute -top-1.5 h-6 w-1.5 -translate-x-1/2 rounded-full bg-ink"
            style={{ left: `${age.markerRatio * 100}%` }}
            aria-hidden
          />
        </div>
        <div className="mt-2 flex text-[11px] text-muted">
          {CLOCK_SEGMENTS.map((s) => (
            <span
              key={s.stage}
              className={`text-center ${
                s.stage === age.stage ? "font-semibold text-ink" : ""
              }`}
              style={{ width: `${100 / CLOCK_SEGMENTS.length}%` }}
            >
              {s.label}
            </span>
          ))}
        </div>
        <p className="mt-4 rounded-md bg-surface-soft p-3.5 text-sm leading-relaxed text-body">
          {age.stageMessage}
        </p>
      </section>

      {/* AI 일러스트 (T-25) — 사진 반영 개인화 */}
      <section className="rounded-xl bg-surface-strong p-5">
        <p className="text-[12px] font-semibold uppercase tracking-[1.5px] text-muted">
          AI 일러스트
        </p>
        <p className="mt-1 text-base font-semibold text-ink">
          {cat.name}의 아늑한 초상화
        </p>
        <p className="mt-1 text-[13px] text-body">
          나이({age.stageLabel})와 사진을 반영해 따뜻한 일러스트로 그려드려요.
        </p>
        {cat.illust && (
          <div className="mt-3 overflow-hidden rounded-2xl border-4 border-brand-ochre">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={cat.illust} alt={`${cat.name} 일러스트`} className="w-full" />
          </div>
        )}
        {illustError && (
          <p className="mt-3 rounded-md border border-hairline bg-canvas p-3 text-[13px] text-muted">
            {illustError}
          </p>
        )}
        {!cat.photo ? (
          <p className="mt-3 rounded-2xl border border-dashed border-hairline bg-canvas p-4 text-center text-[13px] text-muted">
            먼저 프로필 수정에서 사진을 올려주세요 📷
          </p>
        ) : (
          <button
            onClick={() => void makeIllustration()}
            disabled={illustrating}
            className="mt-3.5 h-12 w-full rounded-md bg-brand-teal text-sm font-semibold text-white disabled:opacity-60"
          >
            {illustrating
              ? "그리는 중… 🎨"
              : cat.illust
                ? "다시 그리기 🎨"
                : "일러스트 만들기 🎨"}
          </button>
        )}
      </section>

      {/* 챗봇 진입 CTA (F-08은 T-06~08에서 열림) */}
      <section className="rounded-xl bg-surface-card p-6">
        <p className="text-lg font-semibold text-ink">
          {cat.name}에 대해 궁금한 걸 물어보세요
        </p>
        <p className="mt-1 text-sm text-body">
          나이·품종·기록을 아는 챗봇이 {cat.name} 기준으로 답해드려요.
        </p>
        <Link
          href={`/cats/${cat.id}/chat`}
          className="mt-4 flex h-12 w-full items-center justify-center rounded-md bg-ink text-sm font-semibold text-white active:bg-[#1f1f1f]"
        >
          궁금한 거 물어보기 💬
        </Link>
        <Link
          href={`/cats/${cat.id}/log`}
          className="mt-2 flex h-11 w-full items-center justify-center rounded-md border border-hairline bg-canvas text-sm font-semibold text-body"
        >
          증상 기록하기 ✍️
        </Link>
      </section>

      {/* 최근 증상 기록 */}
      {logs.length > 0 && (
        <section className="rounded-lg border border-hairline bg-canvas p-5">
          <h2 className="text-sm font-semibold text-ink">
            최근 증상 기록 · {logs.length}건
          </h2>
          <ul className="mt-3 space-y-2.5">
            {[...logs]
              .reverse()
              .slice(0, 3)
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
                          className="rounded-full bg-surface-card px-2 py-0.5 text-[11px] font-medium text-ink"
                        >
                          #{t}
                        </span>
                      ))}
                    </p>
                    <p className="mt-0.5 truncate text-[12px] text-muted">
                      {l.summary}
                    </p>
                  </div>
                </li>
              ))}
          </ul>
        </section>
      )}

      {/* 수정 / 삭제 (T-23·T-24) */}
      <div className="flex gap-2">
        <Link
          href={`/cats/${cat.id}/edit`}
          className="flex h-11 flex-1 items-center justify-center rounded-md border border-hairline bg-canvas text-sm font-semibold text-body"
        >
          프로필 수정 ✏️
        </Link>
        <button
          onClick={() => setConfirmDel(true)}
          className="flex h-11 items-center justify-center rounded-md border border-error/40 bg-canvas px-4 text-sm font-semibold text-error"
        >
          삭제 🗑️
        </button>
      </div>

      <p className="text-center text-xs text-muted-soft">
        나이 환산은 통용 공식 기준의 참고값이에요. 정확한 진단은 수의사 상담이
        필요합니다.
      </p>

      {/* 삭제 확인 */}
      {confirmDel && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/50 px-6">
          <div className="w-full max-w-[340px] rounded-2xl bg-canvas p-6">
            <p className="text-lg font-semibold text-ink">
              {cat.name}를 삭제할까요?
            </p>
            <p className="mt-2 text-sm text-body">
              프로필·사진·증상 기록·대화가 모두 지워지고 되돌릴 수 없어요.
            </p>
            <div className="mt-4 flex gap-2">
              <button
                onClick={() => setConfirmDel(false)}
                className="h-11 flex-1 rounded-md border border-hairline text-sm font-semibold text-body"
              >
                취소
              </button>
              <button
                onClick={() => void deleteCat()}
                className="h-11 flex-1 rounded-md bg-error text-sm font-semibold text-white"
              >
                삭제
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
