/* LLM 어댑터 타입 (F-08) — 교체 지점은 lib/llm/index.ts 한 곳 */

import type { Cat } from "@/lib/storage";

export interface LlmTurn {
  role: "user" | "assistant";
  content: string;
}

export interface LlmRequest {
  cat: Cat;
  /** 과거 대화 (이번 질문 제외) */
  history: LlmTurn[];
  /** 이번 질문 */
  question: string;
}

export interface LlmChunkedResponse {
  /** 스트리밍 텍스트 조각 */
  stream: AsyncIterable<string>;
  /** 응답 생성에 쓴 모델 식별자 (저장용) */
  model: string;
}

export interface LlmAdapter {
  ask(req: LlmRequest): Promise<LlmChunkedResponse>;
}
