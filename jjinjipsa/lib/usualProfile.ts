/*
 * "평소 모습" 프로필 (모카 프로토타입의 아이 화면) — 이 아이는 보통 어떤지를
 * 기록에서만 뽑아 문장으로 만든다.
 *
 * 프로토타입의 아침/낮/저녁 타임라인은 **만들지 않았다.** 앱은 시간대별 관찰을
 * 수집하지 않아서, 그걸 쓰면 하루 단위 기록으로 아침을 지어내는 셈이 된다.
 * 대신 실제로 쌓이는 4축(식사·물·배변·활동)의 평소를 같은 타임라인 문법으로 쓴다.
 *
 * 정직성 규칙은 baseline(D-44)과 동일: 분모는 기록한 날, 표본 5일 미만이면
 * "알아가는 중", 방향 단정 금지. 좋아하는 것은 **집사가 생활기록부에 직접 답한
 * 것과 꼭 기억할 것(사료·간식 메모)에서만** 가져온다 — 추론으로 지어내지 않는다.
 */

import {
  collectItemBaseline,
  MIN_BASELINE_DAYS,
  LOOKBACK_DAYS,
} from "@/lib/baseline";
import { loadDailyOn, STATUS_ITEMS, type DailyStatusType } from "@/lib/dailyStatus";
import { isPersonalityKey, PERSONALITY_PREFIX } from "@/lib/personality";
import type { TraitAnswer } from "@/lib/storage";

export { MIN_BASELINE_DAYS };

/**
 * (항목, 라벨) → "보통 이래요" 문장. **항목별로 나눈 이유**: "평소보다 적어요"처럼
 * 같은 라벨이 식사와 활동에 둘 다 있어서, 라벨만 보면 활동 항목에 밥 문장이 나온다.
 * 없는 조합은 라벨을 그대로 인용한다 (지어내지 않기).
 */
const LABEL_SENTENCE: Record<DailyStatusType, Record<string, string>> = {
  meal: {
    "잘 먹었어요": "밥을 잘 먹는 편이에요.",
    "평소보다 적어요": "밥을 적게 먹는다고 기록한 날이 많아요.",
    "거의 안 먹었어요": "밥을 거의 안 먹는 날이 많았어요.",
  },
  water: {
    "평소와 같아요": "물은 꾸준히 잘 마셔요.",
    "평소보다 많이 마셨어요": "물을 많이 마신다고 기록한 날이 많아요.",
    "평소보다 적게 마셨어요": "물을 적게 마신다고 기록한 날이 많아요.",
  },
  toilet: {
    "평소와 같아요": "화장실은 규칙적인 편이에요.",
    "묽어요": "변이 묽다고 기록한 날이 많아요.",
    "딱딱해요": "변이 딱딱하다고 기록한 날이 많아요.",
  },
  activity: {
    "평소와 같아요": "활동량은 평소 수준을 유지해요.",
    "평소보다 활발해요": "활발하게 노는 날이 많아요.",
    "평소보다 적어요": "조용히 쉬는 날이 많은 편이에요.",
    "거의 움직이지 않아요": "거의 움직이지 않는 날이 많았어요.",
  },
};

/** "식사가 / 활동이" — 받침 유무로 이·가를 고른다 */
function withSubjectJosa(word: string): string {
  const last = word.charCodeAt(word.length - 1);
  const hasBatchim = last >= 0xac00 && last <= 0xd7a3 && (last - 0xac00) % 28 > 0;
  return `${word}${hasBatchim ? "이" : "가"}`;
}

export interface UsualItem {
  key: DailyStatusType;
  icon: string;
  label: string;
  /** "밥을 잘 먹는 편이에요." */
  sentence: string;
  /** "최근 4주, 기록한 14일 중 12일이 그랬어요" */
  evidence: string;
  sampleDays: number;
}

export interface LearningItem {
  key: DailyStatusType;
  icon: string;
  label: string;
  /** "물의 평소 패턴은 조금 더 알아가야 해요 (기록 2일)" */
  sentence: string;
  sampleDays: number;
}

export interface RecentChange {
  key: DailyStatusType;
  icon: string;
  label: string;
  /** 최근 7일 중 평소 수준과 달랐던 날 수 */
  offDays: number;
  sentence: string;
}

export interface UsualProfile {
  known: UsualItem[];
  learning: LearningItem[];
  /** 평소를 아는 항목 중, 이번 주 평소와 달랐던 날이 있는 것만 */
  changes: RecentChange[];
}

const WEEK = 7;

export function buildUsualProfile(catId: string, now: Date = new Date()): UsualProfile {
  const known: UsualItem[] = [];
  const learning: LearningItem[] = [];
  const changes: RecentChange[] = [];

  for (const item of STATUS_ITEMS) {
    const base = collectItemBaseline(catId, item.key, now);

    if (base.sampleDays < MIN_BASELINE_DAYS) {
      learning.push({
        key: item.key,
        icon: item.icon,
        label: item.label,
        sentence: `${item.label}의 평소 패턴은 조금 더 알아가야 해요 (기록 ${base.sampleDays}일)`,
        sampleDays: base.sampleDays,
      });
      continue;
    }

    const sentence =
      LABEL_SENTENCE[item.key][base.usualLabel!] ??
      `"${base.usualLabel}"로 기록한 날이 많아요.`;
    known.push({
      key: item.key,
      icon: item.icon,
      label: item.label,
      sentence,
      evidence: `최근 4주, 기록한 ${base.sampleDays}일 중 ${base.usualDays}일이 그랬어요`,
      sampleDays: base.sampleDays,
    });

    // 요즘 달라진 점 — 최근 7일(오늘 포함)에서 평소 수준과 다른 날을 센다.
    // 여기서도 방향은 말하지 않는다. "달랐다"까지만.
    let offDays = 0;
    for (let ago = 0; ago < WEEK; ago++) {
      const d = new Date(now);
      d.setDate(d.getDate() - ago);
      const rec = loadDailyOn(catId, d)[item.key];
      if (!rec || rec.level === "unknown") continue;
      if (rec.level !== base.usualLevel) offDays++;
    }
    if (offDays > 0) {
      changes.push({
        key: item.key,
        icon: item.icon,
        label: item.label,
        offDays,
        sentence: `${withSubjectJosa(item.label)} 평소와 달랐던 날이 이번 주 ${offDays}일 있었어요.`,
      });
    }
  }

  return { known, learning, changes };
}

/*
 * 좋아하는 것 — 생활기록부(성격) 답변에서 "선호"로 읽을 수 있는 것만 옮긴다.
 * 매핑에 없는 답은 넣지 않는다. 등급이 낮다고 "싫어한다"로 뒤집지도 않는다
 * (안 좋아하는 게 아니라 아직 모르는 것일 수 있다 — D-20과 같은 결).
 */
const LIKE_FROM_ANSWER: Record<string, Record<string, string>> = {
  "낮잠 자리": {
    "집사 옆이나 배 위": "집사 옆에서 자는 걸 좋아해요.",
    "햇빛 드는 창가": "햇빛 드는 창가를 좋아해요.",
    "매번 다른 곳": "자는 자리를 자주 바꿔요.",
    "아무도 모르는 곳": "혼자만 아는 자리에서 쉬는 걸 좋아해요.",
  },
  "상자 사랑": {
    "1초 만에 들어가요": "빈 상자를 아주 좋아해요.",
    "한참 보다가 들어가요": "상자를 좋아해요 (신중하게).",
  },
  "간식 반응속도": {
    "0.1초 만에 나타나요": "간식에 진심이에요.",
    "자다가도 일어나요": "간식에 진심이에요.",
  },
  "무릎냥 지수": {
    "바로 무릎에 올라와요": "무릎에 올라오는 걸 좋아해요.",
  },
};

/** 성격 답변 + 사료·간식 메모 → 좋아하는 것 목록 (최대 4개) */
export function buildLikes(traits: TraitAnswer[], foodNotes: string[]): string[] {
  const likes: string[] = [];

  // 같은 문항은 최신 답만 (생활기록부와 같은 규칙)
  const latest = new Map<string, TraitAnswer>();
  for (const t of traits) {
    if (!isPersonalityKey(t.questionKey)) continue;
    const prev = latest.get(t.questionKey);
    if (!prev || prev.answeredOn <= t.answeredOn) latest.set(t.questionKey, t);
  }
  for (const [qKey, t] of latest) {
    const key = qKey.slice(PERSONALITY_PREFIX.length);
    const mapped = LIKE_FROM_ANSWER[key]?.[t.answer];
    if (mapped) likes.push(mapped);
  }

  for (const note of foodNotes) {
    const c = note.trim();
    if (c) likes.push(c);
  }

  return likes.slice(0, 4);
}
