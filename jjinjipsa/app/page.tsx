"use client";

/*
 * 홈 — "날씨돌" 무드 문법 (찐집사 홈 리디자인.dc.html 1a–1e 이식).
 *
 * 구조: 무드 히어로(씬 + 멘트 + 스코어 + 3칩) → 라이트 그레이 카드 스택.
 * 레이아웃은 5무드가 전부 동일하고 lib/homeMood.ts의 값만 갈린다.
 *
 * 무드·점수·3칩은 **오늘 상태 기록에서 계산한다** (T-53, computeHome 주석).
 * 입력은 "오늘 상태 기록하기" 또는 히어로 칩 탭 → 4항목 시트 (T-51).
 * ?mood=sunny|cloudy|warning|sick|night 는 시안 더미를 그대로 띄우는 미리보기다.
 */

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import MoodHero from "@/components/home/MoodHero";
import MoodHomeHeader from "@/components/home/MoodHomeHeader";
import CareRoutineCard from "@/components/home/CareRoutineCard";
import CareCalendarCard from "@/components/home/CareCalendarCard";
import DoctorTipCard from "@/components/home/DoctorTipCard";
import AdCard from "@/components/home/AdCard";
import EmptyCatCard from "@/components/home/EmptyCatCard";
import LoginBanner from "@/components/home/LoginBanner";
import CatSelectorSheet from "@/components/home/CatSelectorSheet";
import TodayStatusSheet from "@/components/home/TodayStatusSheet";
import { useSelectedCat } from "@/hooks/useSelectedCat";
import { useTodayStatus } from "@/hooks/useTodayStatus";
import { storage } from "@/lib/storage";
import { analyzeWeights } from "@/lib/weightTrend";
import { getCatAge } from "@/lib/catAge";
import { loadDailyOn } from "@/lib/dailyStatus";
import { loadRoutine, saveRoutine } from "@/lib/careRoutine";
import {
  buildCalendar,
  computeHome,
  getMood,
  previewHome,
  type CalendarDay,
} from "@/lib/homeMood";

/** 광고 자리 on/off — 시안 Tweaks의 showAd */
const SHOW_AD = true;

export default function Page() {
  // useSearchParams(무드 미리보기)는 서스펜스 경계가 필요하다 — 홈은 정적 프리렌더 대상
  return (
    <Suspense fallback={null}>
      <Home />
    </Suspense>
  );
}

function Home() {
  const { cats, cat, select, loading } = useSelectedCat();
  const { record, setStatus } = useTodayStatus(cat?.id);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [statusOpen, setStatusOpen] = useState(false);
  const [routines, setRoutines] = useState<boolean[]>([]);
  const [weightNeedsVisit, setWeightNeedsVisit] = useState(false);
  const [calendar, setCalendar] = useState<{ days: CalendarDay[]; range: string }>(
    () => buildCalendar(new Set()),
  );
  const searchParams = useSearchParams();

  // 아이별 부가 데이터 — 루틴 토글, 체중 경고, 캘린더 기록일
  useEffect(() => {
    if (!cat) return;
    setRoutines(loadRoutine(cat.id));
    void storage
      .listWeights(cat.id)
      .then((w) => {
        const growing = getCatAge(cat.birthDate).stage === "kitten";
        setWeightNeedsVisit(analyzeWeights(w, { growing }).needsVisit);
      })
      .catch(() => setWeightNeedsVisit(false));
    void storage
      .listSymptoms(cat.id)
      .then((logs) => {
        const logged = new Set(logs.map((l) => l.occurredAt.slice(0, 10)));
        // 오늘 상태 기록이 있는 날도 점을 찍는다 (지난 11일)
        for (let i = 0; i < 11; i++) {
          const d = new Date();
          d.setDate(d.getDate() - i);
          if (Object.keys(loadDailyOn(cat.id, d)).length > 0) {
            const k = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
            logged.add(k);
          }
        }
        setCalendar(buildCalendar(logged));
      })
      .catch(() => setCalendar(buildCalendar(new Set())));
  }, [cat, record]);

  if (loading) return null;

  // 등록된 아이가 없으면 무드를 띄울 근거 자체가 없다 — 기존 빈 화면 유지
  // pb-nav: 하단 알약 내비가 덮는 높이만큼 띄워 로그인 배너가 그 위에서 끝난다
  if (!cat || !cats || cats.length === 0) {
    return (
      <main className="flex flex-1 flex-col gap-5 px-5 pt-8 pb-nav">
        <EmptyCatCard />
        <div className="mt-auto pt-1">
          <LoginBanner />
        </div>
      </main>
    );
  }

  // ?mood= 미리보기(시안 더미) / 평소엔 오늘 기록으로 계산
  const previewId = searchParams.get("mood");
  const view = previewId
    ? previewHome(getMood(previewId))
    : computeHome({ record, weightNeedsVisit });

  return (
    <main className="relative flex-1 bg-rd-page">
      <MoodHomeHeader
        catName={cat.name}
        catHref={`/cats/${cat.id}`}
        onOpenSelector={() => setSheetOpen(true)}
      />

      <MoodHero view={view} onChipsClick={() => setStatusOpen(true)} />

      {/* 카드 스택 — 히어로를 덮으며 올라온다 */}
      <div className="relative z-[1] flex flex-col gap-3 rounded-t-3xl bg-rd-page px-4 pt-5.5 pb-nav">
        <CareRoutineCard
          done={routines}
          onToggle={(i) => {
            const next = routines.map((v, j) => (j === i ? !v : v));
            setRoutines(next);
            saveRoutine(cat.id, next);
          }}
        />
        <CareCalendarCard days={calendar.days} range={calendar.range} />
        {/* D-day 카드는 접종·재진 데이터가 생기면(T-47) 붙인다 — 더미 D-7은 가짜 알림이다 */}
        <DoctorTipCard mood={view.mood} href={`/cats/${cat.id}/chat`} />
        {SHOW_AD && <AdCard bordered />}

        {/* 오늘 상태 입력 (T-51) — 히어로 칩·점수·무드가 여기서 계산된다 */}
        <button
          type="button"
          onClick={() => setStatusOpen(true)}
          className="flex min-h-[52px] items-center justify-center gap-1.5 rounded-2xl border border-black/5 bg-rd-card text-[14px] font-bold tracking-[-0.02em] text-rd-forest"
        >
          오늘 상태 기록하기 ›
        </button>

        <LoginBanner />
      </div>

      <TodayStatusSheet
        open={statusOpen}
        record={record}
        onSet={setStatus}
        onClose={() => setStatusOpen(false)}
      />

      <CatSelectorSheet
        open={sheetOpen}
        cats={cats}
        selectedId={cat.id}
        onSelect={select}
        onClose={() => setSheetOpen(false)}
      />
    </main>
  );
}
