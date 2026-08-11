"use client";

/*
 * 건강 기록 탭 — 선택 고양이의 오늘 상태 + 진료 준비 카드(공유) + 증상 기록 목록.
 * 기록 추가를 탭 안에서 바로 할 수 있게 한다(이전엔 우리 아이→상세까지 들어가야 했음).
 */

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { storage, type Cat, type SymptomLog, type WeightLog } from "@/lib/storage";
import { resolveSelectedCat, setSelectedCatId } from "@/lib/selectedCat";
import { loadDaily, type DailyRecord } from "@/lib/dailyStatus";
import { IconRecord, IconTrash } from "@/components/icons";
import { ACCENTS, accentAt, buildAccentMap, type CatAccent } from "@/lib/catColor";
import CatAvatar from "@/components/CatAvatar";
import BottomSheet from "@/components/BottomSheet";
import HealthCard from "@/components/HealthCard";
import { loadHealthNote, buildHealthText } from "@/lib/healthNote";
import { loadNotes, type ImportantNote } from "@/lib/importantNotes";
import { shareNodeAsImage } from "@/lib/shareImage";

function todayLabel(): string {
  const d = new Date();
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, "0")}.${String(d.getDate()).padStart(2, "0")}`;
}

export default function Records() {
  const router = useRouter();
  const [cats, setCats] = useState<Cat[]>([]);
  const [rows, setRows] = useState<{ cat: Cat; log: SymptomLog }[] | null>(null);
  const [today, setToday] = useState<{ cat: Cat; record: DailyRecord } | null>(null);
  const [note, setNote] = useState("");
  /** 선택 고양이의 체중 기록 — 진료 준비 카드의 체중 줄 (P1-4) */
  const [weights, setWeights] = useState<WeightLog[]>([]);
  /** 꼭 기억할 것 카테고리 항목 (P1-5) */
  const [notes, setNotes] = useState<ImportantNote[]>([]);
  /** 등록 순서 기반 고양이별 색 (같은 화면에서 색 중복 없음) */
  const [accents, setAccents] = useState<Record<string, CatAccent>>({});
  const [pickOpen, setPickOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const multi = cats.length > 1;

  async function load() {
    const list = await storage.listCats();
    setCats(list);
    setAccents(buildAccentMap(list));
    const all: { cat: Cat; log: SymptomLog }[] = [];
    for (const cat of list) {
      for (const log of await storage.listSymptoms(cat.id)) all.push({ cat, log });
    }
    all.sort((a, b) => (a.log.occurredAt < b.log.occurredAt ? 1 : -1));
    setRows(all);
    const sel = await resolveSelectedCat();
    setToday(sel ? { cat: sel, record: loadDaily(sel.id) } : null);
    if (sel) {
      setNote(loadHealthNote(sel.id));
      setNotes(loadNotes(sel.id));
      setWeights(await storage.listWeights(sel.id).catch(() => []));
    }
  }

  useEffect(() => {
    void load();
  }, []);

  async function remove(catId: string, id: string) {
    await storage.deleteSymptom(catId, id);
    await load();
  }

  function showToast(m: string) {
    setToast(m);
    window.setTimeout(() => setToast(null), 1800);
  }

  /** 기록 추가 — 1마리면 바로, 여러 마리면 어느 아이인지 먼저 고른다 */
  function addRecord() {
    if (cats.length === 0) return router.push("/profile/new");
    if (cats.length === 1) return router.push(`/cats/${cats[0].id}/log`);
    setPickOpen(true);
  }

  const todayLogs = today ? rows?.filter((r) => r.cat.id === today.cat.id) ?? [] : [];

  async function shareText() {
    if (!today) return;
    const text = buildHealthText(
      today.cat,
      note,
      today.record,
      todayLogs.map((r) => r.log),
      weights,
      notes,
    );
    try {
      if (navigator.share)
        await navigator.share({ title: `${today.cat.name} 진료 준비 카드`, text });
      else {
        await navigator.clipboard.writeText(text);
        showToast("요약을 복사했어요");
      }
    } catch (e) {
      // 사용자 취소는 조용히. 그 외(인앱 브라우저에서 share가 있는데 실패하는 경우)는
      // 복사로 폴백한다 — 아무 일도 안 일어난 것처럼 보이면 버튼이 고장난 걸로 보인다
      if (e instanceof DOMException && e.name === "AbortError") return;
      try {
        await navigator.clipboard.writeText(text);
        showToast("공유 대신 요약을 복사했어요");
      } catch {
        showToast("공유에 실패했어요");
      }
    }
  }

  async function shareImage() {
    const node = cardRef.current;
    if (!node || !today) return;
    setBusy(true);
    const r = await shareNodeAsImage(
      node,
      `${today.cat.name}_진료준비카드.png`,
      `${today.cat.name} 진료 준비 카드`,
    );
    if (r === "downloaded") showToast("이미지를 저장했어요");
    if (r === "failed") showToast("이미지 생성에 실패했어요");
    setBusy(false);
  }

  if (rows === null) return null;

  return (
    <main className="flex flex-1 flex-col gap-3 px-5 pt-8 pb-nav">
      <div className="flex items-center justify-between">
        <h1 className="display text-[22px] text-rd-ink">건강 기록</h1>
        {cats.length > 0 && (
          <button
            onClick={addRecord}
            className="flex min-h-11 items-center gap-1 rounded-[14px] bg-rd-ink px-4 text-[13px] font-bold text-white active:scale-95"
          >
            + 기록 추가
          </button>
        )}
      </div>

      {/* 진료 준비 카드 — 기본 정보·체중·메모·오늘 상태·최근 30일 증상이 이 안에 모두 담긴다 */}
      {today && (
        <section className="space-y-2 pt-1">
          <div className="flex items-center justify-between px-1">
            <p className="text-[16px] font-extrabold tracking-[-0.02em] text-rd-ink">
              진료 준비 카드
            </p>
            <span className="text-[12px] font-semibold text-rd-muted">
              병원 갈 때 이 한 장만
            </span>
          </div>
          <HealthCard
            ref={cardRef}
            cat={today.cat}
            note={note}
            record={today.record}
            logs={todayLogs.map((r) => r.log)}
            weights={weights}
            notes={notes}
            dateStr={todayLabel()}
          />
          <div className="flex gap-2">
            <button
              onClick={() => void shareText()}
              className="h-11 flex-1 rounded-[14px] border border-rd-line bg-white text-sm font-semibold text-rd-ink"
            >
              텍스트 공유
            </button>
            <button
              onClick={() => void shareImage()}
              disabled={busy}
              className="h-11 flex-1 rounded-[14px] bg-rd-ink text-sm font-bold text-white disabled:opacity-60"
            >
              {busy ? "만드는 중…" : "이미지로 저장·공유"}
            </button>
          </div>
        </section>
      )}

      {/* 증상 기록 — 홈 카드 문법: 한 카드 안에 내부 헤더 + 행 목록 */}
      <section className="mt-1 rounded-3xl bg-rd-card p-5">
        <div className="flex items-center justify-between">
          <h2 className="text-[16px] font-extrabold tracking-[-0.02em] text-rd-ink">
            {multi ? "모든 아이의 증상 기록" : "증상 기록"}
          </h2>
          {rows.length > 0 && (
            <span className="text-[12px] font-semibold text-rd-muted">
              {rows.length}건
            </span>
          )}
        </div>

        {rows.length === 0 ? (
          <div className="py-4 text-center">
            <IconRecord size={40} className="mx-auto text-rd-faint" />
            <p className="mt-2 font-bold text-rd-ink">아직 기록이 없어요</p>
            <p className="mt-1 text-sm text-rd-body">
              챗봇 대화나 증상 기록이 여기에 모여요.
            </p>
            {cats.length > 0 && (
              <button
                onClick={addRecord}
                className="mt-4 h-12 w-full rounded-[14px] bg-rd-ink text-[15px] font-bold text-white active:scale-[0.99]"
              >
                + 첫 기록 남기기
              </button>
            )}
          </div>
        ) : (
          <ul className="mt-1.5 divide-y divide-rd-line-soft">
            {rows.map(({ cat, log }) => {
              const accent = accents[cat.id] ?? ACCENTS[0];
              return (
                <li key={log.id} className="py-3.5 first:pt-2 last:pb-0">
                  <div className="flex items-center justify-between gap-2">
                    <span className="flex min-w-0 items-center gap-2">
                      <CatAvatar cat={cat} size={26} radius={9} />
                      <span
                        className={`truncate rounded-full px-2 py-0.5 text-[12px] font-bold ${accent.soft} ${accent.text}`}
                      >
                        {cat.name}
                      </span>
                    </span>
                    <div className="flex flex-none items-center gap-1">
                      <span className="text-[11px] text-rd-muted">
                        {log.occurredAt.slice(0, 10).replace(/-/g, ".")}
                      </span>
                      <button
                        onClick={() => void remove(cat.id, log.id)}
                        aria-label={`${cat.name}의 ${log.occurredAt.slice(0, 10)} 기록 삭제`}
                        className="-my-2.5 -mr-2.5 flex size-11 items-center justify-center rounded-full text-rd-muted active:bg-rd-page"
                      >
                        <IconTrash size={15} />
                      </button>
                    </div>
                  </div>
                  <p className="mt-2 flex flex-wrap gap-1">
                    {log.tags.map((t) => (
                      <span
                        key={t}
                        className="rounded-full bg-rd-mint-soft px-2 py-0.5 text-[11px] font-semibold text-rd-forest"
                      >
                        #{t}
                      </span>
                    ))}
                  </p>
                  <p className="mt-1 text-[13px] text-rd-body">{log.summary}</p>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {/* 어느 아이 기록인지 선택 (다묘) */}
      <BottomSheet
        open={pickOpen}
        onClose={() => setPickOpen(false)}
        title="어느 아이의 기록인가요?"
      >
        <div className="space-y-2">
          {cats.map((c, i) => (
            <button
              key={c.id}
              onClick={() => {
                setSelectedCatId(c.id); // 이후 화면도 이 아이 기준으로
                setPickOpen(false);
                router.push(`/cats/${c.id}/log`);
              }}
              className="flex w-full items-center gap-3 rounded-3xl bg-rd-card p-3 text-left"
            >
              <CatAvatar cat={c} size={44} radius={14} accent={accentAt(i)} />
              <span className="min-w-0 flex-1">
                <span className="block truncate font-bold text-rd-ink">{c.name}</span>
                <span className="block truncate text-[12px] text-rd-muted">
                  {c.breedGroup}
                </span>
              </span>
              <span className="flex-none text-rd-faint">›</span>
            </button>
          ))}
        </div>
      </BottomSheet>

      {toast && (
        <div
          role="status"
          className="fixed bottom-24 left-1/2 z-[60] -translate-x-1/2 rounded-full bg-rd-ink px-4 py-2.5 text-[13px] font-semibold text-white [animation:toast-in_.2s_ease]"
        >
          {toast}
        </div>
      )}
    </main>
  );
}
