"use client";

/* 홈 대시보드 (D-10) — "집사의 책상": 인사·건강점수·오늘 기록·빠른 질문·사진진단 */

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { storage, type Cat } from "@/lib/storage";
import { supabase } from "@/lib/supabase";
import { getCatAge } from "@/lib/catAge";
import { todayStr } from "@/lib/dailyCheck";

const CARE_ITEMS = [
  { key: "meal", icon: "🍚", label: "식사" },
  { key: "water", icon: "💧", label: "물" },
  { key: "brush", icon: "🪥", label: "양치" },
  { key: "med", icon: "💊", label: "약" },
];
const QUICK = ["토했어요", "밥 안 먹어요", "설사", "눈곱", "기침", "숨었어요"];

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

export default function Home() {
  const router = useRouter();
  const [cats, setCats] = useState<Cat[] | null>(null);
  const [nick, setNick] = useState("집사");
  const [linked, setLinked] = useState(false);
  const [care, setCare] = useState<string[]>([]);

  const cat = cats?.[0];

  useEffect(() => {
    void storage.listCats().then((list) => {
      setCats(list);
      if (list[0]) setCare(loadCare(list[0].id));
    });
    const applyUser = (u: { is_anonymous?: boolean; user_metadata?: Record<string, unknown> } | null | undefined) => {
      setLinked(!!u && u.is_anonymous === false);
      const n = (u?.user_metadata?.name || u?.user_metadata?.full_name) as string | undefined;
      if (n) setNick(n);
    };
    void supabase.auth.getUser().then(({ data }) => applyUser(data.user));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => {
      applyUser(s?.user);
      void storage.listCats().then(setCats);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  function toggleCare(key: string) {
    if (!cat) return;
    const next = care.includes(key) ? care.filter((k) => k !== key) : [...care, key];
    setCare(next);
    localStorage.setItem(careKey(cat.id), JSON.stringify(next));
  }

  function ask(q: string) {
    if (!cat) return router.push("/profile/new");
    router.push(`/cats/${cat.id}/chat?q=${encodeURIComponent(q)}`);
  }

  // 건강 점수: 기본 60 + 오늘 기록(4×8) + 프로필 완성 보너스
  const score = cat
    ? Math.min(100, 60 + care.length * 8 + (cat.weightKg ? 8 : 0))
    : 0;
  const scoreFace = score >= 85 ? "😺" : score >= 70 ? "🙂" : "😿";

  if (cats === null) return null;

  return (
    <main className="flex flex-1 flex-col gap-4 px-5 pt-8 pb-6">
      {/* 인사 */}
      <header className="flex items-start justify-between">
        <div>
          <p className="text-sm text-muted">안녕하세요 {nick}님 👋</p>
          <h1 className="display mt-0.5 text-[22px] text-secondary">
            {cat ? `오늘 ${cat.name}는 잘 지냈나요?` : "우리 아이를 등록해 주세요"}
          </h1>
        </div>
        {!linked && (
          <Link href="/login" className="mt-1 shrink-0 text-[11px] font-semibold text-muted underline">
            로그인
          </Link>
        )}
      </header>

      {!cat ? (
        <Link
          href="/profile/new"
          className="rounded-card bg-primary/15 p-6 text-center"
        >
          <p className="text-4xl">🐱</p>
          <p className="mt-2 font-bold text-secondary">우리 아이 등록하기</p>
          <p className="mt-1 text-sm text-body">1분이면 끝나요. 나이 환산부터 바로 보여드려요.</p>
        </Link>
      ) : (
        <>
          {/* 건강 점수 */}
          <section className="rounded-card bg-white p-6 shadow-[0_2px_16px_rgba(122,92,67,0.06)]">
            <p className="text-[12px] font-semibold tracking-wide text-muted">오늘의 건강 점수</p>
            <div className="mt-2 flex items-center justify-between">
              <span className="text-5xl">{scoreFace}</span>
              <div className="text-right">
                <span className="display text-4xl text-primary-deep">{score}</span>
                <span className="text-lg font-bold text-primary-deep">%</span>
                <p className="text-[11px] text-muted">
                  {getCatAge(cat.birthDate).stageLabel} · {getCatAge(cat.birthDate).ageLabel}
                </p>
              </div>
            </div>
          </section>

          {/* 오늘 기록 */}
          <section className="rounded-card bg-white p-5 shadow-[0_2px_16px_rgba(122,92,67,0.06)]">
            <p className="text-[12px] font-semibold tracking-wide text-muted">오늘 기록</p>
            <div className="mt-3 grid grid-cols-4 gap-2">
              {CARE_ITEMS.map((it) => {
                const on = care.includes(it.key);
                return (
                  <button
                    key={it.key}
                    onClick={() => toggleCare(it.key)}
                    className={`flex flex-col items-center gap-1 rounded-[18px] py-3 transition ${
                      on ? "bg-mint" : "bg-surface-soft"
                    }`}
                  >
                    <span className="text-xl">{it.icon}</span>
                    <span className="text-[12px] font-semibold text-secondary">{it.label}</span>
                    <span className={`text-[11px] ${on ? "text-success" : "text-muted-soft"}`}>
                      {on ? "✔" : "○"}
                    </span>
                  </button>
                );
              })}
            </div>
          </section>

          {/* 빠른 질문 */}
          <section>
            <p className="mb-2 text-[12px] font-semibold tracking-wide text-muted">빠른 질문</p>
            <div className="flex flex-wrap gap-2">
              {QUICK.map((q) => (
                <button
                  key={q}
                  onClick={() => ask(q)}
                  className="rounded-button bg-white px-3.5 py-2 text-[13px] font-semibold text-secondary shadow-[0_1px_8px_rgba(122,92,67,0.05)] active:scale-95"
                >
                  {q}
                </button>
              ))}
            </div>
          </section>

          {/* 사진 진단 (가장 큰 CTA) */}
          <Link
            href="/diagnose"
            className="rounded-card bg-primary p-6 text-secondary shadow-[0_4px_20px_rgba(246,179,82,0.35)]"
          >
            <p className="text-2xl">📷</p>
            <p className="mt-2 text-lg font-bold">사진으로 진단하기</p>
            <p className="mt-0.5 text-[13px] opacity-80">
              눈·피부·귀, 사진 한 장으로 냥박사가 살펴봐요.
            </p>
          </Link>

          {/* AI 질문 */}
          <Link
            href={`/cats/${cat.id}/chat`}
            className="flex items-center justify-center gap-2 rounded-button border border-hairline bg-white py-3.5 text-sm font-semibold text-secondary"
          >
            🐱 냥박사에게 질문하기
          </Link>
        </>
      )}

      <p className="mt-1 text-center text-[11px] text-muted-soft">
        이 정보는 참고용이며, 정확한 진단은 수의사 상담이 필요합니다.
      </p>
    </main>
  );
}
