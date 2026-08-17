"use client";

/*
 * 홈 히어로 — 모카 리스킨 (피그마 "오늘 — 홈").
 *
 * 무드 그라디언트 + 흰 글자를 버리고, **일러스트가 크림으로 녹아내리고 그 아래
 * 잉크 글자**가 앉는 문법으로 바꿨다. 무드는 배경색이 아니라 씬 그림과 문장이
 * 말한다 — 색으로 상태를 외치지 않는 것이 모카 톤의 핵심이다.
 *
 * 지오메트리는 이전 구조를 유지한다 (히어로 720 / 씬 440 / 콘텐츠 -420 끌올).
 * 카드 스택이 히어로를 덮으며 올라오는 스크롤 문법이 여기 걸려 있어서다.
 */

import { IconBowl, IconLitter, IconWater } from "@/components/icons";
import { SCENE_SIZE, type HomeView } from "@/lib/homeMood";

const HERO_H = 720;
const SCENE_H = 440;
const CONTENT_PULL = 420;
/** 크림 페이지색 — rd-page와 같은 값 (그라디언트 정지점에 hex가 필요하다) */
const CREAM = "#f5f3ef";

function Chip({
  children,
  value,
  label,
}: {
  children: React.ReactNode;
  value: string;
  label: string;
}) {
  return (
    <div className="flex flex-col items-center gap-1.5 rounded-2xl border border-rd-line bg-white px-1.5 pt-3.5 pb-3">
      {children}
      <span className="text-[15px] font-extrabold tracking-[-0.02em] text-rd-ink">
        {value}
      </span>
      <span className="text-[11.5px] font-medium text-rd-muted">{label}</span>
    </div>
  );
}

export default function MoodHero({
  view,
  days,
  onChipsClick,
}: {
  view: HomeView;
  /** 함께 기록한 지 N일 — 피그마 시안의 히어로 한 줄 */
  days?: number;
  /** 칩을 누르면 오늘 상태 입력으로 — 표시 전용 칩이 막다른 길이 되지 않게 */
  onChipsClick?: () => void;
}) {
  const { mood } = view;
  return (
    <>
      {/* sticky — 카드 스택이 히어로 위를 덮으며 올라온다. 히어로는 뒤에 남는다 */}
      <div className="sticky top-0 z-0" style={{ height: HERO_H, background: CREAM }}>
        {/*
          씬은 무드마다 다른 그림이다 — 색보정을 씌우지 않는다.
          sunny만 첫 화면에 뜨므로 나머지 4장은 lazy, sunny는 즉시 받는다.
        */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={mood.scene}
          alt={mood.charNote}
          width={SCENE_SIZE}
          height={SCENE_SIZE}
          fetchPriority={mood.id === "sunny" ? "high" : "auto"}
          onError={(e) => {
            e.currentTarget.style.display = "none";
          }}
          className="absolute inset-x-0 top-0 w-full object-cover"
          style={{ height: SCENE_H, objectPosition: "center 58%" }}
        />
        {/* 씬 하단이 크림으로 녹는다 — 무드색 스크림 대신 */}
        <div
          className="absolute inset-x-0 top-0"
          style={{
            height: SCENE_H,
            background: `linear-gradient(180deg, rgba(245,243,239,0) 55%, rgba(245,243,239,.6) 82%, ${CREAM} 100%)`,
          }}
          aria-hidden
        />
      </div>

      {/* 멘트 · 기록 수 · 3칩 — 씬 아래 크림 위, 잉크 글자 */}
      <div className="relative z-[1] px-5 pb-5.5" style={{ marginTop: -CONTENT_PULL }}>
        {typeof days === "number" && days > 0 && (
          <p className="mb-2 text-[12.5px] font-semibold text-rd-muted">
            🌱 함께 기록한 지 {days}일
          </p>
        )}
        <p className="display mb-3 text-left text-[21px] leading-[1.4] text-rd-ink text-balance">
          {view.wit}
        </p>

        <div className="flex items-center gap-2">
          <span className="flex items-center gap-1.5 rounded-full bg-rd-well px-3.5 py-2 text-[13px] font-bold tracking-[-0.01em] text-rd-body">
            <span className="text-[15px] leading-none" aria-hidden>
              {mood.glyph}
            </span>
            <span className="tabular-nums">{view.statusLine}</span>
          </span>
        </div>
        <p className="mt-2.5 text-[13px] font-medium tracking-[-0.01em] text-rd-muted">
          {view.sub}
        </p>

        <div
          className="mt-4 grid grid-cols-3 gap-2.5"
          onClick={onChipsClick}
          role={onChipsClick ? "button" : undefined}
        >
          <Chip value={view.chipMeal} label="식사">
            <IconBowl size={24} className="text-rd-forest" />
          </Chip>
          <Chip value={view.chipWater} label="음수">
            <IconWater size={24} className="text-rd-forest" />
          </Chip>
          <Chip value={view.chipLitter} label="화장실">
            <IconLitter size={24} className="text-rd-forest" dotFill="#fff" />
          </Chip>
        </div>
      </div>
    </>
  );
}
