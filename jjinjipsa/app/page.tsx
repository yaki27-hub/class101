"use client";

/*
 * 홈 대시보드 (UX 개편) — 지시서 §3 정보구조:
 * Header → 고양이 선택 → 오늘 상태 기록 → 냥박사 질문 → 최근 기록.
 * 건강 점수 제거, 사진진단·AI상담을 냥박사 카드로 통합, 오늘 기록 4항목(식사·물·배변·활동).
 */

import { useState } from "react";
import HomeHeader from "@/components/home/HomeHeader";
import LoginBanner from "@/components/home/LoginBanner";
import EmptyCatCard from "@/components/home/EmptyCatCard";
import CatSelectorCard from "@/components/home/CatSelectorCard";
import CatSelectorSheet from "@/components/home/CatSelectorSheet";
import DailyStatusCard from "@/components/home/DailyStatusCard";
import DoctorChatCard from "@/components/home/DoctorChatCard";
import RecentRecordsSection from "@/components/home/RecentRecordsSection";
import { useSelectedCat } from "@/hooks/useSelectedCat";
import { useTodayStatus } from "@/hooks/useTodayStatus";
import { useRecentRecords } from "@/hooks/useRecentRecords";
import { accentAt } from "@/lib/catColor";

export default function Home() {
  const { cats, cat, select, loading } = useSelectedCat();
  const { record, summary, setStatus } = useTodayStatus(cat?.id);
  const recent = useRecentRecords(cat?.id, 2);
  const [sheetOpen, setSheetOpen] = useState(false);

  if (loading) return null;

  return (
    <main className="flex flex-1 flex-col gap-5 px-5 pb-6">
      <HomeHeader />

      {!cat || !cats || cats.length === 0 ? (
        <EmptyCatCard />
      ) : (
        <>
          <CatSelectorCard
            cat={cat}
            multiple={cats.length > 1}
            accent={
              cats.length > 1
                ? accentAt(cats.findIndex((c) => c.id === cat.id))
                : undefined
            }
            onOpen={() => setSheetOpen(true)}
          />
          <DailyStatusCard
            cat={cat}
            record={record}
            summary={summary}
            onSet={setStatus}
          />
          <DoctorChatCard cat={cat} recent={recent ?? []} />
          <RecentRecordsSection rows={recent ?? []} />

          <CatSelectorSheet
            open={sheetOpen}
            cats={cats}
            selectedId={cat.id}
            onSelect={select}
            onClose={() => setSheetOpen(false)}
          />
        </>
      )}

      {/* 로그인 유도 배너 — 하단 내비 바로 위에 붙도록 남은 공간을 채워 아래로 밀어냄 */}
      <div className="mt-auto pt-1">
        <LoginBanner />
      </div>
    </main>
  );
}
