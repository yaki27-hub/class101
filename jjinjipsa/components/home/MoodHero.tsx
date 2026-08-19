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
import {
  STATUS_ITEMS,
  type DailyRecord,
  type DailyStatusLevel,
  type DailyStatusType,
} from "@/lib/dailyStatus";

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
  record,
  onAnswer,
  onChipsClick,
}: {
  view: HomeView;
  /** 함께 기록한 지 N일 — 피그마 시안의 히어로 한 줄 */
  days?: number;
  /**
   * 오늘 상태 기록 — 있으면 아직 안 답한 항목의 질문 + 답 칩을 시트 대신
   * 히어로에 바로 띄운다 (모카 프로토타입 "오늘의 첫 질문").
   * 미리보기(?mood=)처럼 진짜 기록이 아닐 땐 넘기지 않는다 → 요약 칩만 보인다.
   */
  record?: DailyRecord;
  /** 답 칩 탭 — 홈의 setStatus + 지표 (시트의 onSet과 같은 저장 경로) */
  onAnswer?: (type: DailyStatusType, level: DailyStatusLevel, label: string) => void;
  /** 칩을 누르면 오늘 상태 입력으로 — 표시 전용 칩이 막다른 길이 되지 않게 */
  onChipsClick?: () => void;
}) {
  const { mood } = view;
  // 아직 답하지 않은 항목 — "기록하지 않음"(unknown)도 답이다 (같은 질문으로 조르지 않는다)
  const pending = record && onAnswer ? STATUS_ITEMS.filter((it) => !record[it.key]) : [];
  const question = pending[0];
  const answered = STATUS_ITEMS.length - pending.length;
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

        {question ? (
          /* 오늘의 질문 — 시트를 열지 않고 히어로에서 바로 답한다 (모카). 한 번에
             한 항목만 물어서 4×4 칩 바다가 되지 않게 하고, 답하면 다음 질문으로 */
          <div className="mt-4 rounded-2xl border border-rd-line bg-white p-4">
            <p className="text-[11.5px] font-extrabold text-rd-muted">
              {answered === 0
                ? "☀️ 오늘의 첫 질문"
                : `오늘의 질문 ${answered + 1}/${STATUS_ITEMS.length}`}
            </p>
            <p className="mt-1 text-[15.5px] font-bold tracking-[-0.01em] text-rd-ink">
              {question.icon} {question.sheetTitle}
            </p>
            <div className="mt-3 grid grid-cols-2 gap-2">
              {question.options.map((o) => (
                <button
                  key={o.label}
                  type="button"
                  onClick={() => onAnswer?.(question.key, o.level, o.label)}
                  className={`min-h-11 rounded-[12px] px-2 py-2 text-[13px] font-semibold leading-tight active:scale-[0.98] ${
                    o.level === "unknown"
                      ? "bg-rd-well text-rd-muted"
                      : "bg-rd-well text-rd-ink"
                  }`}
                >
                  {o.label}
                </button>
              ))}
            </div>
          </div>
        ) : (
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
        )}
      </div>
    </>
  );
}
