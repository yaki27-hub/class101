"use client";

/*
 * [프로토타입] value-first 온보딩 (1차) — "생일 한 칸 → 즉시 나이 결과 → 첫 질문".
 * 기존 홈/등록 폼은 그대로 두고, 이 화면만으로 가치를 먼저 체험시키는 흐름을 검증한다.
 */

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { newId, storage, type Cat } from "@/lib/storage";
import { CLOCK_SEGMENTS, getCatAge } from "@/lib/catAge";
import { getSuggestedQuestions } from "@/lib/suggestedQuestions";
import { setSelectedCatId } from "@/lib/selectedCat";

const SEGMENT_COLORS: Record<string, string> = {
  kitten: "bg-mint",
  junior: "bg-primary",
  adult: "bg-soft-pink",
  mature: "bg-primary-deep",
  senior: "bg-secondary",
};

// 생일을 모를 때: 대략 단계 → 중간 나이의 추정 생일
const ROUGH = [
  { label: "아기 (1살 미만)", years: 0.5 },
  { label: "청년 (1~6살)", years: 3 },
  { label: "중년 (7~10살)", years: 8 },
  { label: "시니어 (11살+)", years: 13 },
];

function isoFromYearsAgo(years: number): string {
  const d = new Date();
  d.setFullYear(d.getFullYear() - Math.floor(years));
  d.setMonth(d.getMonth() - Math.round((years % 1) * 12));
  return d.toISOString().slice(0, 10);
}

export default function OnboardPrototype() {
  const router = useRouter();
  const [birthDate, setBirthDate] = useState("");
  const [estimated, setEstimated] = useState(false);
  const [dontKnow, setDontKnow] = useState(false);
  const [busy, setBusy] = useState(false);

  const age = useMemo(
    () => (birthDate ? getCatAge(birthDate) : null),
    [birthDate],
  );

  // 나이만 아는 임시 고양이 → 추천 질문 생성용
  const draftCat: Cat | null = birthDate
    ? {
        id: "draft", name: "우리 아이", birthDate, birthEstimated: estimated,
        gender: "unknown", neutered: false, breedGroup: "코숏", weightKg: null,
        conditions: [], indoor: true, avatar: null, photo: null, illust: null,
        createdAt: "", updatedAt: "",
      }
    : null;

  async function startChat(question?: string) {
    if (!birthDate || busy) return;
    setBusy(true);
    const now = new Date().toISOString();
    const id = newId();
    const cat: Cat = {
      id, name: "우리 아이", birthDate, birthEstimated: estimated,
      gender: "unknown", neutered: false, breedGroup: "코숏", weightKg: null,
      conditions: [], indoor: true, avatar: null, photo: null, illust: null,
      createdAt: now, updatedAt: now,
    };
    await storage.saveCat(cat);
    setSelectedCatId(id);
    const q = question ? `?q=${encodeURIComponent(question)}` : "";
    router.push(`/cats/${id}/chat${q}`);
  }

  return (
    <main className="flex flex-1 flex-col gap-5 px-5 pt-10 pb-24">
      {/* Step 1 — 생일 한 칸 */}
      <section>
        <p className="text-sm text-muted">반가워요 🐾</p>
        <h1 className="display mt-1 text-[24px] leading-snug text-secondary">
          우리 아이 생일이<br />언제예요?
        </h1>
        <p className="mt-2 text-[14px] text-body">
          생일만 알려주면 <b className="text-secondary">사람 나이</b>로 바로 환산해드려요.
        </p>

        {!dontKnow ? (
          <>
            <input
              type="date"
              value={birthDate}
              max={new Date().toISOString().slice(0, 10)}
              onChange={(e) => {
                setBirthDate(e.target.value);
                setEstimated(false);
              }}
              className="mt-4 h-12 w-full rounded-input border border-hairline bg-white px-4 py-3 text-base text-ink focus:border-primary focus:outline-none"
            />
            <button
              onClick={() => setDontKnow(true)}
              className="mt-2 text-[13px] font-semibold text-muted underline"
            >
              생일을 몰라요
            </button>
          </>
        ) : (
          <div className="mt-4 grid grid-cols-2 gap-2">
            {ROUGH.map((r) => {
              const iso = isoFromYearsAgo(r.years);
              const on = estimated && birthDate === iso;
              return (
                <button
                  key={r.label}
                  onClick={() => {
                    setBirthDate(iso);
                    setEstimated(true);
                  }}
                  className={`rounded-input border px-3 py-3 text-[13px] font-semibold transition ${
                    on
                      ? "border-primary bg-primary/10 text-primary-deep"
                      : "border-hairline bg-white text-secondary"
                  }`}
                >
                  {r.label}
                </button>
              );
            })}
            <button
              onClick={() => {
                setDontKnow(false);
                setEstimated(false);
                setBirthDate("");
              }}
              className="col-span-2 text-[13px] font-semibold text-muted underline"
            >
              ← 생일로 정확히 입력할래요
            </button>
          </div>
        )}
      </section>

      {/* Step 2 — 즉시 나이 결과 + 첫 질문 (생일 넣으면 바로 등장) */}
      {age && draftCat && (
        <>
          <section className="rounded-card bg-white p-6 text-center border border-hairline">
            <p className="text-[13px] font-semibold text-muted">
              {age.stageEmoji} {age.stageLabel}
              {estimated ? " (추정)" : ""} · {age.ageLabel}
            </p>
            <p className="display mt-1 text-[30px] text-secondary">
              사람 나이 <span className="text-primary-deep">{age.humanAge}세</span>예요
            </p>
            {/* 미니 생애시계 */}
            <div className="mt-4 flex h-2.5 w-full overflow-hidden rounded-full">
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
            <p className="mt-4 rounded-input bg-surface-soft/70 p-3.5 text-[13px] leading-relaxed text-body">
              {age.stageMessage}
            </p>
          </section>

          <section>
            <p className="px-1 text-[13px] font-bold text-secondary">
              바로 물어볼 수 있어요 👇
            </p>
            <div className="mt-2 space-y-2">
              {getSuggestedQuestions(draftCat).map((q) => (
                <button
                  key={q}
                  onClick={() => void startChat(q)}
                  disabled={busy}
                  className="flex w-full items-center gap-2 rounded-card bg-white px-4 py-3.5 text-left text-[14px] font-semibold text-secondary border border-hairline active:scale-[0.99] disabled:opacity-60"
                >
                  <span className="size-1.5 flex-none rounded-full bg-primary" aria-hidden />
                  {q}
                </button>
              ))}
            </div>
            <button
              onClick={() => void startChat()}
              disabled={busy}
              className="mt-3 h-12 w-full rounded-button bg-primary py-3.5 text-sm font-bold text-white active:scale-[0.99] disabled:opacity-60"
            >
              {busy ? "준비 중…" : "냥박사와 대화 시작하기 →"}
            </button>
            <p className="mt-2 text-center text-[12px] text-muted">
              이름·품종·체중은 나중에 채워도 돼요.
            </p>
          </section>
        </>
      )}

      <Link href="/" className="mt-auto text-center text-[12px] text-muted-soft underline">
        건너뛰고 홈으로
      </Link>
    </main>
  );
}
