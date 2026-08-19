"use client";

/*
 * 음성 입력 (모카 프로토타입의 마이크) — 브라우저 내장 Web Speech API만 쓴다.
 *
 * 오디오를 우리 서버로 보내지 않는다 (비용 0, 건강 메모 육성이 서버에 남지 않음).
 * 미지원 브라우저(Firefox 등)에서는 supported=false — 버튼을 아예 숨긴다.
 * 안 되는 버튼을 보여주고 눌렀을 때 사과하는 것보다 정직하다.
 *
 * 인식 결과는 "시작 시점의 입력값 + 인식 문장"으로 합쳐 onText로 돌려준다.
 * 중간 결과(interim)도 그대로 흘려서 말하는 동안 글자가 차오르게 한다.
 */

import { useCallback, useEffect, useRef, useState } from "react";

/* Web Speech API는 TS 내장 타입이 없어(벤더 프리픽스) 필요한 만큼만 선언한다 */
interface SpeechAlternative {
  transcript: string;
}
interface SpeechResult {
  0: SpeechAlternative;
  isFinal: boolean;
}
interface SpeechResultEvent {
  results: { length: number; [i: number]: SpeechResult };
}
interface SpeechErrorEvent {
  error: string;
}
interface Recognition {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  onresult: ((e: SpeechResultEvent) => void) | null;
  onend: (() => void) | null;
  onerror: ((e: SpeechErrorEvent) => void) | null;
  start(): void;
  stop(): void;
  abort(): void;
}
type RecognitionCtor = new () => Recognition;

function getCtor(): RecognitionCtor | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as {
    SpeechRecognition?: RecognitionCtor;
    webkitSpeechRecognition?: RecognitionCtor;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

export function useSpeechInput({
  onText,
  onError,
}: {
  /** 시작 시점 값 + 지금까지 인식된 문장 — 입력창 값으로 그대로 쓰면 된다 */
  onText: (text: string) => void;
  /** 권한 거부 등 사용자에게 알려야 하는 실패 (no-speech 같은 건 조용히 끝낸다) */
  onError?: (message: string) => void;
}) {
  // 지원 여부는 mount 후에 정한다 — SSR과 첫 페인트가 어긋나지 않게 (hydration)
  const [supported, setSupported] = useState(false);
  const [listening, setListening] = useState(false);
  const recRef = useRef<Recognition | null>(null);
  const baseRef = useRef("");
  const cbRef = useRef({ onText, onError });
  cbRef.current = { onText, onError };

  useEffect(() => {
    setSupported(getCtor() !== null);
    return () => recRef.current?.abort();
  }, []);

  const stop = useCallback(() => {
    recRef.current?.stop();
  }, []);

  const start = useCallback((currentValue: string) => {
    const Ctor = getCtor();
    if (!Ctor || recRef.current) return;

    baseRef.current = currentValue.trim() ? currentValue.replace(/\s+$/, "") + " " : "";

    const rec = new Ctor();
    rec.lang = "ko-KR";
    rec.interimResults = true;
    rec.continuous = false; // 말을 멈추면 알아서 끝난다 — 짧은 메모·질문용

    rec.onresult = (e) => {
      let text = "";
      for (let i = 0; i < e.results.length; i++) text += e.results[i][0].transcript;
      if (text) cbRef.current.onText(baseRef.current + text);
    };
    rec.onerror = (e) => {
      if (e.error === "not-allowed" || e.error === "service-not-allowed") {
        cbRef.current.onError?.("마이크 사용을 허용해 주시면 음성으로 적을 수 있어요.");
      } else if (e.error !== "no-speech" && e.error !== "aborted") {
        cbRef.current.onError?.("음성을 인식하지 못했어요. 다시 시도해 주세요.");
      }
      // onend가 항상 뒤따라오므로 정리는 거기서 한다
    };
    rec.onend = () => {
      recRef.current = null;
      setListening(false);
    };

    try {
      rec.start();
      recRef.current = rec;
      setListening(true);
    } catch {
      cbRef.current.onError?.("음성을 인식하지 못했어요. 다시 시도해 주세요.");
    }
  }, []);

  return { supported, listening, start, stop };
}
