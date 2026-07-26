/*
 * 로컬(localStorage) → 서버(Supabase) 1회 이관.
 *
 * 배경: 동기화를 켜기 전에 쌓인 기록은 브라우저에만 있다. 그대로 두면
 * 동기화를 켜는 순간 "기록이 사라진 것처럼" 보인다. 로그인·동기화 활성 시
 * 한 번 올려서 계정에 붙여준다.
 *
 * 설계:
 * - **로컬 데이터를 지우지 않는다.** 업로드가 잘못돼도 원본이 남아 복구할 수 있다.
 * - id를 그대로 쓰므로 upsert가 되어, 두 번 실행돼도 중복이 생기지 않는다.
 * - 실패하면 완료 표시를 남기지 않아 다음 기회에 다시 시도한다.
 */

import { LocalStorageAdapter } from "./local";
import { SupabaseStorageAdapter } from "./supabase";

const DONE_KEY = "jjinjipsa:migratedToServer";

export interface MigrateResult {
  /** 실제로 이관을 수행했는지 (건너뛴 경우 false) */
  ran: boolean;
  cats: number;
  traits: number;
  symptoms: number;
  sessions: number;
  messages: number;
  /** 부분 실패한 항목 수 — 0이어야 정상 */
  failed: number;
}

const EMPTY: MigrateResult = {
  ran: false, cats: 0, traits: 0, symptoms: 0, sessions: 0, messages: 0, failed: 0,
};

/** 이미 이관한 계정인지 (계정별로 따로 기록한다) */
function doneKeyFor(uid: string): string {
  return `${DONE_KEY}:${uid}`;
}

export function isMigrated(uid: string): boolean {
  if (typeof window === "undefined") return true;
  return localStorage.getItem(doneKeyFor(uid)) === "1";
}

/**
 * 로컬에 남은 기록을 현재 로그인 계정으로 올린다.
 * @param uid 현재 auth.uid() — 계정이 바뀌면 다시 이관해야 하므로 키에 쓴다
 */
export async function migrateLocalToServer(uid: string): Promise<MigrateResult> {
  if (typeof window === "undefined") return EMPTY;
  if (isMigrated(uid)) return EMPTY;

  const local = new LocalStorageAdapter();
  const server = new SupabaseStorageAdapter();

  const cats = await local.listCats();
  if (cats.length === 0) {
    // 올릴 게 없으면 완료로 표시해 매번 재시도하지 않는다
    localStorage.setItem(doneKeyFor(uid), "1");
    return { ...EMPTY, ran: true };
  }

  const r: MigrateResult = { ...EMPTY, ran: true };

  for (const cat of cats) {
    try {
      await server.saveCat(cat);
      r.cats++;
    } catch {
      r.failed++;
      // 고양이가 안 올라가면 하위 기록은 외래키(cat_id)를 못 만족하므로 건너뛴다
      continue;
    }

    for (const t of await local.listTraits(cat.id)) {
      try {
        await server.addTrait(t);
        r.traits++;
      } catch {
        r.failed++;
      }
    }

    for (const s of await local.listSymptoms(cat.id)) {
      try {
        await server.addSymptom(s);
        r.symptoms++;
      } catch {
        r.failed++;
      }
    }

    for (const sess of await local.listSessions(cat.id)) {
      try {
        await server.createSession(sess);
        r.sessions++;
      } catch {
        r.failed++;
        continue; // 세션이 없으면 메시지도 못 올린다
      }
      for (const m of await local.listMessages(sess.id)) {
        try {
          await server.addMessage(m);
          r.messages++;
        } catch {
          r.failed++;
        }
      }
    }
  }

  // 전부 성공했을 때만 완료로 표시 — 부분 실패면 다음에 다시 시도한다(upsert라 안전)
  if (r.failed === 0) localStorage.setItem(doneKeyFor(uid), "1");
  return r;
}
