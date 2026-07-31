/*
 * 카드 한 장을 이미지로 뽑아 공유·저장한다 (건강 카드 · 생활기록부 공용).
 *
 * 공유 시트를 지원하면 시트로, 아니면 파일로 내려받는다.
 * 사용자가 시트를 닫은 것(AbortError)은 실패가 아니다 — 취소에 대고
 * "실패했어요"를 띄우면 안 한 일을 잘못한 것처럼 알리는 셈이다.
 */

export type ShareResult = "shared" | "downloaded" | "canceled" | "failed";

function dataURLToFile(dataUrl: string, filename: string): File {
  const [head, b64] = dataUrl.split(",");
  const mime = /:(.*?);/.exec(head)?.[1] ?? "image/png";
  const bin = atob(b64);
  const arr = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
  return new File([arr], filename, { type: mime });
}

export async function shareNodeAsImage(
  node: HTMLElement,
  filename: string,
  title: string,
): Promise<ShareResult> {
  let dataUrl: string;
  try {
    const { toPng } = await import("html-to-image");
    dataUrl = await toPng(node, {
      pixelRatio: 2,
      backgroundColor: "#ffffff",
      cacheBust: true,
    });
  } catch {
    return "failed";
  }

  const file = dataURLToFile(dataUrl, filename);
  if (navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title });
      return "shared";
    } catch (e) {
      // 시트를 닫은 것은 취소지 실패가 아니다
      if (e instanceof DOMException && e.name === "AbortError") return "canceled";
      return "failed";
    }
  }

  try {
    const a = document.createElement("a");
    a.href = dataUrl;
    a.download = filename;
    a.click();
    return "downloaded";
  } catch {
    return "failed";
  }
}
