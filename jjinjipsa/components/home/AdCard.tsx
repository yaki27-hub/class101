"use client";

/*
 * 광고 자리 — 네이티브 카드. 카드 스택 맨 아래에만 둔다.
 * 히어로에는 넣지 않는다: 가이드의 "히어로 요소 4개까지" 규칙을 깨기 때문.
 *
 * 실제 소재가 붙기 전이라 썸네일·카피는 플레이스홀더다. AD 배지는 지우지 말 것.
 */

export default function AdCard({
  meta = "광고 자리 · 네이티브 카드",
  copy = "파트너 상품 한 줄 카피가 들어갑니다",
  bordered = false,
}: {
  meta?: string;
  copy?: string;
  /** 홈 카드 스택에서는 얇은 테두리로 콘텐츠 카드와 구분한다 */
  bordered?: boolean;
}) {
  return (
    <section
      className={`flex items-center gap-3.5 rounded-3xl bg-rd-card p-4 ${
        bordered ? "border border-black/5" : ""
      }`}
    >
      <div
        className="ad-thumb flex size-14 flex-none items-center justify-center rounded-2xl text-center text-[9.5px] leading-tight font-bold text-rd-faint"
        aria-hidden
      >
        브랜드
        <br />
        이미지
      </div>
      <div className="min-w-0 flex-1">
        <div className="mb-1 flex items-center gap-1.5">
          <span className="rounded-[4px] border border-[#DCDFD9] px-1 py-px text-[9.5px] font-bold text-rd-faint">
            AD
          </span>
          <span className="truncate text-[11.5px] font-medium text-rd-faint">{meta}</span>
        </div>
        <p className="truncate text-[14px] font-bold tracking-[-0.02em] text-rd-ink">
          {copy}
        </p>
      </div>
      <span className="flex-none rounded-full bg-[#F1F3EF] px-3.5 py-2 text-[12px] font-bold whitespace-nowrap text-rd-ink">
        보기
      </span>
    </section>
  );
}
