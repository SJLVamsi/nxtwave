/**
 * WS4 — story-image saving that survives in-app browsers (mobile/perf H1).
 *
 * WhatsApp/Instagram in-app browsers ignore the anchor `download` attribute, so
 * try the Web Share API with the fetched PNG first (iOS/Android share sheets),
 * fall back to a programmatic anchor download, and finally open the image in a
 * new tab where the visible "long-press to save" hint applies.
 *
 * DOM-only helper, kept out of `share.ts` because that module is also imported
 * by the Workers Vitest pool (no DOM lib there).
 */
import { storyImagePath } from "./share";

export type StorySaveResult = "shared" | "cancelled" | "downloaded" | "opened";

export async function saveStoryImage(code: string, filename: string): Promise<StorySaveResult> {
  const path = storyImagePath(code);
  let blob: Blob | null = null;

  if (typeof navigator !== "undefined" && typeof navigator.canShare === "function") {
    try {
      const response = await fetch(path);
      if (response.ok) blob = await response.blob();
    } catch {
      blob = null;
    }
    if (blob) {
      const file = new File([blob], filename, { type: blob.type || "image/png" });
      if (navigator.canShare({ files: [file] })) {
        try {
          await navigator.share({ files: [file], title: "Ship60 story image" });
          return "shared";
        } catch (error) {
          if (error instanceof DOMException && error.name === "AbortError") return "cancelled";
          // Share sheet refused the file — fall through to the download path.
        }
      }
    }
  }

  const supportsDownload = typeof document !== "undefined" && "download" in document.createElement("a");
  if (!supportsDownload && !blob) {
    window.open(path, "_blank", "noopener,noreferrer");
    return "opened";
  }

  const href = blob ? URL.createObjectURL(blob) : path;
  const anchor = document.createElement("a");
  anchor.href = href;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  if (blob) window.setTimeout(() => URL.revokeObjectURL(href), 60_000);
  return "downloaded";
}
