"use client";

/*
 * 이상 기록 진입점 (개선 지시서 P0-2) — 홈에서 증상 기록으로 가는 지름길.
 *
 * 핵심 루프의 분기점이다: 평소와 같으면 상태 기록으로 끝나고, 다르면 여기서
 * 증상 기록으로 넘어가 냥박사 상담까지 이어진다. 버튼 라벨은 집사어,
 * 연결은 기존 증상 태그(lib/symptomTags)로 — 새 카테고리 체계를 만들지 않는다.
 */

import { useRouter } from "next/navigation";

/*
 * 화면 문구(label)와 저장되는 태그(tag)는 **분리한다** (지시서 P0 5항).
 * label은 집사가 읽기 쉬운 말로 바꿔도 되지만, tag는 lib/symptomTags의 기존
 * tags[] 명칭 그대로여야 한다 — 태그가 바뀌면 과거 기록과 매칭이 끊기고
 * 냥박사의 "저번에도 그랬나"가 침묵한다.
 */
const ACTIONS: Array<{ label: string; tag: string | null }> = [
  { label: "구토", tag: "구토" },
  { label: "식욕 저하", tag: "식욕 변화" },
  { label: "변 변화", tag: "배변 이상" },
  { label: "기타 +", tag: null },
];

export default function QuickSymptomCard({ catId }: { catId: string }) {
  const router = useRouter();
  return (
    <section className="rounded-3xl bg-rd-card p-5">
      <h2 className="text-[16px] font-extrabold tracking-[-0.02em] text-rd-ink">
        오늘 평소와 다른 일이 있었나요?
      </h2>
      <p className="mt-1 text-[12.5px] text-rd-muted">
        기록해 두면 냥박사가 다음 상담에서 기억해요.
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        {ACTIONS.map((a) => (
          <button
            key={a.label}
            type="button"
            onClick={() =>
              router.push(
                `/cats/${catId}/log${a.tag ? `?tags=${encodeURIComponent(a.tag)}` : ""}`,
              )
            }
            className="min-h-11 rounded-full border border-rd-line bg-white px-4 text-[13px] font-bold text-rd-ink active:scale-95"
          >
            {a.label}
          </button>
        ))}
      </div>
    </section>
  );
}
