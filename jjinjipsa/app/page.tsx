"use client";

/*
 * 홈 — "날씨돌" 무드 문법 (찐집사 홈 리디자인.dc.html 1a–1e 이식).
 *
 * 구조: 무드 히어로(씬 + 멘트 + 스코어 + 3칩) → 라이트 그레이 카드 스택.
 * 레이아웃은 5무드가 전부 동일하고 lib/homeMood.ts의 값만 갈린다.
 *
 * ⚠️ 무드·건강 점수·3칩은 아직 **정적 더미**다 (lib/homeMood.ts 주석 참고).
 *    ?mood=sunny|cloudy|warning|sick|night 로 5장을 전부 확인할 수 있다.
 */

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import MoodHero from "@/components/home/MoodHero";
import MoodHomeHeader from "@/components/home/MoodHomeHeader";
import CareRoutineCard from "@/components/home/CareRoutineCard";
import CareCalendarCard from "@/components/home/CareCalendarCard";
import DdayCard from "@/components/home/DdayCard";
import DoctorTipCard from "@/components/home/DoctorTipCard";
import AdCard from "@/components/home/AdCard";
import EmptyCatCard from "@/components/home/EmptyCatCard";
import LoginBanner from "@/components/home/LoginBanner";
import CatSelectorSheet from "@/components/home/CatSelectorSheet";
import { useSelectedCat } from "@/hooks/useSelectedCat";
import { DEFAULT_MOOD, getMood } from "@/lib/homeMood";

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
  const [sheetOpen, setSheetOpen] = useState(false);
  const [routines, setRoutines] = useState<boolean[] | null>(null);
  const searchParams = useSearchParams();

  const mood = getMood(searchParams.get("mood") ?? DEFAULT_MOOD);
  // 루틴을 아직 만지지 않았으면 무드의 기본 완료 상태를 보여준다
  const routineState = routines ?? [...mood.routineDone];

  if (loading) return null;

  // 등록된 아이가 없으면 무드를 띄울 근거 자체가 없다 — 기존 빈 화면 유지
  if (!cat || !cats || cats.length === 0) {
    return (
      <main className="flex flex-1 flex-col gap-5 px-5 pt-8 pb-6">
        <EmptyCatCard />
        <div className="mt-auto pt-1">
          <LoginBanner />
        </div>
      </main>
    );
  }

  return (
    <main className="relative flex-1 bg-rd-page">
      <MoodHomeHeader
        catName={cat.name}
        catHref={`/cats/${cat.id}`}
        onOpenSelector={() => setSheetOpen(true)}
      />

      <MoodHero mood={mood} />

      {/* 카드 스택 — 히어로를 덮으며 올라온다 */}
      <div className="relative z-[1] flex flex-col gap-3 rounded-t-3xl bg-rd-page px-4 pt-5.5 pb-35">
        <CareRoutineCard
          done={routineState}
          onToggle={(i) =>
            setRoutines(routineState.map((v, j) => (j === i ? !v : v)))
          }
        />
        <CareCalendarCard />
        <DdayCard />
        <DoctorTipCard mood={mood} href={`/cats/${cat.id}/chat`} />
        {SHOW_AD && <AdCard bordered />}

        {/*
          오늘 상태 기록 진입 — 무드 히어로가 기존 DailyStatusCard(4항목 입력)를
          걷어내면서 홈에서 기록을 남길 길이 사라졌다. 3칩은 표시 전용이라
          입력 경로를 여기 한 줄로 남겨둔다.
        */}
        <Link
          href={`/cats/${cat.id}/log`}
          className="flex min-h-[52px] items-center justify-center gap-1.5 rounded-2xl border border-black/5 bg-rd-card text-[14px] font-bold tracking-[-0.02em] text-rd-forest"
        >
          오늘 상태 기록하기 ›
        </Link>

        <LoginBanner />
      </div>

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
