"use client";

/* 홈 — 등록된 고양이 목록 + 첫 등록 CTA (챗봇 중심 홈 F-03'은 M2에서 완성) */

import Link from "next/link";
import { useEffect, useState } from "react";
import { storage, type Cat } from "@/lib/storage";
import DailyCheck from "@/components/DailyCheck";
import { supabase } from "@/lib/supabase";

export default function Home() {
  const [cats, setCats] = useState<Cat[] | null>(null);
  const [linked, setLinked] = useState(false); // 카카오 연결된 계정 여부
  const [diag, setDiag] = useState(""); // 로그인 진단(임시)

  useEffect(() => {
    void storage.listCats().then(setCats);
    const check = (user: { is_anonymous?: boolean } | null | undefined) =>
      setLinked(!!user && user.is_anonymous === false);

    // ── 로그인 진단(임시): URL 에러 + 세션 상태 표시 ──
    const hash = new URLSearchParams(window.location.hash.replace(/^#/, ""));
    const qs = new URLSearchParams(window.location.search);
    const err =
      hash.get("error_description") ||
      hash.get("error") ||
      qs.get("error_description") ||
      qs.get("error") ||
      (qs.get("code") ? "code=있음(교환대기)" : "");

    void supabase.auth.getUser().then(({ data }) => {
      check(data.user);
      const u = data.user;
      setDiag(
        `세션:${u ? "있음" : "없음"} / 익명:${u?.is_anonymous ?? "-"} / ` +
          `provider:${u?.app_metadata?.provider ?? "-"} / URL에러:${err || "없음"}`,
      );
    });
    const { data: sub } = supabase.auth.onAuthStateChange((e, session) => {
      check(session?.user);
      void storage.listCats().then(setCats);
      const u = session?.user;
      setDiag(
        `[${e}] 세션:${u ? "있음" : "없음"} / 익명:${u?.is_anonymous ?? "-"} / ` +
          `provider:${u?.app_metadata?.provider ?? "-"} / URL에러:${err || "없음"}`,
      );
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  return (
    <main className="flex flex-1 flex-col px-5 py-10">
      {diag && (
        <div className="mb-3 rounded-md border border-hairline bg-surface-soft p-2.5 text-[11px] break-all text-body">
          🔎 로그인 진단: {diag}
        </div>
      )}
      <header className="mb-8">
        <div className="flex items-center justify-between">
          <p className="text-[12px] font-semibold uppercase tracking-[1.5px] text-muted">
            Jjinjipsa
          </p>
          {linked ? (
            <button
              onClick={() => void supabase.auth.signOut()}
              className="text-[12px] font-medium text-muted underline"
            >
              로그아웃
            </button>
          ) : (
            <Link href="/login" className="text-[12px] font-medium text-muted underline">
              카카오로 로그인
            </Link>
          )}
        </div>
        <h1 className="display mt-2 text-[28px] text-ink">
          갑자기 시작된 인연도,
          <br />
          오래도록 걱정 없이.
        </h1>
        <p className="mt-2 text-sm text-body">
          내 고양이를 기억하는 건강 챗봇, 찐집사
        </p>
      </header>

      {cats === null ? null : cats.length === 0 ? (
        <div className="rounded-xl bg-brand-peach p-6">
          <p className="text-[12px] font-semibold uppercase tracking-[1.5px] text-ink/60">
            시작하기
          </p>
          <p className="mt-1 text-lg font-semibold text-ink">
            아직 등록된 아이가 없어요
          </p>
          <p className="mt-1 text-sm text-ink/70">
            1분이면 끝나요. 프로필을 등록하면 나이 환산부터 바로 보여드려요.
          </p>
          <Link
            href="/profile/new"
            className="mt-4 flex h-11 items-center justify-center rounded-md bg-canvas text-sm font-semibold text-ink"
          >
            우리 아이 등록하기 🐾
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {/* 오늘의 체크 — 첫째 아이 기준 (다묘 회전은 추후) */}
          <DailyCheck cat={cats[0]} />
          {cats.map((cat) => (
            <Link
              key={cat.id}
              href={`/cats/${cat.id}`}
              className="flex items-center gap-3.5 rounded-lg border border-hairline bg-canvas p-4"
            >
              {cat.photo ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={cat.photo}
                  alt=""
                  className="size-[52px] flex-none rounded-[14px] object-cover"
                />
              ) : (
                <span className="flex size-[52px] flex-none items-center justify-center rounded-[14px] bg-surface-card text-2xl">
                  🐈
                </span>
              )}
              <div>
                <p className="text-base font-semibold text-ink">{cat.name}</p>
                <p className="mt-0.5 text-xs text-muted">
                  {cat.breedGroup}
                  {cat.weightKg ? ` · ${cat.weightKg}kg` : ""}
                  {cat.conditions.length > 0
                    ? ` · ${cat.conditions.join(", ")}`
                    : ""}
                </p>
              </div>
            </Link>
          ))}
          <Link
            href="/profile/new"
            className="flex h-11 items-center justify-center rounded-md border border-hairline bg-canvas text-sm font-semibold text-body"
          >
            + 다른 아이 등록
          </Link>
        </div>
      )}

      <p className="mt-auto pt-10 text-center text-xs text-muted-soft">
        이 정보는 참고용이며, 정확한 진단은 수의사 상담이 필요합니다.
      </p>
    </main>
  );
}
