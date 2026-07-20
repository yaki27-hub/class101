/*
 * AI 일러스트 라우트 (T-25, D-08) — 업로드 사진을 cottagecore 일러스트로 변환.
 * Gemini 이미지 모델(image-to-image) 사용. 서버에서만 키 사용.
 * 무료 등급은 이미지 생성 할당량이 없어 429가 나므로, 클라이언트가 안내를 띄우도록
 * 명확한 상태코드로 응답한다. billing 활성 시 즉시 동작.
 */

import { getCatAge } from "@/lib/catAge";

const IMAGE_MODEL = process.env.GEMINI_IMAGE_MODEL ?? "gemini-3-pro-image-preview";

interface Body {
  photo: string; // dataURL
  name: string;
  birthDate: string;
  breedGroup: string;
}

export async function POST(req: Request): Promise<Response> {
  const key = process.env.GEMINI_API_KEY;
  if (!key) return Response.json({ error: "no-key" }, { status: 503 });

  const body = (await req.json()) as Body;
  const m = /^data:(image\/[a-z.+-]+);base64,(.+)$/i.exec(body.photo ?? "");
  if (!m) return Response.json({ error: "bad-photo" }, { status: 400 });
  const [, mimeType, data] = m;

  const age = getCatAge(body.birthDate);
  const prompt =
    `이 사진 속 고양이를 따뜻한 손그림 동화풍(cottagecore) 일러스트로 그려줘. ` +
    `털색과 무늬는 사진 그대로 유지하고, 아늑한 통나무집 안에서 니트 스웨터를 입고 ` +
    `벽난로 불빛 아래 편안히 쉬는 모습으로. ${age.stageLabel} 고양이의 분위기. ` +
    `포근한 가을 색감, 부드러운 붓터치, 세로 초상화.`;

  let res: Response;
  try {
    res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${IMAGE_MODEL}:generateContent`,
      {
        method: "POST",
        headers: { "x-goog-api-key": key, "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                { text: prompt },
                { inlineData: { mimeType, data } },
              ],
            },
          ],
          generationConfig: { responseModalities: ["IMAGE"] },
        }),
      },
    );
  } catch {
    return Response.json({ error: "network" }, { status: 502 });
  }

  if (res.status === 429) {
    // 무료 등급 이미지 할당량 소진 → billing 안내
    return Response.json({ error: "quota" }, { status: 429 });
  }
  if (!res.ok) {
    return Response.json({ error: "upstream" }, { status: 502 });
  }

  const json = (await res.json()) as {
    candidates?: Array<{
      content?: { parts?: Array<{ inlineData?: { mimeType?: string; data?: string } }> };
    }>;
  };
  const part = json.candidates?.[0]?.content?.parts?.find((p) => p.inlineData?.data);
  if (!part?.inlineData?.data) {
    return Response.json({ error: "no-image" }, { status: 502 });
  }
  const out = `data:${part.inlineData.mimeType ?? "image/png"};base64,${part.inlineData.data}`;
  return Response.json({ image: out });
}
