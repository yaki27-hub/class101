/*
 * 저장 어댑터 인터페이스 — UI는 반드시 이 인터페이스만 사용한다.
 * M1~M2: LocalStorageAdapter (lib/storage/local.ts)
 * M3(T-16): SupabaseAdapter로 교체 — UI 코드 무수정이 목표.
 * 모든 메서드는 async: 로컬 구현엔 과하지만 Supabase 교체 시 시그니처가 안 바뀐다.
 */

import type {
  Cat,
  ChatMessage,
  ChatSession,
  SymptomLog,
  TraitAnswer,
} from "./types";

export interface StorageAdapter {
  // 묘 프로필 (F-01)
  listCats(): Promise<Cat[]>;
  getCat(id: string): Promise<Cat | null>;
  /** id가 이미 있으면 갱신, 없으면 추가 (upsert) */
  saveCat(cat: Cat): Promise<void>;
  deleteCat(id: string): Promise<void>;

  // 오늘의 체크 (F-15)
  listTraits(catId: string): Promise<TraitAnswer[]>;
  addTrait(answer: TraitAnswer): Promise<void>;

  // 증상 기록 (F-05)
  listSymptoms(catId: string): Promise<SymptomLog[]>;
  addSymptom(log: SymptomLog): Promise<void>;
  deleteSymptom(catId: string, id: string): Promise<void>;

  // 챗봇 대화 (F-08)
  listSessions(catId: string): Promise<ChatSession[]>;
  createSession(session: ChatSession): Promise<void>;
  listMessages(sessionId: string): Promise<ChatMessage[]>;
  addMessage(message: ChatMessage): Promise<void>;
}
