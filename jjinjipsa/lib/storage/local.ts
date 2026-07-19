/*
 * localStorage 구현 — 키 구조는 킥오프킷 규칙을 따른다:
 *   jjinjipsa:cats                  Cat[]
 *   jjinjipsa:traits:{catId}        TraitAnswer[]
 *   jjinjipsa:symptoms:{catId}      SymptomLog[]
 *   jjinjipsa:chats:{catId}         ChatSession[]
 *   jjinjipsa:chatmsgs:{sessionId}  ChatMessage[]
 * SSR에서는 storage가 없으므로 빈 값으로 동작한다 (클라이언트에서만 실제 저장).
 */

import type { StorageAdapter } from "./adapter";
import type {
  Cat,
  ChatMessage,
  ChatSession,
  SymptomLog,
  TraitAnswer,
} from "./types";

const NS = "jjinjipsa";

function read<T>(key: string): T[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T[]) : [];
  } catch {
    return [];
  }
}

function write<T>(key: string, rows: T[]): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(key, JSON.stringify(rows));
}

export class LocalStorageAdapter implements StorageAdapter {
  async listCats(): Promise<Cat[]> {
    return read<Cat>(`${NS}:cats`);
  }

  async getCat(id: string): Promise<Cat | null> {
    return (await this.listCats()).find((c) => c.id === id) ?? null;
  }

  async saveCat(cat: Cat): Promise<void> {
    const cats = await this.listCats();
    const i = cats.findIndex((c) => c.id === cat.id);
    if (i >= 0) cats[i] = { ...cat, updatedAt: new Date().toISOString() };
    else cats.push(cat);
    write(`${NS}:cats`, cats);
  }

  async deleteCat(id: string): Promise<void> {
    write(
      `${NS}:cats`,
      (await this.listCats()).filter((c) => c.id !== id),
    );
    if (typeof window !== "undefined") {
      window.localStorage.removeItem(`${NS}:traits:${id}`);
      window.localStorage.removeItem(`${NS}:symptoms:${id}`);
      window.localStorage.removeItem(`${NS}:chats:${id}`);
    }
  }

  async listTraits(catId: string): Promise<TraitAnswer[]> {
    return read<TraitAnswer>(`${NS}:traits:${catId}`);
  }

  async addTrait(answer: TraitAnswer): Promise<void> {
    const rows = await this.listTraits(answer.catId);
    rows.push(answer);
    write(`${NS}:traits:${answer.catId}`, rows);
  }

  async listSymptoms(catId: string): Promise<SymptomLog[]> {
    return read<SymptomLog>(`${NS}:symptoms:${catId}`);
  }

  async addSymptom(log: SymptomLog): Promise<void> {
    const rows = await this.listSymptoms(log.catId);
    rows.push(log);
    write(`${NS}:symptoms:${log.catId}`, rows);
  }

  async deleteSymptom(catId: string, id: string): Promise<void> {
    write(
      `${NS}:symptoms:${catId}`,
      (await this.listSymptoms(catId)).filter((s) => s.id !== id),
    );
  }

  async listSessions(catId: string): Promise<ChatSession[]> {
    return read<ChatSession>(`${NS}:chats:${catId}`);
  }

  async createSession(session: ChatSession): Promise<void> {
    const rows = await this.listSessions(session.catId);
    rows.push(session);
    write(`${NS}:chats:${session.catId}`, rows);
  }

  async listMessages(sessionId: string): Promise<ChatMessage[]> {
    return read<ChatMessage>(`${NS}:chatmsgs:${sessionId}`);
  }

  async addMessage(message: ChatMessage): Promise<void> {
    const rows = await this.listMessages(message.sessionId);
    rows.push(message);
    write(`${NS}:chatmsgs:${message.sessionId}`, rows);
  }
}
