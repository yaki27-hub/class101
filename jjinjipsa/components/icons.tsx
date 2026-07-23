/* 채움형(solid) 아이콘 세트 — 라인·채움 혼용 금지 (핸드오프 §Iconography).
 * currentColor로 채우므로 부모 text-색으로 카테고리 색 지정. */

type P = { size?: number; className?: string };

const S = (size: number) => ({
  width: size,
  height: size,
  viewBox: "0 0 24 24",
  fill: "currentColor",
  xmlns: "http://www.w3.org/2000/svg",
});

/** 밥그릇 (식사) */
export function IconBowl({ size = 24, className }: P) {
  return (
    <svg {...S(size)} className={className} aria-hidden>
      <path d="M2.5 11h19a1 1 0 0 1 1 1.05A9.5 9.5 0 0 1 14 20.7V22H10v-1.3A9.5 9.5 0 0 1 1.5 12.05 1 1 0 0 1 2.5 11Z" />
      <path d="M8.2 9.4C7.3 8.6 7.3 7.6 8 6.8c.6-.7.6-1.3.1-2 .9.2 1.5 1 1.3 2-.1.7-.7 1.1-.5 1.9Zm3.6-.2c-.9-.8-.9-1.8-.2-2.6.6-.7.6-1.3.1-2 .9.2 1.5 1 1.3 2-.1.7-.7 1.2-.5 2Zm3.5.2c-.9-.8-.9-1.8-.2-2.6.6-.7.6-1.3.1-2 .9.2 1.5 1 1.3 2-.1.8-.7 1.2-.5 2Z" />
    </svg>
  );
}

/** 물방울 (물) */
export function IconWater({ size = 24, className }: P) {
  return (
    <svg {...S(size)} className={className} aria-hidden>
      <path d="M12 2.2c3.6 4.2 6.5 7.9 6.5 11.3A6.5 6.5 0 0 1 5.5 13.5C5.5 10.1 8.4 6.4 12 2.2Z" />
    </svg>
  );
}

/** 화장실 트레이 (배변) */
export function IconLitter({ size = 24, className }: P) {
  return (
    <svg {...S(size)} className={className} aria-hidden>
      <path d="M4 10h16l-1.3 8.2a2 2 0 0 1-2 1.8H7.3a2 2 0 0 1-2-1.8L4 10Z" />
      <circle cx="9" cy="14" r="1.2" fill="#fff" />
      <circle cx="13.5" cy="15.5" r="1.2" fill="#fff" />
      <circle cx="15" cy="12.5" r="1" fill="#fff" />
      <rect x="3" y="7.5" width="18" height="3" rx="1.2" />
    </svg>
  );
}

/** 발바닥 (활동) */
export function IconYarn({ size = 24, className }: P) {
  return (
    <svg {...S(size)} className={className} aria-hidden>
      <ellipse cx="12" cy="16.2" rx="4.6" ry="3.7" />
      <ellipse cx="6.6" cy="11.6" rx="1.9" ry="2.3" />
      <ellipse cx="17.4" cy="11.6" rx="1.9" ry="2.3" />
      <ellipse cx="9.6" cy="8.2" rx="1.8" ry="2.2" />
      <ellipse cx="14.4" cy="8.2" rx="1.8" ry="2.2" />
    </svg>
  );
}

/** 카메라 */
export function IconCamera({ size = 24, className }: P) {
  return (
    <svg {...S(size)} className={className} aria-hidden>
      <path d="M9 4h6l1.2 2H20a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h3.8L9 4Z" />
      <circle cx="12" cy="13" r="3.4" fill="#fff" />
    </svg>
  );
}

/** 알림 벨 */
export function IconBell({ size = 24, className }: P) {
  return (
    <svg {...S(size)} className={className} aria-hidden>
      <path d="M12 2.5a1.2 1.2 0 0 1 1.2 1.2v.6a6 6 0 0 1 4.8 5.9v3l1.4 2.3a1 1 0 0 1-.86 1.5H5.46a1 1 0 0 1-.86-1.5L6 13.2v-3a6 6 0 0 1 4.8-5.9v-.6A1.2 1.2 0 0 1 12 2.5ZM9.8 19.5h4.4a2.2 2.2 0 0 1-4.4 0Z" />
    </svg>
  );
}

/** 홈 */
export function IconHome({ size = 24, className }: P) {
  return (
    <svg {...S(size)} className={className} aria-hidden>
      <path d="M11.3 3.2a1 1 0 0 1 1.4 0l8 7.4a1 1 0 0 1-.68 1.73H19v7.2a1.3 1.3 0 0 1-1.3 1.27h-3v-5.2h-4.4V21h-3A1.3 1.3 0 0 1 6 19.53v-7.2H4.98a1 1 0 0 1-.68-1.73l7-6.4Z" />
    </svg>
  );
}

/** 냥 말풍선 */
export function IconChat({ size = 24, className }: P) {
  return (
    <svg {...S(size)} className={className} aria-hidden>
      <path d="M4 3.5h16A1.5 1.5 0 0 1 21.5 5v9A1.5 1.5 0 0 1 20 15.5H9.8L6 19.2A1 1 0 0 1 4.3 18.5V15.5H4A1.5 1.5 0 0 1 2.5 14V5A1.5 1.5 0 0 1 4 3.5Z" />
      <circle cx="9" cy="9.6" r="1.15" fill="#fff" />
      <circle cx="15" cy="9.6" r="1.15" fill="#fff" />
    </svg>
  );
}

/** 달력 메모 (기록) */
export function IconRecord({ size = 24, className }: P) {
  return (
    <svg {...S(size)} className={className} aria-hidden>
      <path d="M7 2.5a1 1 0 0 1 1 1V4h8v-.5a1 1 0 1 1 2 0V4h1A1.5 1.5 0 0 1 20.5 5.5V19A1.5 1.5 0 0 1 19 20.5H5A1.5 1.5 0 0 1 3.5 19V5.5A1.5 1.5 0 0 1 5 4h1v-.5a1 1 0 0 1 1-1ZM4.8 9.5v9.2h14.4V9.5H4.8Z" />
      <rect x="7" y="12" width="6.5" height="1.6" rx=".8" fill="#fff" />
      <rect x="7" y="15" width="4.5" height="1.6" rx=".8" fill="#fff" />
    </svg>
  );
}

/** 고양이 얼굴 (우리 아이) */
export function IconCat({ size = 24, className }: P) {
  return (
    <svg {...S(size)} className={className} aria-hidden>
      <path d="M4 3.5 8 6a9 9 0 0 1 8 0l4-2.5-.4 5.2A8 8 0 0 1 20 12a8 8 0 0 1-16 0 8 8 0 0 1 .4-3.3L4 3.5Z" />
      <circle cx="9" cy="12" r="1.15" fill="#fff" />
      <circle cx="15" cy="12" r="1.15" fill="#fff" />
      <path d="M11 15h2l-1 1.1L11 15Z" fill="#fff" />
    </svg>
  );
}
