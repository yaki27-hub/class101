/*
 * 로컬(localStorage) → 서버(Supabase) 1회 이관.
 *
 * 배경: 동기화를 켜기 전에 쌓인 기록은 브라우저에만 있다. 그대로 두면
 * 동기화를 켜는 순간 "기록이 사라진 것처럼" 보인다. 로그인·동기화 활성 시
 * 한 번 올려서 계정에 붙여준다.
 *
 * 설계:
 * - **로컬 데이터를 지우지 않는다.** 업로드가 잘못돼도 원본이 남아 복구할 수 있다.
 * - 서버 컬럼이 uuid라서, 옛 newId()(짧은 랜덤 문자열) 시절의 id는 그대로 못 올린다.
 *   **UUID를 재발급**하고 자식 기록의 참조(cat_id, session_id)를 함께 바꾼다.
 *   로컬 전용 키(오늘 상태·루틴·메모)도 새 id로 복사해 연결이 끊기지 않게 한다.
 *   (실사용 제보: 옛 id의 cats 업로드가 400으로 떨어지며 무한 재시도)
 * - UUID id는 그대로 쓰므로 upsert가 되어, 두 번 실행돼도 중복이 생기지 않는다.
 * - 실패하면 완료 표시를 남기지 않아 다음 기회에 다시 시도하되, **3회까지만** —
 *   같은 실패를 페이지를 열 때마다 반복하지 않는다.
 */

import { LocalStorageAdapter } from "./local";
import { SupabaseStorageAdapter } from "./supabase";
import { newId } from "./index";

const DONE_KEY = "jjinjipsa:migratedToServer";
const ATTEMPT_KEY = "jjinjipsa:migrateAttempts";
const MAX_ATTEMPTS = 3;

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export interface MigrateResult {
  /** 실제로 이관을 수행했는지 (건너뛴 경우 false) */
  ran: boolean;
  cats: number;
  traits: number;
  symptoms: number;
  weights: number;
  sessions: number;
  messages: number;
  /** 부분 실패한 항목 수 — 0이어야 정상 */
  failed: number;
  /** 재시도 상한에 걸려 더는 자동 시도하지 않는 상태 */
  gaveUp: boolean;
}

const EMPTY: MigrateResult = {
  ran: false, cats: 0, traits: 0, symptoms: 0, weights: 0,
  sessions: 0, messages: 0, failed: 0, gaveUp: false,
};

/** 이미 이관한 계정인지 (계정별로 따로 기록한다) */
function doneKeyFor(uid: string): string {
  return `${DONE_KEY}:${uid}`;
}

export function isMigrated(uid: string): boolean {
  if (typeof window === "undefined") return true;
  return localStorage.getItem(doneKeyFor(uid)) === "1";
}

function attempts(uid: string): number {
  const n = Number(localStorage.getItem(`${ATTEMPT_KEY}:${uid}`));
  return Number.isFinite(n) && n > 0 ? n : 0;
}

function bumpAttempts(uid: string): void {
  localStorage.setItem(`${ATTEMPT_KEY}:${uid}`, String(attempts(uid) + 1));
}

/**
 * 옛 id(짧은 랜덤 문자열)면 UUID를 재발급한다.
 * 같은 옛 id는 항상 같은 새 id로 — 부모·자식이 함께 옮겨져도 연결이 유지된다.
 * 재발급 맵은 localStorage에 남겨, 부분 실패 후 재시도해도 id가 또 바뀌지 않게 한다.
 */
const IDMAP_KEY = "jjinjipsa:migrateIdMap";

function loadIdMap(): Record<string, string> {
  try {
    return JSON.parse(localStorage.getItem(IDMAP_KEY) || "{}") as Record<string, string>;
  } catch {
    return {};
  }
}

/**
 * 로컬에 남은 기록을 현재 로그인 계정으로 올린다.
 * @param uid 현재 auth.uid() — 계정이 바뀌면 다시 이관해야 하므로 키에 쓴다
 */
export async function migrateLocalToServer(uid: string): Promise<MigrateResult> {
  if (typeof window === "undefined") return EMPTY;
  if (isMigrated(uid)) return EMPTY;
  if (attempts(uid) >= MAX_ATTEMPTS) return { ...EMPTY, gaveUp: true };

  const local = new LocalStorageAdapter();
  const server = new SupabaseStorageAdapter();

  const cats = await local.listCats();
  if (cats.length === 0) {
    // 올릴 게 없으면 완료로 표시해 매번 재시도하지 않는다
    localStorage.setItem(doneKeyFor(uid), "1");
    return { ...EMPTY, ran: true };
  }

  bumpAttempts(uid);
  const idMap = loadIdMap();
  const mapId = (id: string): string => {
    if (UUID_RE.test(id)) return id;
    if (!idMap[id]) idMap[id] = newId();
    return idMap[id];
  };

  const r: MigrateResult = { ...EMPTY, ran: true };

  for (const cat of cats) {
    const catId = mapId(cat.id);
    try {
      await server.saveCat({ ...cat, id: catId });
      r.cats++;
      // id가 바뀌었으면 로컬 전용 기록(오늘 상태·루틴·메모)도 새 id로 복사한다
      if (catId !== cat.id) copyLocalExtras(cat.id, catId);
    } catch {
      r.failed++;
      // 고양이가 안 올라가면 하위 기록은 외래키(cat_id)를 못 만족하므로 건너뛴다
      continue;
    }

    for (const t of await local.listTraits(cat.id)) {
      try {
        await server.addTrait({ ...t, id: mapId(t.id), catId });
        r.traits++;
      } catch {
        r.failed++;
      }
    }

    for (const s of await local.listSymptoms(cat.id)) {
      try {
        await server.addSymptom({
          ...s,
          id: mapId(s.id),
          catId,
          chatSessionId: s.chatSessionId ? mapId(s.chatSessionId) : s.chatSessionId,
        });
        r.symptoms++;
      } catch {
        r.failed++;
      }
    }

    for (const w of await local.listWeights(cat.id)) {
      try {
        await server.addWeight({ ...w, id: mapId(w.id), catId });
        r.weights++;
      } catch {
        r.failed++;
      }
    }

    for (const sess of await local.listSessions(cat.id)) {
      const sessId = mapId(sess.id);
      try {
        await server.createSession({ ...sess, id: sessId, catId });
        r.sessions++;
      } catch {
        r.failed++;
        continue; // 세션이 없으면 메시지도 못 올린다
      }
      for (const m of await local.listMessages(sess.id)) {
        try {
          await server.addMessage({ ...m, id: mapId(m.id), sessionId: sessId });
          r.messages++;
        } catch {
          r.failed++;
        }
      }
    }
  }

  // 재발급 맵 보존 — 부분 실패 후 재시도할 때 같은 id로 이어붙는다
  localStorage.setItem(IDMAP_KEY, JSON.stringify(idMap));

  // 전부 성공했을 때만 완료로 표시 — 부분 실패면 다음에 다시 시도한다(upsert라 안전)
  if (r.failed === 0) localStorage.setItem(doneKeyFor(uid), "1");
  else if (attempts(uid) >= MAX_ATTEMPTS) r.gaveUp = true;
  return r;
}

/** 옛 cat id에 붙어 있던 로컬 전용 키(오늘 상태·케어 루틴·꼭 기억할 것)를 새 id로 복사 */
function copyLocalExtras(oldId: string, catId: string): void {
  const prefixes = [
    ["jjinjipsa:daily:" + oldId + ":", "jjinjipsa:daily:" + catId + ":"],
    ["jjinjipsa:routine:" + oldId + ":", "jjinjipsa:routine:" + catId + ":"],
    ["jjinjipsa:healthnote:" + oldId, "jjinjipsa:healthnote:" + catId],
    ["jjinjipsa:weights:" + oldId, "jjinjipsa:weights:" + catId],
  ];
  for (const k of Object.keys(localStorage)) {
    for (const [oldP, newP] of prefixes) {
      if (k === oldP || (oldP.endsWith(":") && k.startsWith(oldP))) {
        const target = k.replace(oldP, newP);
        if (localStorage.getItem(target) === null) {
          const v = localStorage.getItem(k);
          if (v !== null) localStorage.setItem(target, v);
        }
      }
    }
  }
}
