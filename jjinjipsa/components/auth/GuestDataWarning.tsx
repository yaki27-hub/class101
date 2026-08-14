"use client";

/*
 * 게스트 기록 유실 경고 — 카카오 승격이 불가능할 때 **묻고 나서** 넘어간다.
 *
 * 이 카카오 계정이 이미 다른 계정에 붙어 있으면 승격(linkIdentity)이 안 되고,
 * 로그인하면 그 계정으로 들어가면서 지금 기기의 게스트 기록은 주인 없이 남는다.
 * 예전에는 이 갈아타기가 조용히 일어나서, 집사 눈에는 "로그인했더니 기록이 사라졌다"로만
 * 보였다. 유실 자체를 막지는 못하더라도 **모르는 채 잃는 일**은 없애는 것이 이 화면의 몫이다.
 *
 * 그래서 카피에서 지키는 두 가지:
 *  - 무엇을 잃는지 숫자로 말한다 ("아이 2마리의 기록")
 *  - 할 수 없는 것을 할 수 있는 척하지 않는다 (합치기 기능은 없다고 밝힌다)
 */

export default function GuestDataWarning({
  guestCats,
  busy,
  onProceed,
  onCancel,
}: {
  guestCats: number;
  busy?: boolean;
  onProceed: () => void;
  onCancel: () => void;
}) {
  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/40 px-6">
      <div
        role="alertdialog"
        aria-labelledby="guest-warn-title"
        className="w-full max-w-[340px] rounded-3xl bg-white p-6"
      >
        <p id="guest-warn-title" className="text-lg font-bold text-rd-ink">
          이 카카오 계정에는 이미 기록이 있어요
        </p>
        <p className="mt-2 text-sm leading-relaxed text-rd-body">
          이 기기에는 게스트로 등록한{" "}
          <b className="text-rd-ink">아이 {guestCats}마리의 기록</b>이 있어요.
          그런데 이 카카오 계정은 다른 계정에 연결돼 있어서, 로그인하면 그 계정의
          기록으로 바뀌고 <b className="text-rd-ink">이 기기의 기록은 함께 가지 않아요.</b>
        </p>
        <p className="mt-2 text-[12.5px] leading-relaxed text-rd-muted">
          지금은 두 계정의 기록을 합칠 수 없어요. 이 기기의 기록을 계속 쓰시려면
          게스트로 남아 있는 편이 안전해요.
        </p>
        <div className="mt-4 flex flex-col gap-2">
          <button
            type="button"
            onClick={onCancel}
            disabled={busy}
            className="h-12 w-full rounded-[14px] bg-rd-ink text-sm font-bold text-white disabled:opacity-60"
          >
            게스트로 계속 쓰기
          </button>
          <button
            type="button"
            onClick={onProceed}
            disabled={busy}
            className="h-11 w-full rounded-[14px] border border-rd-line text-sm font-semibold text-rd-body disabled:opacity-60"
          >
            {busy ? "이동 중…" : "그래도 기존 계정으로 로그인"}
          </button>
        </div>
      </div>
    </div>
  );
}
