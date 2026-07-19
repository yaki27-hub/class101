/*
 * LLM 진입점 — UI는 여기의 `llm`만 import한다.
 * T-07에서 GeminiAdapter를 붙이고, 키가 없으면 mock으로 폴백한다 (D-04).
 */

import { RemoteLlmAdapter } from "./remote";
import type { LlmAdapter } from "./types";

/** 서버 라우트 경유 Gemini. 키 없음·오류 시 어댑터 내부에서 mock 폴백 */
export const llm: LlmAdapter = new RemoteLlmAdapter();

export * from "./types";
