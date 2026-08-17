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
import TopBar from "@/components/TopBar";
import CareRoutineCard from "@/components/home/CareRoutineCard";
import CareCalendarCard from "@/components/home/CareCalendarCard";
import DoctorTipCard from "@/components/home/DoctorTipCard";
import AdCard from "@/components/home/AdCard";
import EmptyCatCard from "@/components/home/EmptyCatCard";
import QuickSymptomCard from "@/components/home/QuickSymptomCard";
import BrushMilestoneCard from "@/components/home/BrushMilestoneCard";
import WeeklyReportCard from "@/components/home/WeeklyReportCard";
import LoginBanner from "@/components/home/LoginBanner";
import CatSelectorSheet from "@/components/home/CatSelectorSheet";
import TodayStatusSheet from "@/components/home/TodayStatusSheet";
import { useSelectedCat } from "@/hooks/useSelectedCat";
import { useTodayStatus } from "@/hooks/useTodayStatus";
import { storage } from "@/lib/storage";
import { analyzeWeights } from "@/lib/weightTrend";
import { getCatAge } from "@/lib/catAge";
import { loadDailyOn } from "@/lib/dailyStatus";
import { BRUSH_MILESTONES, brushStreak, loadRoutine, saveRoutine } from "@/lib/careRoutine";
import { MIN_RECORD_DAYS, WEEK_DAYS } from "@/lib/weeklyReport";
import { track } from "@/lib/analytics";
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

  /** 최근 7일 중 기록이 있는 날 — 주간 리포트 진입점 노출 조건 (P1-2) */
  const [weekRecordedDays, setWeekRecordedDays] = useState(0);
  /** 양치 연속 일수 (P1-3) */
  const [streak, setStreak] = useState(0);

  // 아이별 부가 데이터 — 루틴 토글, 체중 경고, 캘린더 기록일, 주간 기록일 수
  useEffect(() => {
    if (!cat) return;
    setRoutines(loadRoutine(cat.id));
    setStreak(brushStreak(cat.id));
    setWeekRecordedDays(
      Array.from({ length: WEEK_DAYS }, (_, i) => {
        const d = new Date();
        d.setDate(d.getDate() - i);
        return Object.keys(loadDailyOn(cat.id, d)).length > 0 ? 1 : 0;
      }).reduce<number>((a, b) => a + b, 0),
    );
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
      {/* 모카 상단바 — 아바타·이름(아이 전환) + 설정 기어 */}
      <TopBar cat={cat} onTitleClick={() => setSheetOpen(true)} />

      <MoodHero
        view={view}
        days={
          cat.createdAt
            ? Math.floor((Date.now() - new Date(cat.createdAt).getTime()) / 86400000) + 1
            : undefined
        }
        onChipsClick={() => setStatusOpen(true)}
      />

      {/* 카드 스택 — 히어로를 덮으며 올라온다 */}
      <div className="relative z-[1] flex flex-col gap-3 rounded-t-3xl bg-rd-page px-4 pt-5.5 pb-nav">
        {/* 이상 기록 진입점 (P0-2) — 상태 기록 바로 아래, 핵심 루프의 분기점 */}
        <QuickSymptomCard catId={cat.id} />

        {/* 주간 리포트 (P1-2) — 기록이 쌓였을 때만. 빈 리포트를 열게 하지 않는다 */}
        {weekRecordedDays >= MIN_RECORD_DAYS && (
          <WeeklyReportCard
            catId={cat.id}
            catName={cat.name}
            recordedDays={weekRecordedDays}
          />
        )}
        {/* 양치 마일스톤 (P2-4) — 7·15·30일 그날에만. 루틴 카드 바로 위에서 축하한다 */}
        {BRUSH_MILESTONES.includes(streak) && (
          <BrushMilestoneCard streak={streak} catName={cat.name} />
        )}
        <CareRoutineCard
          done={routines}
          brushStreak={streak}
          onToggle={(i) => {
            const next = routines.map((v, j) => (j === i ? !v : v));
            setRoutines(next);
            saveRoutine(cat.id, next);
            if (i === 0) setStreak(brushStreak(cat.id)); // 양치 토글 즉시 반영
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
        onSet={(type, level, label) => {
          setStatus(type, level, label);
          /*
           * 오늘냥 기록률 지표 (0008). 항목을 누를 때마다 한 줄 남기고
           * 집계는 (user, day) 기준으로 센다 — items는 이 시점에 채워진 항목 수라
           * 하루 최댓값이 "4개를 다 채웠는가"가 된다. 무엇을 골랐는지는 보내지 않는다.
           */
          track("daily_status_saved", {
            items: Object.keys({ ...record, [type]: true }).length,
          });
        }}
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
