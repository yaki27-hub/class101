"use client";

/* 계정 설정 (D-10) — 로그인 상태·로그아웃·계정 탈퇴·문의/면책/버전 */

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { storage } from "@/lib/storage";
import { supabase } from "@/lib/supabase";

const APP_VERSION = "v1.0 (오픈 테스트)";
const CONTACT_EMAIL = "yaki27@gmail.com";

type AuthState = {
  linked: boolean; // 카카오 등으로 연결된 정식 계정
  nick: string;
  email: string | null;
};

export default function AccountPage() {
  const router = useRouter();
  const [auth, setAuth] = useState<AuthState | null>(null);
  const [confirmDel, setConfirmDel] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    void supabase.auth.getUser().then(({ data }) => {
      const u = data.user;
      const linked = !!u && u.is_anonymous === false;
      const nick =
        ((u?.user_metadata?.name || u?.user_metadata?.full_name) as string) || "집사";
      setAuth({ linked, nick, email: u?.email ?? null });
    });
  }, []);

  async function logout() {
    setBusy(true);
    await supabase.auth.signOut();
    router.replace("/login");
  }

  /** 계정 탈퇴 — 모든 고양이·기록 삭제 후 로그아웃 */
  async function deleteAccount() {
    setBusy(true);
    try {
      const cats = await storage.listCats();
      for (const c of cats) await storage.deleteCat(c.id); // 동기화 행까지 삭제
      // 로컬 전용 키(오늘 케어·선택·습관 체크 등) 정리
      if (typeof window !== "undefined") {
        for (const k of Object.keys(localStorage)) {
          if (k.startsWith("jjinjipsa:")) localStorage.removeItem(k);
        }
      }
      await supabase.auth.signOut();
    } finally {
      router.replace("/login");
    }
  }

  if (auth === null) return null;

  return (
    <main className="flex flex-1 flex-col gap-4 px-5 pt-8 pb-24">
      <header className="flex items-center gap-2">
        <Link href="/cats" className="text-lg text-muted">
          ←
        </Link>
        <h1 className="display text-[22px] text-secondary">계정 설정</h1>
      </header>

      {/* 로그인 상태 */}
      <section className="rounded-card bg-white p-5 shadow-[0_2px_16px_rgba(122,92,67,0.06)]">
        <p className="text-sm font-bold text-secondary">로그인 상태</p>
        {auth.linked ? (
          <div className="mt-3 flex items-center gap-3">
            <span className="flex size-11 items-center justify-center rounded-full bg-primary/15 text-xl">
              🐱
            </span>
            <div className="min-w-0">
              <p className="font-bold text-secondary">{auth.nick}님</p>
              <p className="truncate text-[12px] text-muted">
                {auth.email ?? "카카오 계정 연결됨"}
              </p>
            </div>
            <span className="ml-auto rounded-full bg-mint/60 px-2.5 py-1 text-[11px] font-semibold text-secondary">
              카카오 연결됨
            </span>
          </div>
        ) : (
          <div className="mt-3">
            <p className="text-[13px] text-body">
              지금은 <b className="text-secondary">게스트</b>로 이용 중이에요.
              기록이 이 기기에만 저장돼요.
            </p>
            <Link
              href="/login"
              className="mt-3 flex h-11 items-center justify-center rounded-button bg-[#FEE500] text-sm font-bold text-[#3A1D1D]"
            >
              카카오로 로그인하고 기록 지키기
            </Link>
          </div>
        )}
      </section>

      {/* 로그아웃 (연결된 계정만) */}
      {auth.linked && (
        <button
          onClick={() => void logout()}
          disabled={busy}
          className="rounded-card bg-white py-4 text-sm font-semibold text-secondary shadow-[0_2px_16px_rgba(122,92,67,0.06)] disabled:opacity-60"
        >
          로그아웃
        </button>
      )}

      {/* 문의 · 면책 · 버전 */}
      <section className="rounded-card bg-white shadow-[0_2px_16px_rgba(122,92,67,0.06)]">
        <a
          href={`mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent("[찐집사] 문의")}`}
          className="flex items-center justify-between border-b border-hairline px-5 py-4 text-sm text-secondary"
        >
          <span>문의하기</span>
          <span className="text-[12px] text-muted">{CONTACT_EMAIL} ›</span>
        </a>
        <div className="border-b border-hairline px-5 py-4">
          <p className="text-[13px] leading-relaxed text-muted">
            이 앱의 건강 정보는 참고용이며, 정확한 진단은 수의사 상담이 필요합니다.
          </p>
        </div>
        <div className="flex items-center justify-between px-5 py-4 text-sm text-secondary">
          <span>버전</span>
          <span className="text-[12px] text-muted">{APP_VERSION}</span>
        </div>
      </section>

      {/* 계정 탈퇴 */}
      <button
        onClick={() => setConfirmDel(true)}
        disabled={busy}
        className="mt-2 text-center text-[13px] font-semibold text-error underline disabled:opacity-60"
      >
        계정 탈퇴
      </button>

      <p className="text-center text-[11px] text-muted-soft">
        찐집사 · 내 고양이를 기억하는 건강 챗봇
      </p>

      {/* 탈퇴 확인 */}
      {confirmDel && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-secondary/40 px-6">
          <div className="w-full max-w-[340px] rounded-card bg-white p-6">
            <p className="text-lg font-bold text-secondary">정말 탈퇴할까요?</p>
            <p className="mt-2 text-sm leading-relaxed text-body">
              등록한 <b>모든 고양이·사진·증상 기록·대화</b>가 지워지고
              되돌릴 수 없어요.
            </p>
            <div className="mt-4 flex gap-2">
              <button
                onClick={() => setConfirmDel(false)}
                disabled={busy}
                className="h-11 flex-1 rounded-button border border-hairline text-sm font-semibold text-body"
              >
                취소
              </button>
              <button
                onClick={() => void deleteAccount()}
                disabled={busy}
                className="h-11 flex-1 rounded-button bg-error text-sm font-bold text-white disabled:opacity-60"
              >
                {busy ? "처리 중…" : "탈퇴하기"}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
