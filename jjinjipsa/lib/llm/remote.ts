/*
 * 서버 라우트(/api/chat) 경유 Gemini 어댑터.
 * 컨텍스트(습관·증상)는 localStorage 소유라 클라이언트에서 모아 보낸다.
 * 라우트 실패(키 없음·네트워크)면 mock으로 폴백해 UI는 항상 동작한다.
 */

import { loadDaily, loadDailyOn, STATUS_ITEMS } from "@/lib/dailyStatus";
import { loadHealthNote } from "@/lib/healthNote";
import { formatNotesForPrompt, loadNotes } from "@/lib/importantNotes";
import { storage, type SymptomLog } from "@/lib/storage";
import { supabase } from "@/lib/supabase";
import { extractSymptomTags } from "@/lib/symptomTags";
import { MockLlmAdapter } from "./mock";
import type { LlmAdapter, LlmChunkedResponse, LlmRequest } from "./types";
import type { KbRefBrief } from "@/lib/kb/retrieve";

const LIMIT_TAIL =
  "\n\n⚠️ 응급이 의심되면 저를 기다리지 마세요 — 지금 다니시는 병원이나 24시간 " +
  "동물병원에 바로 연락하는 것이 맞아요.";

const LIMIT_MESSAGE_MEMBER =
  "오늘은 여기까지예요 🐾 하루에 물어볼 수 있는 횟수를 다 썼어요.\n" +
  "내일 다시 만나요! 그동안 케어 카드나 오늘의 체크를 살펴보는 것도 좋아요." +
  LIMIT_TAIL;

// 게스트에게는 다음 단계(로그인)를 알려준다 — 한도만 알리면 막다른 길이 된다
const LIMIT_MESSAGE_GUEST =
  "오늘은 여기까지예요 🐾 로그인 전에는 하루 3개까지 물어볼 수 있어요.\n" +
  "카카오로 로그인하면 하루 10개로 늘어나고, 기록도 계정에 보관돼요." +
  LIMIT_TAIL;

async function limitMessage(): Promise<string> {
  const { getTier } = await import("@/lib/limits");
  return (await getTier()) === "member" ? LIMIT_MESSAGE_MEMBER : LIMIT_MESSAGE_GUEST;
}

async function* once(text: string): AsyncIterable<string> {
  yield text;
}

/**
 * 오늘 이전 7일의 상태 기록 (P0-5) — 기록 있는 날만, 한국어 항목명으로 압축.
 * 오늘은 todayStatus로 따로 가므로 여기서 뺀다 (이중 전달 방지).
 */
function recentDailyHistory(
  catId: string,
): Array<{ 날짜: string } & Record<string, string>> {
  const out: Array<{ 날짜: string } & Record<string, string>> = [];
  for (let i = 1; i <= 7; i++) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const rec = loadDailyOn(catId, d);
    const entry: { 날짜: string } & Record<string, string> = {
      날짜: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`,
    };
    let has = false;
    for (const item of STATUS_ITEMS) {
      const v = rec[item.key];
      if (v && v.level !== "unknown") {
        entry[item.label] = v.label;
        has = true;
      }
    }
    if (has) out.push(entry);
  }
  return out;
}

/**
 * 지금 질문과 **같은 증상 태그**를 가진 과거 기록 (P0-5, 지시서 7항).
 * 새 검색 시스템을 만들지 않는다 — 질문에서 태그를 뽑는 기존 함수와 이미 구조화된
 * tags[]의 교집합이면 "저번에도 그랬나"에 답하기 충분하다.
 */
function relatedSymptomsFor(question: string, symptoms: SymptomLog[]): SymptomLog[] {
  const asked = extractSymptomTags(question);
  if (asked.length === 0) return [];
  return symptoms.filter((s) => s.tags.some((t) => asked.includes(t)));
}

async function* streamBody(body: ReadableStream<Uint8Array>): AsyncIterable<string> {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    yield decoder.decode(value, { stream: true });
  }
}

/** 서버가 base64로 실어 보낸 KB 참고 자료를 복원. 실패하면 표시하지 않는다. */
function decodeRefs(header: string | null): KbRefBrief[] | undefined {
  if (!header) return undefined;
  try {
    const json = new TextDecoder().decode(
      Uint8Array.from(atob(header), (c) => c.charCodeAt(0)),
    );
    const parsed = JSON.parse(json) as KbRefBrief[];
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : undefined;
  } catch {
    return undefined;
  }
}

export class RemoteLlmAdapter implements LlmAdapter {
  private fallback = new MockLlmAdapter();

  async ask(req: LlmRequest): Promise<LlmChunkedResponse> {
    try {
      const [traits, symptoms, weights, allCats] = await Promise.all([
        storage.listTraits(req.cat.id),
        storage.listSymptoms(req.cat.id),
        storage.listWeights(req.cat.id).catch(() => []),
        storage.listCats().catch(() => []),
      ]);
      // R8 개체 혼동 방지 — 다른 아이들의 이름·별명을 프롬프트에 알린다
      const otherCatNames = allCats
        .filter((c) => c.id !== req.cat.id)
        .flatMap((c) => [c.name, ...(c.aliases ?? [])]);
      const { data } = await supabase.auth.getSession();
      const token = data.session?.access_token;
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          cat: req.cat,
          traits,
          symptoms,
          // 같은 태그의 과거 기록을 앞에 놓는다 (P0-5) — 전체를 훑게 하지 않는다
          relatedSymptoms: relatedSymptomsFor(req.question, symptoms),
          // 오늘 상태 기록 — 히스토리 섹션이 "기록 없음"이라고 뭉뚱그리지 않게 (QA #4)
          todayStatus: loadDaily(req.cat.id),
          // 지난 7일 상태 이력 + 꼭 기억할 것 (P0-5) — 냥박사가 변화를 짚을 재료
          dailyHistory: recentDailyHistory(req.cat.id),
          // 카테고리 항목이 먼저, 자유 메모가 뒤 (P1-5)
          importantNote:
            formatNotesForPrompt(loadNotes(req.cat.id), loadHealthNote(req.cat.id)) ||
            undefined,
          // 체중은 최근 3개 (지시서 8항) — 점 2개로 장기 추세를 말하지 않게 프롬프트가 막는다
          weights: weights.slice(-3),
          otherCatNames,
          history: req.history,
          question: req.question,
          image: req.image ?? null,
        }),
      });
      // 서버가 센 오늘 사용량 — 카운터 표시의 단일 출처 (429 응답에도 실려 온다)
      const usedH = Number(res.headers.get("x-chat-used"));
      const limitH = Number(res.headers.get("x-chat-limit"));
      const usage =
        Number.isFinite(usedH) && usedH > 0 && Number.isFinite(limitH) && limitH > 0
          ? { used: usedH, limit: limitH }
          : undefined;
      // 하루 한도 초과 → mock 폴백 대신 안내 메시지
      if (res.status === 429) {
        return { stream: once(await limitMessage()), model: "limit", usage };
      }
      if (!res.ok || !res.body) throw new Error(`api/chat ${res.status}`);
      return {
        stream: streamBody(res.body),
        model: res.headers.get("x-model") ?? "gemini",
        kbRefs: decodeRefs(res.headers.get("x-kb-refs")),
        usage,
      };
    } catch (e) {
      console.warn("[llm] remote 실패 → mock 폴백:", e);
      return this.fallback.ask(req);
    }
  }
}
