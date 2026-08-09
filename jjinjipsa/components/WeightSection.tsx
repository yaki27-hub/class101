"use client";

/*
 * 체중 추이 — 고양이 상세가 소유한다 (그 아이의 시간축 정보, docs/정보구조.md).
 *
 * 그래프를 예쁘게 보여주는 게 목적이 아니라, **의미 있는 감소를 집사에게 알리는 것**이
 * 목적이다. 그래서 판정 문구가 그래프보다 위에 있다.
 *
 * ⚠️ 시안(2b)에 맞춰 꺾은선 → 막대로 바꿨다. 원래 꺾은선이었던 이유는 축이 0부터가
 * 아니라서 막대가 "거의 0까지 떨어짐"으로 과장돼 보이기 때문이었다. 막대를 쓰는 대신
 * 시안이 쓰는 완화책을 그대로 가져왔다 — **막대마다 실제 kg를 머리에 적는다**.
 * 숫자가 붙어 있으면 길이를 눈대중할 일이 없다. 이 라벨은 지우지 말 것.
 */

import { useEffect, useState } from "react";
import { newId, storage, type Cat, type WeightLog } from "@/lib/storage";
import { getCatAge } from "@/lib/catAge";
import { analyzeWeights, hasThisMonthLog, sortWeights } from "@/lib/weightTrend";
import BottomSheet from "@/components/BottomSheet";

function todayISO(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/** 막대 높이 — 최솟값도 눈에 보이게 26px 바닥을 깔고, 범위를 52px에 편다 */
const BAR_MIN = 26;
const BAR_SPAN = 52;

function barHeight(kg: number, min: number, max: number): number {
  // 변화가 거의 없을 때 0으로 나누지 않도록. 0.4kg보다 좁은 범위는 0.4로 본다
  const span = Math.max(0.4, max - min);
  return Math.round(BAR_MIN + ((kg - min) / span) * BAR_SPAN);
}

/** "7/21" 형태 — 올해가 아니면 "'24 12/19"처럼 연도를 붙인다 (해 넘김 혼동 방지) */
function shortDate(iso: string): string {
  const md = iso.slice(5).replace("-", "/").replace(/^0/, "");
  const year = iso.slice(0, 4);
  if (year !== String(new Date().getFullYear())) return `'${year.slice(2)} ${md}`;
  return md;
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
  const needsThisMonth = !hasThisMonthLog(logs);
  const losing = trend.level === "loss" || trend.level === "loss-high";

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

  // 막대는 최근 6개만 — 시안과 같은 밀도. 그보다 많으면 라벨이 서로 붙는다
  const recent = logs.slice(-6);
  const values = recent.map((l) => l.weightKg);
  const min = values.length ? Math.min(...values) : 0;
  const max = values.length ? Math.max(...values) : 0;

  const deltaKg = trend.changeKg;
  const deltaLabel = `${deltaKg > 0 ? "+" : ""}${deltaKg.toFixed(1)}kg`;

  return (
    <section className="rounded-3xl bg-rd-card p-5">
      <div className="mb-1.5 flex items-center justify-between gap-2">
        <h2 className="text-[16px] font-extrabold tracking-[-0.02em] text-rd-ink">
          체중 추이
        </h2>
        <div className="flex flex-none items-center gap-1.5">
          {recent.length >= 2 && (
            <span
              className={`rounded-full px-2.5 py-1 text-[12px] font-bold ${
                losing
                  ? "bg-[#FFF5F3] text-[#C4453A]"
                  : "bg-rd-mint-soft text-rd-forest"
              }`}
            >
              {deltaLabel}
            </span>
          )}
          <button
            type="button"
            onClick={() => {
              // 기록이 없으면 프로필에 적힌 체중을 기본값으로 (첫 입력 마찰 줄이기).
              // 프로필 값을 기록으로 **자동 저장하지는 않는다** — 언제 잰 값인지
              // 모르는데 날짜를 지어내면 없는 측정을 만들어내는 셈이다
              setDraft(String(trend.latest?.weightKg ?? cat.weightKg ?? ""));
              setDate(todayISO());
              setError("");
              setOpen(true);
            }}
            className="-my-2 -mr-2 flex min-h-11 items-center px-2 text-[12px] font-bold text-rd-forest"
          >
            + 기록
          </button>
        </div>
      </div>

      {trend.latest ? (
        <p className="text-[13px] text-rd-muted">
          최근 {trend.latest.weightKg}kg · {shortDate(trend.latest.measuredAt)} 기준
        </p>
      ) : (
        <p className="text-[13px] text-rd-muted">아직 기록이 없어요</p>
      )}

      {/* 판정 — 이 기능의 목적. 그래프보다 위에 둔다 */}
      <p
        className={`mt-2 text-[13px] leading-[1.6] ${
          losing ? "text-[#C4453A]" : "text-rd-body"
        }`}
      >
        {trend.message}
      </p>

      {recent.length >= 2 && (
        <div
          className="mt-4.5 flex h-26 items-end gap-2.5"
          role="img"
          aria-label={`체중 변화: ${recent
            .map((l) => `${l.measuredAt} ${l.weightKg}킬로그램`)
            .join(", ")}`}
        >
          {recent.map((l, i) => (
            <div
              key={l.id}
              className="flex h-full flex-1 flex-col items-center justify-end gap-1.5"
            >
              {/* 막대 길이를 눈대중하지 않도록 실제 값을 머리에 적는다 */}
              <span className="text-[11px] font-bold text-rd-body tabular-nums">
                {l.weightKg.toFixed(1)}
              </span>
              <div
                className={`w-full rounded-t-lg ${
                  i === recent.length - 1 ? "bg-rd-forest" : "bg-[#CFE7DC]"
                }`}
                style={{ height: barHeight(l.weightKg, min, max) }}
              />
              <span className="text-[10.5px] text-rd-faint">
                {shortDate(l.measuredAt)}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* 이번 달 기록이 없으면 짧게 짚어준다 (월 1회 유도) */}
      {needsThisMonth && logs.length > 0 && (
        <p className="mt-3.5 rounded-[14px] bg-[#F7F8F5] px-3.5 py-3 text-[12px] text-rd-body">
          이번 달 체중을 아직 기록하지 않았어요.
        </p>
      )}

      {trend.needsVisit && (
        <p className="mt-3.5 rounded-[14px] bg-[#FFF9E8] px-3.5 py-3 text-[12px] leading-[1.6] text-rd-body">
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
