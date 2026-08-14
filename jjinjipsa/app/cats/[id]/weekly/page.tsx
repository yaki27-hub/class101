"use client";

/*
 * 주간 리포트 (지시서 P1-1) — 이번 주 기록을 돌려주는 화면.
 *
 * 새로 입력받는 것이 하나도 없다. P0가 쌓은 기록만 재가공한다.
 * 숫자를 쓸 때 분모는 항상 "기록한 날"이다 — 7일이 아니다 (lib/weeklyReport 주석).
 */

import { useParams } from "next/navigation";
import Link from "next/link";
import { useEffect, useState } from "react";
import { storage, type Cat } from "@/lib/storage";
import { buildWeeklyReport, type WeeklyReport } from "@/lib/weeklyReport";
import BackButton from "@/components/BackButton";
import Mascot from "@/components/Mascot";
import { track } from "@/lib/analytics";

export default function WeeklyPage() {
  const { id } = useParams<{ id: string }>();
  const [cat, setCat] = useState<Cat | null | undefined>(undefined);
  const [report, setReport] = useState<WeeklyReport | null>(null);

  useEffect(() => {
    void (async () => {
      const c = await storage.getCat(id);
      setCat(c);
      if (!c) return;
      const [symptoms, weights] = await Promise.all([
        storage.listSymptoms(id).catch(() => []),
        storage.listWeights(id).catch(() => []),
      ]);
      const r = buildWeeklyReport({ catId: id, catName: c.name, symptoms, weights });
      setReport(r);
      // 조회율 지표 (0008) — 몇 일치 기록을 들고 열었는지까지 봐야 "빈 리포트를
      // 열게 하고 있지는 않은가"를 확인할 수 있다
      track("weekly_report_viewed", { days: r.recordedDays });
    })();
  }, [id]);

  if (cat === undefined) return null;
  if (cat === null)
    return (
      <main className="flex flex-1 items-center justify-center px-6 pb-nav">
        <p className="text-sm text-rd-body">등록된 아이를 찾을 수 없어요.</p>
      </main>
    );
  if (!report) return null;

  return (
    <main className="flex-1 space-y-3 px-4 pt-3 pb-nav">
      <header className="flex items-center gap-2 px-1">
        <BackButton fallback="/" icon="chevron" className="!min-w-9 !px-0 text-rd-ink" />
        <div className="min-w-0 flex-1">
          <h1 className="display text-[20px] text-rd-ink">
            {cat.name}의 이번 주
          </h1>
          <p className="text-[12px] font-semibold text-rd-muted tabular-nums">
            {report.range} · {report.recordedDays}일 기록
          </p>
        </div>
      </header>

      {/* 냥박사 한마디 — 이 화면에서 유일한 짙은 카드 */}
      <section className="rounded-3xl bg-rd-forest p-5 text-white">
        <p className="mb-2 text-[12px] font-semibold text-white/60">냥박사 한마디</p>
        <p className="text-[15px] leading-[1.65] font-medium tracking-[-0.01em] text-pretty">
          {report.comment}
        </p>
      </section>

      {report.recordedDays === 0 ? (
        <section className="rounded-3xl bg-rd-card p-8 text-center">
          <Mascot mood="empty" size={84} className="mx-auto" />
          <p className="mt-2 font-bold text-rd-ink">이번 주 기록이 없어요</p>
          <p className="mt-1 text-[13px] leading-relaxed text-rd-body">
            홈에서 오늘 상태를 한 번만 남겨도
            <br />
            다음 주에는 비교할 거리가 생겨요.
          </p>
          <Link
            href="/"
            className="mt-4 flex h-12 items-center justify-center rounded-[14px] bg-rd-ink text-[15px] font-bold text-white"
          >
            오늘 상태 기록하러 가기
          </Link>
        </section>
      ) : (
        <>
          {/* 오늘냥 4항목 — "평소 수준 n/기록일" */}
          <section className="rounded-3xl bg-rd-card p-5">
            <h2 className="text-[16px] font-extrabold tracking-[-0.02em] text-rd-ink">
              오늘 상태
            </h2>
            <ul className="mt-1.5 divide-y divide-rd-line-soft">
              {report.items.map((it) => (
                <li key={it.key} className="flex items-center gap-3 py-3">
                  <span className="w-14 flex-none text-[13.5px] font-bold text-rd-ink">
                    {it.label}
                  </span>
                  {it.recordedDays === 0 ? (
                    <span className="flex-1 text-[13px] text-rd-faint">
                      이번 주 기록 없음
                    </span>
                  ) : (
                    <>
                      <span className="flex-1 text-[13px] text-rd-body">
                        평소 수준{" "}
                        <b className="text-rd-ink tabular-nums">
                          {it.normalDays}/{it.recordedDays}일
                        </b>
                      </span>
                      {it.offDays > 0 && (
                        <span className="flex-none rounded-full bg-[#FFF9E8] px-2 py-0.5 text-[11.5px] font-bold text-[#8A6A10] tabular-nums">
                          다름 {it.offDays}일
                        </span>
                      )}
                    </>
                  )}
                </li>
              ))}
            </ul>
            <p className="mt-1 text-[11.5px] leading-relaxed text-rd-faint">
              기록하지 않은 날은 세지 않아요. 분모는 그 항목을 기록한 날이에요.
            </p>
          </section>

          {/* 증상 · 케어 · 체중 */}
          <section className="rounded-3xl bg-rd-card p-5">
            <h2 className="text-[16px] font-extrabold tracking-[-0.02em] text-rd-ink">
              증상 · 케어
            </h2>

            <p className="mt-3 text-[13px] font-bold text-rd-ink">증상 기록</p>
            {report.symptoms.length === 0 ? (
              <p className="mt-1 text-[13px] text-rd-muted">
                이번 주에 남긴 증상 기록은 없어요.
              </p>
            ) : (
              <p className="mt-1.5 flex flex-wrap gap-1.5">
                {report.symptoms.map((s) => (
                  <span
                    key={s.tag}
                    className="rounded-full bg-rd-mint-soft px-2.5 py-1 text-[12px] font-semibold text-rd-forest tabular-nums"
                  >
                    #{s.tag} {s.count}회
                  </span>
                ))}
              </p>
            )}

            <p className="mt-4 text-[13px] font-bold text-rd-ink">케어 루틴</p>
            <ul className="mt-1.5 flex flex-wrap gap-x-4 gap-y-1.5">
              {report.care.map((c) => (
                <li key={c.label} className="text-[13px] text-rd-body">
                  <span aria-hidden>{c.glyph}</span> {c.label}{" "}
                  <b className="text-rd-ink tabular-nums">{c.days}일</b>
                </li>
              ))}
            </ul>

            <p className="mt-4 text-[13px] font-bold text-rd-ink">체중</p>
            <p className="mt-1 text-[13px] text-rd-body tabular-nums">
              {report.weight ? (
                <>
                  {report.weight.latest.weightKg}kg
                  <span className="text-rd-muted">
                    {" "}
                    ({report.weight.latest.measuredAt.slice(5).replace("-", "/")} 기준)
                  </span>
                </>
              ) : (
                <span className="text-rd-muted">이번 주 측정 기록이 없어요</span>
              )}
            </p>
          </section>
        </>
      )}

      <p className="px-1 text-center text-[11.5px] leading-relaxed text-rd-faint">
        이 리포트는 남긴 기록을 모아 보여줄 뿐이며, 건강 상태를 판정하지 않아요.
      </p>
    </main>
  );
}
