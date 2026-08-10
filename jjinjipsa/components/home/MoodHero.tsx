"use client";

/*
 * 홈 히어로 — 씬 일러스트가 상단 440px를 꽉 채우고, 그 아래로 무드 색에 녹아든다.
 *
 * 지오메트리는 시안과 1:1이다. 만지기 전에 왜 이 숫자인지 먼저 읽을 것:
 *  - 히어로 높이 720 / 씬 440. 스크림·배경 그라디언트 정지점이 **둘 다** 440에
 *    걸려 있어서 이음매가 안 보인다. 한쪽만 바꾸면 경계에 줄이 생긴다.
 *  - 콘텐츠는 -275px로 끌어올린다 (720 - 275 = 445). 씬 바로 아래에서 시작해
 *    멘트·스코어·3칩이 전부 무드 배경 안에서 끝난다.
 *  - 상단 0~150px 보호 그라디언트는 밝은 씬 위에서 흰 헤더가 읽히게 하는 용도다.
 */

import { IconBowl, IconLitter, IconWater } from "@/components/icons";
import { SCENE_SIZE, heroBg, heroScrim, type HomeView } from "@/lib/homeMood";

const HERO_H = 720;
const SCENE_H = 440;
/*
 * 콘텐츠를 씬 위로 끌어올리는 양. 720 - 435 = 285px 지점에서 멘트가 시작한다.
 * 씬(440px)이 끝나기 전이라 글이 그림 아래쪽에 겹치는데, 그 구간은 스크림이 이미
 * 무드색 80%까지 덮은 자리(76% ≈ 334px)라 흰 글자가 읽힌다.
 * 그림이 화면을 너무 많이 먹는다는 피드백으로 275 → 435.
 */
const CONTENT_PULL = 435;

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
    <div className="flex flex-col items-center gap-1.5 rounded-2xl bg-white/15 px-1.5 pt-3.5 pb-3 backdrop-blur-lg">
      {children}
      <span className="text-[15px] font-extrabold tracking-[-0.02em]">{value}</span>
      <span className="text-[11.5px] font-medium text-white/70">{label}</span>
    </div>
  );
}

export default function MoodHero({
  view,
  onChipsClick,
}: {
  view: HomeView;
  /** 칩을 누르면 오늘 상태 입력으로 — 표시 전용 칩이 막다른 길이 되지 않게 */
  onChipsClick?: () => void;
}) {
  const { mood } = view;
  return (
    <>
      {/*
        sticky — 카드 스택이 히어로 위를 덮으며 올라온다. 히어로는 뒤에 남는다.
      */}
      <div
        className="sticky top-0 z-0"
        style={{ height: HERO_H }}
        aria-hidden={false}
      >
        <div className="absolute inset-0" style={{ background: heroBg(mood) }} />

        {/* 발자국 텍스처 — 씬 아래에서만 */}
        <div
          className="mood-paws absolute inset-x-0 bottom-0 opacity-10"
          style={{ top: SCENE_H }}
          aria-hidden
        />

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
          // 씬 파일이 아직 없으면(배포 전) 깨진 이미지 아이콘 대신 무드 그라디언트만 남긴다
          onError={(e) => {
            e.currentTarget.style.display = "none";
          }}
          className="absolute inset-x-0 top-0 w-full object-cover"
          style={{ height: SCENE_H, objectPosition: "center 58%" }}
        />
        {/* 스크림 — 씬 하단이 무드색에 정확히 착지 */}
        <div
          className="absolute inset-x-0 top-0"
          style={{ height: SCENE_H, background: heroScrim(mood) }}
          aria-hidden
        />
        {/* 상단 보호 — 밝은 씬 위에서도 흰 헤더가 읽히게 */}
        <div
          className="absolute inset-x-0 top-0 h-[150px]"
          style={{
            background:
              "linear-gradient(180deg,rgba(0,0,0,.42) 0%,rgba(0,0,0,.24) 52%,rgba(0,0,0,0) 100%)",
          }}
          aria-hidden
        />
      </div>

      {/* 멘트 · 스코어 · 3칩 — 씬 아래, 무드 색 위 */}
      <div
        className="relative z-[1] px-5 pb-5.5 text-center text-white"
        style={{ marginTop: -CONTENT_PULL }}
      >
        <p
          className="display mb-4.5 text-[19px] leading-[1.35] tracking-[-0.01em] text-balance"
          style={{ textShadow: "0 2px 12px rgba(0,0,0,.28)" }}
        >
          {view.wit}
        </p>

        {/* 점수(98점) 표현은 제거 — 건강 점수처럼 읽힌다 (지시서 P0-1). 기록 수만 보여준다 */}
        <div className="flex items-center justify-center">
          <span className="flex items-center gap-2 rounded-full bg-white/15 px-5 py-3 text-[17px] font-extrabold tracking-[-0.02em] backdrop-blur-lg">
            <span
              className="text-[20px] leading-none"
              style={{ filter: "drop-shadow(0 2px 6px rgba(0,0,0,.25))" }}
              aria-hidden
            >
              {mood.glyph}
            </span>
            <span className="tabular-nums">{view.statusLine}</span>
          </span>
        </div>
        <p className="mt-3 text-[13.5px] font-medium tracking-[-0.01em] text-white/85">
          {view.sub}
        </p>

        <div
          className="mt-5 grid grid-cols-3 gap-2.5"
          onClick={onChipsClick}
          role={onChipsClick ? "button" : undefined}
        >
          <Chip value={view.chipMeal} label="식사">
            <IconBowl size={24} className="text-white" />
          </Chip>
          <Chip value={view.chipWater} label="음수">
            <IconWater size={24} className="text-white" />
          </Chip>
          <Chip value={view.chipLitter} label="화장실">
            {/* 뚫린 점을 무드색으로 채운다 — 흰 배경이 아니라 반투명 칩 위라서 */}
            <IconLitter size={24} className="text-white" dotFill={mood.bottom} />
          </Chip>
        </div>
      </div>
    </>
  );
}
