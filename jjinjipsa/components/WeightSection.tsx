"use client";

/*
 * 체중 추이 — 고양이 상세가 소유한다 (그 아이의 시간축 정보, docs/정보구조.md).
 *
 * 그래프를 예쁘게 보여주는 게 목적이 아니라, **의미 있는 감소를 집사에게 알리는 것**이
 * 목적이다. 그래서 판정 문구가 맨 위, 그래프는 그 아래에 둔다.
 */

import { useEffect, useState } from "react";
import { newId, storage, type Cat, type WeightLog } from "@/lib/storage";
import { getCatAge } from "@/lib/catAge";
import {
  analyzeWeights,
  hasThisMonthLog,
  sortWeights,
  TREND_STYLE,
} from "@/lib/weightTrend";
import BottomSheet from "@/components/BottomSheet";

function todayISO(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/*
 * 스파크라인은 **막대가 아니라 꺾은선**이다.
 * 막대는 밑동이 0이라는 인상을 주는데, 여기 축은 min~max라서
 * 5.0 → 4.4kg(12% 감소)가 "거의 0까지 떨어짐"처럼 보인다. 건강 정보에서
 * 그런 과장은 그 자체로 해롭다. 꺾은선은 0 기준선을 암시하지 않고,
 * 축 양끝에 실제 kg를 적어 눈금을 밝힌다.
 */
const CHART_W = 100;
const CHART_H = 36;

/** 값들을 차트 좌표로 — 위아래 여백 10%를 둬서 끝점이 잘리지 않게 한다 */
function toPoints(values: number[]): { x: number; y: number }[] {
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min;
  const pad = CHART_H * 0.15;
  const usable = CHART_H - pad * 2;
  return values.map((v, i) => ({
    x: values.length === 1 ? CHART_W / 2 : (i / (values.length - 1)) * CHART_W,
    // 변화가 거의 없으면 가운데 선으로 (0으로 나누기 방지)
    y: span < 0.01 ? CHART_H / 2 : pad + (1 - (v - min) / span) * usable,
  }));
}

export default function WeightSection({
  cat,
  onCatChange,
}: {
  cat: Cat;
  /** 최신 체중이 갱신되면 상단 프로필도 같은 값을 보여야 한다 */
  onCatChange?: (cat: Cat) => void;
}) {
  const [logs, setLogs] = useState<WeightLog[] | null>(null);
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState("");
  const [date, setDate] = useState(todayISO());
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    void storage.listWeights(cat.id).then((rows) => setLogs(sortWeights(rows)));
  }, [cat.id]);

  if (logs === null) return null;

  // 아기 고양이는 늘어야 정상이라 증가 경고를 띄우지 않는다
  const growing = getCatAge(cat.birthDate).stage === "kitten";
  const trend = analyzeWeights(logs, { growing });
  const style = TREND_STYLE[trend.level];
  const needsThisMonth = !hasThisMonthLog(logs);

  async function save() {
    if (saving) return;
    const kg = Number(draft);
    if (!draft.trim() || Number.isNaN(kg) || kg <= 0 || kg > 20) {
      setError("체중은 0~20kg 사이 숫자로 입력해 주세요.");
      return;
    }
    if (date > todayISO()) {
      setError("앞으로의 날짜는 기록할 수 없어요.");
      return;
    }
    setSaving(true);
    try {
      const log: WeightLog = {
        id: newId(),
        catId: cat.id,
        weightKg: Math.round(kg * 10) / 10,
        measuredAt: date,
        createdAt: new Date().toISOString(),
      };
      await storage.addWeight(log);
      const next = sortWeights([...(logs ?? []), log]);
      setLogs(next);
      // 이번 기록이 가장 최근이면 프로필 체중도 맞춰둔다
      // (같은 화면에 다른 숫자가 두 개 보이면 어느 쪽을 믿을지 알 수 없다)
      if (next[next.length - 1].id === log.id && cat.weightKg !== log.weightKg) {
        const updated = { ...cat, weightKg: log.weightKg };
        await storage.saveCat(updated);
        onCatChange?.(updated);
      }
      setOpen(false);
      setDraft("");
      setError("");
    } catch {
      setError("저장에 실패했어요. 잠시 후 다시 시도해 주세요.");
    } finally {
      setSaving(false);
    }
  }

  // 최근 12개만 그린다 (오래된 건 화면에서 의미가 옅다)
  const recent = logs.slice(-12);
  const values = recent.map((l) => l.weightKg);
  const points = toPoints(values);
  const chartMax = Math.max(...values);
  const chartMin = Math.min(...values);

  return (
    <section className="rounded-card border border-hairline bg-white p-5">
      <div className="flex items-center justify-between">
        <p className="text-sm font-bold text-secondary">체중 추이</p>
        <button
          type="button"
          onClick={() => {
            setDraft(trend.latest ? String(trend.latest.weightKg) : "");
            setDate(todayISO());
            setError("");
            setOpen(true);
          }}
          className="-my-2 -mr-2 flex min-h-11 items-center px-2 text-[12px] font-semibold text-primary-deep"
        >
          + 체중 기록
        </button>
      </div>

      {/* 판정이 먼저 — 이 기능의 목적 */}
      <div className="mt-2 flex items-start gap-2">
        <span aria-hidden className={`mt-1.5 size-2 flex-none rounded-full ${style.dot}`} />
        <p className={`text-[13px] leading-relaxed ${style.text}`}>{trend.message}</p>
      </div>

      {trend.latest && (
        <p className="mt-1 pl-4 text-[12px] text-muted">
          최근 {trend.latest.weightKg}kg · {trend.latest.measuredAt.slice(5).replace("-", "/")}
        </p>
      )}

      {/* 꺾은선 — 변화의 방향과 기울기를 훑어본다 */}
      {recent.length >= 2 && (
        <div className="mt-4">
          <div className="flex items-stretch gap-2">
            {/* 세로 눈금 — 축이 0부터가 아니라는 걸 숫자로 밝힌다 */}
            <div className="flex flex-col justify-between py-0.5 text-[10px] text-muted-soft tabular-nums">
              <span>{chartMax.toFixed(1)}</span>
              <span>{chartMin.toFixed(1)}</span>
            </div>
            {/*
              선은 SVG로 늘려 그리고(preserveAspectRatio=none), 점은 CSS로 얹는다.
              점까지 SVG에 넣으면 가로로 늘어나면서 타원이 된다.
            */}
            <div
              className="relative h-16 flex-1"
              role="img"
              aria-label={`체중 변화: ${recent.map((l) => `${l.measuredAt} ${l.weightKg}킬로그램`).join(", ")}`}
            >
              <svg
                viewBox={`0 0 ${CHART_W} ${CHART_H}`}
                preserveAspectRatio="none"
                className="absolute inset-0 size-full text-primary"
                aria-hidden
              >
                <polyline
                  points={points.map((p) => `${p.x},${p.y}`).join(" ")}
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={1.5}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  vectorEffect="non-scaling-stroke"
                />
              </svg>
              {points.map((p, i) => (
                <span
                  key={recent[i].id}
                  title={`${recent[i].measuredAt} · ${recent[i].weightKg}kg`}
                  className={`absolute size-[7px] -translate-x-1/2 -translate-y-1/2 rounded-full ${
                    i === points.length - 1 ? "bg-primary-deep" : "bg-primary"
                  }`}
                  style={{ left: `${p.x}%`, top: `${(p.y / CHART_H) * 100}%` }}
                />
              ))}
            </div>
          </div>
          <div className="mt-1 flex justify-between pl-7 text-[11px] text-muted-soft">
            <span>{recent[0].measuredAt.slice(2, 7).replace("-", "/")}</span>
            <span>{recent[recent.length - 1].measuredAt.slice(2, 7).replace("-", "/")}</span>
          </div>
        </div>
      )}

      {/* 이번 달 기록이 없으면 짧게 짚어준다 (월 1회 유도) */}
      {needsThisMonth && logs.length > 0 && (
        <p className="mt-3 rounded-input bg-surface-soft/70 px-3 py-2.5 text-[12px] text-body">
          이번 달 체중을 아직 기록하지 않았어요.
        </p>
      )}

      {trend.needsVisit && (
        <p className="mt-3 rounded-input bg-warning/10 px-3 py-2.5 text-[12px] leading-relaxed text-body">
          체중 변화만으로 병을 알 수는 없어요. 다만 눈에 띄는 감소는 갑상선·당뇨·신장
          문제의 이른 신호일 수 있어, 진료 때 이 기록을 보여주시면 도움이 돼요.
        </p>
      )}

      <BottomSheet open={open} onClose={() => setOpen(false)} title="체중 기록">
        <label className="block text-[13px] font-semibold text-secondary" htmlFor="w-kg">
          체중 (kg)
        </label>
        <input
          id="w-kg"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          inputMode="decimal"
          placeholder="예: 4.2"
          className="mt-1.5 h-12 w-full rounded-input border border-hairline bg-surface-soft/40 px-4 text-base text-ink focus:border-primary focus:bg-white focus:outline-none"
        />

        <label className="mt-4 block text-[13px] font-semibold text-secondary" htmlFor="w-date">
          잰 날짜
        </label>
        <input
          id="w-date"
          type="date"
          value={date}
          max={todayISO()}
          onChange={(e) => setDate(e.target.value)}
          className="mt-1.5 h-12 w-full rounded-input border border-hairline bg-surface-soft/40 px-4 text-base text-ink focus:border-primary focus:bg-white focus:outline-none"
        />

        {error && <p className="mt-2 text-[12px] text-error">{error}</p>}

        <button
          onClick={() => void save()}
          disabled={saving}
          className="mt-4 h-12 w-full rounded-button bg-primary text-sm font-bold text-white disabled:opacity-60"
        >
          {saving ? "저장 중…" : "저장"}
        </button>
      </BottomSheet>
    </section>
  );
}
