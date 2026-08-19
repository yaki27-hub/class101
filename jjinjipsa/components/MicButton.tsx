"use client";

/*
 * 마이크 버튼 (모카 프로토타입) — 누르면 브라우저 음성 인식으로 입력창을 채운다.
 * 미지원 브라우저에서는 아무것도 그리지 않는다 (useSpeechInput 주석 참조).
 * 인식 중에는 빨간 배경 + 펄스로 "듣고 있음"을 알리고, 다시 누르면 멈춘다.
 */

import { useSpeechInput } from "@/hooks/useSpeechInput";
import { IconMic } from "@/components/icons";

export default function MicButton({
  value,
  onChange,
  onError,
  className = "bg-rd-page text-rd-muted",
}: {
  /** 지금 입력창에 있는 값 — 인식 문장은 이 뒤에 이어 붙는다 */
  value: string;
  onChange: (next: string) => void;
  onError?: (message: string) => void;
  /** 대기 상태 배경·글자색 — 놓이는 바탕에 맞춰 바꾼다 (기본: 흰 바 위) */
  className?: string;
}) {
  const { supported, listening, start, stop } = useSpeechInput({
    onText: onChange,
    onError,
  });

  if (!supported) return null;

  return (
    <button
      type="button"
      onClick={() => (listening ? stop() : start(value))}
      aria-label={listening ? "음성 입력 중지" : "음성으로 입력"}
      aria-pressed={listening}
      className={`flex size-11 flex-none items-center justify-center rounded-[14px] active:scale-95 ${
        listening ? "bg-rd-danger text-white motion-safe:animate-pulse" : className
      }`}
    >
      <IconMic size={20} />
    </button>
  );
}
