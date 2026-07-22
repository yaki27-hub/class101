"use client";

/* 우리 고양이 상세 대시보드 (D-10 Phase 3) — 히어로·건강점수·오늘 케어·생애시계·기록·CTA */

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { storage, type Cat, type SymptomLog } from "@/lib/storage";
import { CLOCK_SEGMENTS, getCatAge } from "@/lib/catAge";
import { todayStr } from "@/lib/dailyCheck";
import { setSelectedCatId } from "@/lib/selectedCat";

const SEGMENT_COLORS: Record<string, string> = {
  kitten: "bg-mint",
  junior: "bg-primary",
  adult: "bg-soft-pink",
  mature: "bg-primary-deep",
  senior: "bg-secondary",
};

const CARE_ITEMS = [
  { key: "meal", icon: "🍚", label: "식사" },
  { key: "water", icon: "💧", label: "물" },
  { key: "brush", icon: "🪥", label: "양치" },
  { key: "med", icon: "💊", label: "약" },
];

function careKey(catId: string) {
  return `jjinjipsa:care:${catId}:${todayStr()}`;
}
function loadCare(catId: string): string[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(careKey(catId)) || "[]");
  } catch {
    return [];
  }
}

export default function CatDetailPage() {
  const router = useRouter();
  const { id } = useParams<{ id: string }>();
  const [cat, setCat] = useState<Cat | null | undefined>(undefined);
  const [logs, setLogs] = useState<SymptomLog[]>([]);
  const [care, setCare] = useState<string[]>([]);
  const [confirmDel, setConfirmDel] = useState(false);

  useEffect(() => {
    void storage.getCat(id).then((c) => {
      setCat(c);
      if (c) setSelectedCatId(c.id); // 이 아이를 홈·AI 탭 기본 선택으로
    });
    void storage.listSymptoms(id).then(setLogs);
    setCare(loadCare(id));
  }, [id]);

  function toggleCare(key: string) {
    const next = care.includes(key) ? care.filter((k) => k !== key) : [...care, key];
    setCare(next);
    localStorage.setItem(careKey(id), JSON.stringify(next));
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
  // 건강 점수: 기본 60 + 오늘 기록(4×8) + 프로필 완성 보너스 (홈과 동일 공식)
  const score = Math.min(100, 60 + care.length * 8 + (cat.weightKg ? 8 : 0));
  const scoreFace = score >= 85 ? "😺" : score >= 70 ? "🙂" : "🐱";

  return (
    <main className="flex-1 space-y-4 px-5 pt-8 pb-24">
      <header className="flex items-center justify-between">
        <Link href="/" className="text-sm font-medium text-muted">
          ← 홈
        </Link>
        <Link
          href={`/cats/${cat.id}/edit`}
          className="rounded-full bg-surface-soft px-3 py-1.5 text-[12px] font-semibold text-secondary"
        >
          ✏️ 프로필 수정
        </Link>
      </header>

      {/* 히어로 — 사진 + 이름 + 나이 */}
      <section className="flex items-center gap-4 rounded-card bg-white p-5 shadow-[0_2px_16px_rgba(122,92,67,0.06)]">
        {cat.photo ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={cat.photo}
            alt={`${cat.name} 사진`}
            className="size-[84px] flex-none rounded-[22px] object-cover"
          />
        ) : (
          <span className="flex size-[84px] flex-none items-center justify-center rounded-[22px] bg-surface-soft text-4xl">
            🐱
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

      {/* 건강 점수 */}
      <section className="flex items-center justify-between rounded-card bg-white p-5 shadow-[0_2px_16px_rgba(122,92,67,0.06)]">
        <div>
          <p className="text-sm font-bold text-secondary">오늘의 건강 점수</p>
          <p className="mt-0.5 text-[12px] text-muted">
            오늘 케어를 기록할수록 올라가요
          </p>
        </div>
        <div className="flex items-center gap-2.5">
          <span className="text-4xl">{scoreFace}</span>
          <span className="display text-[30px] text-primary-deep">
            {score}
            <span className="text-lg">%</span>
          </span>
        </div>
      </section>

      {/* 오늘의 케어 */}
      <section className="rounded-card bg-white p-5 shadow-[0_2px_16px_rgba(122,92,67,0.06)]">
        <p className="text-sm font-bold text-secondary">오늘의 케어</p>
        <div className="mt-3 grid grid-cols-4 gap-2">
          {CARE_ITEMS.map((item) => {
            const on = care.includes(item.key);
            return (
              <button
                key={item.key}
                onClick={() => toggleCare(item.key)}
                className={`flex flex-col items-center gap-1.5 rounded-input py-3 transition active:scale-95 ${
                  on ? "bg-mint/60" : "bg-surface-soft/70"
                }`}
              >
                <span className="text-2xl">{item.icon}</span>
                <span className="text-[13px] font-semibold text-secondary">
                  {item.label}
                </span>
                <span className={`text-[11px] ${on ? "text-success" : "text-muted-soft"}`}>
                  {on ? "✓ 완료" : "○"}
                </span>
              </button>
            );
          })}
        </div>
      </section>

      {/* 생애 시계 */}
      <section className="rounded-card bg-white p-5 shadow-[0_2px_16px_rgba(122,92,67,0.06)]">
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
      <section className="rounded-card bg-white p-5 shadow-[0_2px_16px_rgba(122,92,67,0.06)]">
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
          className="flex h-12 w-full items-center justify-center rounded-button bg-primary text-sm font-bold text-white active:scale-[0.99]"
        >
          💬 냥박사에게 물어보기
        </Link>
        <button
          onClick={() => setConfirmDel(true)}
          className="flex h-11 w-full items-center justify-center rounded-button border border-error/30 text-sm font-semibold text-error"
        >
          이 아이 삭제 🗑️
        </button>
      </div>

      <p className="text-center text-[11px] text-muted-soft">
        나이 환산·건강 점수는 참고값이에요. 정확한 진단은 수의사 상담이 필요합니다.
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
    </main>
  );
}
