/*
 * SupabaseStorageAdapter (T-16) — StorageAdapter를 Supabase로 구현.
 * 익명 로그인(D-09)으로 확보한 auth.uid()가 owner_id/user_id로 쓰여 RLS를 통과한다.
 * 컬럼은 snake_case → 앱 타입(camelCase)으로 매핑.
 */

import { supabase } from "@/lib/supabase";
import type { StorageAdapter } from "./adapter";
import type {
  Cat,
  ChatMessage,
  ChatSession,
  Gender,
  SymptomLog,
  TraitAnswer,
} from "./types";

async function uid(): Promise<string> {
  const { data } = await supabase.auth.getUser();
  if (!data.user) throw new Error("no-auth");
  return data.user.id;
}

/* ---- 매핑 ---- */
type CatRow = {
  id: string; owner_id: string; household_id: string | null; name: string;
  birth_date: string; birth_estimated: boolean; gender: string; neutered: boolean;
  breed_group: string; weight_kg: number | null; conditions: string[]; indoor: boolean;
  avatar: Cat["avatar"]; photo: string | null; illust: string | null;
  created_at: string; updated_at: string;
};
function toCat(r: CatRow): Cat {
  return {
    id: r.id, name: r.name, birthDate: r.birth_date, birthEstimated: r.birth_estimated,
    gender: r.gender as Gender, neutered: r.neutered, breedGroup: r.breed_group,
    weightKg: r.weight_kg, conditions: r.conditions ?? [], indoor: r.indoor,
    avatar: r.avatar ?? null, photo: r.photo, illust: r.illust,
    createdAt: r.created_at, updatedAt: r.updated_at,
  };
}

export class SupabaseStorageAdapter implements StorageAdapter {
  async listCats(): Promise<Cat[]> {
    const { data, error } = await supabase
      .from("cats").select("*").order("created_at", { ascending: true });
    if (error) throw error;
    return (data as CatRow[]).map(toCat);
  }

  async getCat(id: string): Promise<Cat | null> {
    const { data } = await supabase.from("cats").select("*").eq("id", id).maybeSingle();
    return data ? toCat(data as CatRow) : null;
  }

  async saveCat(cat: Cat): Promise<void> {
    const owner_id = await uid();
    const row = {
      id: cat.id, owner_id, name: cat.name, birth_date: cat.birthDate,
      birth_estimated: cat.birthEstimated, gender: cat.gender, neutered: cat.neutered,
      breed_group: cat.breedGroup, weight_kg: cat.weightKg, conditions: cat.conditions,
      indoor: cat.indoor, avatar: cat.avatar, photo: cat.photo, illust: cat.illust,
      updated_at: new Date().toISOString(),
    };
    const { error } = await supabase.from("cats").upsert(row);
    if (error) throw error;
  }

  async deleteCat(id: string): Promise<void> {
    // 자식 행은 FK on delete cascade로 함께 삭제됨
    const { error } = await supabase.from("cats").delete().eq("id", id);
    if (error) throw error;
  }

  async listTraits(catId: string): Promise<TraitAnswer[]> {
    const { data, error } = await supabase
      .from("trait_answers").select("*").eq("cat_id", catId).order("answered_on");
    if (error) throw error;
    return (data ?? []).map((r) => ({
      id: r.id, catId: r.cat_id, questionKey: r.question_key,
      answer: r.answer, answeredOn: r.answered_on, createdAt: r.created_at,
    }));
  }

  async addTrait(a: TraitAnswer): Promise<void> {
    const { error } = await supabase.from("trait_answers").insert({
      id: a.id, cat_id: a.catId, question_key: a.questionKey,
      answer: a.answer, answered_on: a.answeredOn,
    });
    if (error) throw error;
  }

  async listSymptoms(catId: string): Promise<SymptomLog[]> {
    const { data, error } = await supabase
      .from("symptom_logs").select("*").eq("cat_id", catId).order("occurred_at");
    if (error) throw error;
    return (data ?? []).map((r) => ({
      id: r.id, catId: r.cat_id, tags: r.tags ?? [], summary: r.summary,
      source: r.source, chatSessionId: r.chat_session_id,
      occurredAt: r.occurred_at, createdAt: r.created_at,
    }));
  }

  async addSymptom(s: SymptomLog): Promise<void> {
    const { error } = await supabase.from("symptom_logs").insert({
      id: s.id, cat_id: s.catId, tags: s.tags, summary: s.summary,
      source: s.source, chat_session_id: s.chatSessionId, occurred_at: s.occurredAt,
    });
    if (error) throw error;
  }

  async deleteSymptom(_catId: string, id: string): Promise<void> {
    const { error } = await supabase.from("symptom_logs").delete().eq("id", id);
    if (error) throw error;
  }

  async listSessions(catId: string): Promise<ChatSession[]> {
    const { data, error } = await supabase
      .from("chat_sessions").select("*").eq("cat_id", catId).order("started_at");
    if (error) throw error;
    return (data ?? []).map((r) => ({
      id: r.id, catId: r.cat_id, title: r.title, startedAt: r.started_at,
    }));
  }

  async createSession(s: ChatSession): Promise<void> {
    const user_id = await uid();
    const { error } = await supabase.from("chat_sessions").insert({
      id: s.id, cat_id: s.catId, user_id, title: s.title, started_at: s.startedAt,
    });
    if (error) throw error;
  }

  async listMessages(sessionId: string): Promise<ChatMessage[]> {
    const { data, error } = await supabase
      .from("chat_messages").select("*").eq("session_id", sessionId).order("created_at");
    if (error) throw error;
    return (data ?? []).map((r) => ({
      id: r.id, sessionId: r.session_id, role: r.role, content: r.content,
      imageUrl: r.image_url, model: r.model, createdAt: r.created_at,
    }));
  }

  async addMessage(m: ChatMessage): Promise<void> {
    const { error } = await supabase.from("chat_messages").insert({
      id: m.id, session_id: m.sessionId, role: m.role, content: m.content,
      image_url: m.imageUrl, model: m.model,
    });
    if (error) throw error;
  }
}
