/*
 * LLM 진입점 — UI는 여기의 `llm`만 import한다.
 * T-07에서 GeminiAdapter를 붙이고, 키가 없으면 mock으로 폴백한다 (D-04).
 */

import { MockLlmAdapter } from "./mock";
import type { LlmAdapter } from "./types";

export const llm: LlmAdapter = new MockLlmAdapter();

export * from "./types";
