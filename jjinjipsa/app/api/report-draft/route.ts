/*
 * 생활기록부 초안 제안 (지시서 P2-1) — 집사가 **직접 쓴 문장**에서만 성격 문항의 답을 찾는다.
 *
 * 이 라우트의 핵심 제약 세 가지:
 *
 * 1. **건강 기록에서 성격을 추론하지 않는다.** 식사량·체중·증상 수치로 "애교"를 매기는 것은
 *    지어내기이고, 건강 데이터와 성격 데이터를 섞지 않는다는 원칙(지시서 P2-1)에 어긋난다.
 *    입력은 집사의 문장(챗 질문·증상 메모·꼭 기억할 것)뿐이다.
 * 2. **근거 없으면 제안하지 않는다.** 모델이 고른 답에는 반드시 집사의 문장이 붙어야 하고,
 *    서버가 그 문장이 실제 입력에 있었는지 대조해 통과한 것만 내보낸다.
 * 3. **자동 저장하지 않는다.** 여기는 제안까지만. 저장은 집사가 화면에서 [적용]을 눌러야 한다.
 *
 * 비용: 상담 한도(계정별 하루 10회)를 쓰지 않는다 — 자랑용 기능이 정작 아플 때 쓸 횟수를
 * 먹으면 안 된다(D-20 주석). 남용 방지는 공용 IP 상한만 재사용한다.
 */

import { overIpLimit } from "@/lib/server/ipLimit";
import { PERSONALITY_QUESTIONS } from "@/lib/personality";

const MODEL = process.env.GEMINI_TEXT_MODEL ?? "gemini-3.1-flash-lite";
/** 한 번에 제안할 최대 문항 수 — 너무 많으면 확인이 일이 된다 */
const MAX_SUGGESTIONS = 6;

interface DraftBody {
  catName: string;
  /** 집사가 쓴 문장들 (lib/reportReadiness.collectEvidenceTexts 결과) */
  texts: string[];
  /** 이미 답한 문항 key — 다시 제안하지 않는다 */
  answeredKeys?: string[];
}

export interface DraftSuggestion {
  /** 문항 key (PERSONALITY_QUESTIONS의 key) */
  key: string;
  /** 고른 선택지 label (해당 문항의 options 중 하나) */
  label: string;
  /** 근거가 된 집사의 문장 (입력에 실제로 있던 것) */
  evidence: string;
}

/** 비교용 정규화 — 공백·문장부호 차이로 근거 대조가 실패하지 않게 */
function norm(s: string): string {
  return s.replace(/\s+/g, "").replace(/[.,!?~…"'"']/g, "");
}

export async function POST(req: Request): Promise<Response> {
  const key = process.env.GEMINI_API_KEY;
  if (!key) return Response.json({ error: "no-key" }, { status: 503 });

  if (await overIpLimit(req)) {
    return Response.json({ error: "rate-limit" }, { status: 429 });
  }

  const body = (await req.json()) as DraftBody;
  const texts = (body.texts ?? []).map((t) => String(t).trim()).filter(Boolean);
  if (texts.length === 0) {
    return Response.json({ suggestions: [] });
  }

  const answered = new Set(body.answeredKeys ?? []);
  const open = PERSONALITY_QUESTIONS.filter((q) => !answered.has(q.key));
  if (open.length === 0) return Response.json({ suggestions: [] });

  const questionList = open
    .map(
      (q) =>
        `- ${q.key}: ${q.options.map((o) => `"${o.label}"`).join(" / ")}`,
    )
    .join("\n");

  const system = `너는 집사가 남긴 문장에서 고양이의 **성격**에 대한 단서를 찾는 일을 한다.

규칙:
1. 아래 <집사의 문장>에 **실제로 적힌 내용**만 근거로 쓴다. 없는 이야기를 지어내지 않는다.
2. 근거가 분명한 문항만 고른다. 애매하면 고르지 않는다. 하나도 없으면 빈 배열을 낸다.
3. answer는 반드시 그 문항의 보기 중 **하나를 그대로** 옮겨 쓴다. 새로 만들지 않는다.
4. evidence는 근거가 된 집사의 문장을 **그대로** 옮긴다. 요약하거나 고쳐 쓰지 않는다.
5. 건강 상태(식사량·체중·증상의 심각도)로 성격을 판단하지 않는다. 성격 이야기만 본다.
6. 최대 ${MAX_SUGGESTIONS}개까지만 고른다.

문항과 보기:
${questionList}

출력은 **JSON 배열만** 낸다. 설명·머리말·코드펜스 없이:
[{"key":"문항 key","answer":"보기 중 하나","evidence":"집사의 문장 그대로"}]`;

  const user = `<집사의 문장>\n${texts.map((t) => `- ${t}`).join("\n")}\n</집사의 문장>\n\n고양이 이름: ${body.catName}`;

  let raw = "";
  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`,
      {
        method: "POST",
        headers: { "x-goog-api-key": key, "Content-Type": "application/json" },
        body: JSON.stringify({
          system_instruction: { parts: [{ text: system }] },
          contents: [{ role: "user", parts: [{ text: user }] }],
          generationConfig: {
            temperature: 0.2,
            responseMimeType: "application/json",
            thinkingConfig: { thinkingBudget: 0 },
          },
        }),
      },
    );
    if (!res.ok) {
      console.error("[api/report-draft] gemini", res.status);
      return Response.json({ error: "upstream" }, { status: 502 });
    }
    const json = (await res.json()) as {
      candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
    };
    raw = (json.candidates?.[0]?.content?.parts ?? [])
      .map((p) => p.text ?? "")
      .join("");
  } catch {
    return Response.json({ error: "network" }, { status: 502 });
  }

  let parsed: Array<{ key?: string; answer?: string; evidence?: string }>;
  try {
    const cleaned = raw.trim().replace(/^```json\s*/i, "").replace(/```$/, "");
    parsed = JSON.parse(cleaned);
    if (!Array.isArray(parsed)) parsed = [];
  } catch {
    console.warn("[api/report-draft] JSON 파싱 실패");
    return Response.json({ suggestions: [] });
  }

  /*
   * 검증 — 모델을 믿지 않는다. 셋 다 통과한 것만 내보낸다:
   *  ① 실재하는 문항인가 ② 그 문항의 보기 중 하나인가 ③ 근거가 입력 문장에 실제로 있었나
   * ③이 이 기능의 정직성을 지키는 마지막 방어선이다.
   */
  const normalizedTexts = texts.map(norm);
  const seen = new Set<string>();
  const suggestions: DraftSuggestion[] = [];

  for (const item of parsed) {
    const q = open.find((x) => x.key === item.key);
    if (!q || seen.has(q.key)) continue;
    const option = q.options.find((o) => o.label === item.answer);
    if (!option) continue;
    const evidence = (item.evidence ?? "").trim();
    if (evidence.length < 4) continue;
    const e = norm(evidence);
    const grounded = normalizedTexts.some((t) => t.includes(e) || e.includes(t));
    if (!grounded) continue;

    seen.add(q.key);
    suggestions.push({ key: q.key, label: option.label, evidence });
    if (suggestions.length >= MAX_SUGGESTIONS) break;
  }

  console.log(
    `[api/report-draft] texts=${texts.length} raw=${parsed.length} kept=${suggestions.length}`,
  );
  return Response.json({ suggestions });
}
