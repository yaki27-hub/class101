/*
 * Mock LLM — API 키·네트워크 없이 UI 왕복을 검증하기 위한 가짜 응답.
 * 5블록 포맷(docs/챗봇_시스템프롬프트.md)의 축약 형태를 흉내 내되,
 * 실제 건강 판단은 하지 않는다 (T-07에서 Gemini로 교체).
 */

import type { LlmAdapter, LlmRequest, LlmChunkedResponse } from "./types";

function buildMockAnswer(req: LlmRequest): string {
  const { cat, question } = req;
  const shortQ = question.length > 40 ? `${question.slice(0, 40)}…` : question;
  return [
    `🔍 관찰 — 집사님이 "${shortQ}"라고 물어보셨어요. (지금은 연습용 답변이에요)`,
    ``,
    `📖 히스토리 — ${cat.name}의 기록이 아직 충분히 쌓이지 않았어요. 증상을 기록해두면 다음 답변이 더 정확해져요.`,
    ``,
    `🧭 맥락 — ${cat.name}(${cat.breedGroup})의 프로필을 기준으로 답하게 될 거예요.`,
    ``,
    `🚦 판정 — 🟢 홈케어 가능(연습). 실제 판정은 진짜 두뇌(Gemini)가 연결되면 제공돼요.`,
    ``,
    `ℹ️ 저는 참고 정보를 드리는 것이고, 진단과 처방은 수의사 선생님의 영역이에요.`,
  ].join("\n");
}

async function* streamText(text: string): AsyncIterable<string> {
  // 단어 단위 스트리밍 흉내 (UI 검증용)
  for (const word of text.split(/(?<=\s)/)) {
    await new Promise((r) => setTimeout(r, 18));
    yield word;
  }
}

export class MockLlmAdapter implements LlmAdapter {
  async ask(req: LlmRequest): Promise<LlmChunkedResponse> {
    return { stream: streamText(buildMockAnswer(req)), model: "mock" };
  }
}
