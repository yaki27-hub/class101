/* 엔티티 타입 — PLAN.md §4 데이터 모델 초안 기준 (Supabase 스키마와 1:1 대응 목표) */

export type Gender = "male" | "female" | "unknown";

export type LifeStage = "kitten" | "junior" | "adult" | "mature" | "senior";

export interface CatAvatar {
  fur: string;
  pattern: string;
  eyes: string;
}

export interface Cat {
  id: string;
  name: string;
  /** ISO date (YYYY-MM-DD). 추정 생일이면 birthEstimated=true */
  birthDate: string;
  birthEstimated: boolean;
  gender: Gender;
  neutered: boolean;
  /** 품종 그룹 (코숏, 페르시안계, 샴계 등 — 상세 목록은 F-01에서 확정) */
  breedGroup: string;
  weightKg: number | null;
  /** 기저질환·조건 태그 (신장, 요로, 비만 등) */
  conditions: string[];
  indoor: boolean;
  avatar: CatAvatar | null;
  /** 업로드한 사진 (MVP: dataURL, v1.1: Supabase Storage URL) */
  photo: string | null;
  /** 생성된 AI 일러스트 (dataURL 또는 URL) */
  illust: string | null;
  createdAt: string;
  updatedAt: string;
}

/** 오늘의 체크(F-15) 답변 — 습관 베이스라인의 원천 */
export interface TraitAnswer {
  id: string;
  catId: string;
  /** 예: water_intake, vomit_freq, appetite_pattern */
  questionKey: string;
  answer: string;
  /** YYYY-MM-DD — 하루 1문항 중복 방지 키 */
  answeredOn: string;
  createdAt: string;
}

/** 증상 기록(F-05) — 챗봇 히스토리 대조의 원천 */
export interface SymptomLog {
  id: string;
  catId: string;
  tags: string[];
  summary: string;
  source: "chat" | "manual";
  chatSessionId: string | null;
  /** 증상 발생 시각 (ISO) */
  occurredAt: string;
  createdAt: string;
}

export interface ChatSession {
  id: string;
  catId: string;
  title: string;
  startedAt: string;
}

export interface ChatMessage {
  id: string;
  sessionId: string;
  role: "user" | "assistant";
  content: string;
  imageUrl: string | null;
  /** 응답 생성에 쓴 모델 (라우팅 검증용) */
  model: string | null;
  createdAt: string;
}
