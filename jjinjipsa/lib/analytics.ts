/*
 * 제품 지표 이벤트 (지시서 Phase 4 — "리텐션을 확인하고 수익화").
 *
 * 외부 분석 도구(GA4·Amplitude)를 붙이지 않는다. ①이미 Supabase를 쓰고 있고
 * ②이 앱이 다루는 것은 고양이 건강 기록이라, 누가 언제 무엇을 눌렀는지를
 * 제3자 서버로 넘기지 않는 편이 낫다. 집계는 SQL Editor에서 직접 한다
 * (docs/지표.md에 KPI별 쿼리).
 *
 * ── 이 파일이 지키는 선 ──
 * **본문은 절대 올라가지 않는다.** 이벤트 이름과 props 키를 화이트리스트로 막고,
 * 값도 숫자·불리언·소문자 슬러그(a-z0-9_-)만 통과시킨다. 고양이 이름·메모·질문은
 * 전부 한글이거나 길어서 이 필터를 통과할 수 없다 — 실수로 넣어도 걸러진다.
 *
 * 실패는 조용히 삼킨다. 지표 때문에 화면이 멈추거나 저장이 실패하면 본말전도다.
 * 0008 미적용·동기화 OFF·세션 없음 상태에서는 아무 일도 하지 않는다.
 */

import { todayKey } from "@/lib/dailyStatus";

/*
 * kvSync와 같은 이유로 env를 직접 읽는다 — lib/storage를 import하면
 * 이벤트 한 줄 보내려고 Supabase 어댑터 전체를 끌고 오게 된다.
 */
const USE_SUPABASE = process.env.NEXT_PUBLIC_USE_SUPABASE === "1";

/**
 * 수집하는 이벤트 전부. 여기 없는 이름은 버린다.
 *
 * 각각이 어떤 질문에 답하는지 (docs/지표.md와 짝):
 *   app_open              → D1/D7 리텐션
 *   daily_status_saved    → 오늘냥 기록률
 *   symptom_saved         → 이상 기록 사용량
 *   symptom_to_chat       → 증상 기록 → 냥박사 연결률
 *   chat_asked            → 냥박사 재사용률
 *   weekly_report_viewed  → 주간 리포트 조회율
 *   report_draft_*        → 생활기록부 초안이 실제로 쓰이는지
 *   share_card_saved      → 공유 카드가 저장까지 가는지
 *   brush_milestone_shown → 양치 챌린지 도달률
 */
export const EVENT_NAMES = [
  "app_open",
  "daily_status_saved",
  "symptom_saved",
  "symptom_to_chat",
  "chat_asked",
  "weekly_report_viewed",
  "report_draft_requested",
  "report_draft_applied",
  "share_card_saved",
  "brush_milestone_shown",
] as const;

export type EventName = (typeof EVENT_NAMES)[number];

/**
 * props에 허용하는 키 전부 — 개수와 구분값만 있고 "무엇을 적었는지"는 없다.
 * 새 키가 필요하면 여기 추가하면서 "이 값으로 개인을 특정할 수 있나"를 먼저 본다.
 */
const PROP_KEYS = [
  "count", // 일반 개수
  "items", // 오늘 상태 4항목 중 채운 수
  "tags", // 증상 태그 수
  "memo", // 메모를 적었는지 (true/false)
  "from", // 어디서 넘어왔는지 (quick·direct)
  "source", // 무엇으로 질문했는지 (input·suggested·symptom)
  "scope", // guest·account
  "days", // 기록일 수
  "streak", // 연속 일수
  "texts", // 초안 근거로 쓴 문장 수
  "empty", // 아직 안 채운 항목 수
  "kind", // 카드 종류 (report·milestone)
] as const;

const PROP_KEY_SET = new Set<string>(PROP_KEYS);

export type EventProps = Record<string, string | number | boolean>;

/** 문자열 값은 짧은 ASCII 슬러그만 — 한글 본문이 실수로 들어와도 여기서 걸린다 */
const SLUG = /^[a-z0-9_-]{1,24}$/;

/** 화이트리스트 밖의 키, 규격 밖의 값은 조용히 버린다 (이벤트 자체는 살린다) */
export function sanitizeProps(props?: EventProps): EventProps {
  const out: EventProps = {};
  if (!props) return out;
  for (const [k, v] of Object.entries(props)) {
    if (!PROP_KEY_SET.has(k)) continue;
    if (typeof v === "boolean") out[k] = v;
    else if (typeof v === "number") {
      if (Number.isFinite(v)) out[k] = Math.round(v);
    } else if (typeof v === "string" && SLUG.test(v)) out[k] = v;
  }
  return out;
}

export type AnalyticsRow = { name: EventName; props: EventProps; day: string };

/**
 * 보낼 행을 만든다 — 네트워크와 분리해 둔 순수 함수라 테스트가 여기를 본다.
 * 모르는 이벤트 이름이면 null (= 보내지 않음).
 */
export function buildEvent(
  name: string,
  props?: EventProps,
  day: string = todayKey(),
): AnalyticsRow | null {
  if (!(EVENT_NAMES as readonly string[]).includes(name)) return null;
  return { name: name as EventName, props: sanitizeProps(props), day };
}

/** 실제 전송 — 성공했으면 true. 던지지 않는다 */
async function send(row: AnalyticsRow): Promise<boolean> {
  try {
    const { supabase } = await import("@/lib/supabase");
    const { data } = await supabase.auth.getUser();
    if (!data.user) return false; // 세션 전이면 버린다 (RLS가 uid를 요구한다)
    const { error } = await supabase.from("analytics_events").insert({
      user_id: data.user.id,
      name: row.name,
      props: row.props,
      day: row.day,
    });
    return !error;
  } catch {
    return false; // 0008 미적용·오프라인 등 — 지표는 화면보다 중요하지 않다
  }
}

/**
 * 이벤트 한 줄 기록 (fire-and-forget).
 *
 * 익명 로그인 사용자도 auth.uid()가 있어 그대로 기록된다 — 로그인 전 사용까지
 * 리텐션에 잡아야 "가입 전에 이탈했다"를 볼 수 있다. 기기별로 uid가 갈리는
 * 익명 계정의 한계는 docs/지표.md에 적어 둔다.
 */
export function track(name: EventName, props?: EventProps): void {
  if (!USE_SUPABASE || typeof window === "undefined") return;
  const row = buildEvent(name, props);
  if (!row) return;
  void send(row);
}

/**
 * 하루 한 번만 보내는 이벤트 표시 — 날짜별 플래그를 쌓지 않고 마지막 성공일 하나만 든다.
 *
 * 키 이름이 `sent`인 이유: 이전 구현은 보내기 **전에** `once:` 키를 찍어서,
 * 전송이 실패한 날도 "보냈다"로 남았다 (0008 적용 전에 앱을 연 사용자의
 * app_open이 통째로 유실됨 — 실제로 발생). 그 신뢰 못 할 플래그를 다시 읽지
 * 않으려고 키를 갈았다.
 */
const sentKey = (name: EventName) => `jjinjipsa:analytics:sent:${name}`;

/** 이 탭에서 전송 중인 이벤트 — 성공 확인 전에 중복으로 나가지 않게 */
const inFlight = new Set<string>();

/**
 * 하루 한 번만 (app_open처럼 "그날 열었는가"를 세는 이벤트용).
 *
 * **성공했을 때만** 오늘 보냈다고 표시한다. 실패한 날을 보냈다고 적으면 그
 * 사용자의 그날 리텐션이 사라지는데, 리텐션은 이 수집의 존재 이유라 그게 제일 아프다.
 * 실패하면 표시를 남기지 않으므로 다음 진입에서 다시 시도한다.
 */
export function trackOncePerDay(name: EventName, props?: EventProps): void {
  if (!USE_SUPABASE || typeof window === "undefined") return;
  const row = buildEvent(name, props);
  if (!row) return;
  if (inFlight.has(name)) return;
  try {
    if (localStorage.getItem(sentKey(name)) === row.day) return;
  } catch {
    return; // 저장이 막힌 환경이면 중복을 보내느니 거른다
  }
  inFlight.add(name);
  void send(row).then((ok) => {
    if (ok) {
      try {
        localStorage.setItem(sentKey(name), row.day);
      } catch {
        /* 표시를 못 남기면 다음 진입에 한 번 더 갈 뿐이다 */
      }
    }
    inFlight.delete(name);
  });
}
