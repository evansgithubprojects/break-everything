import type { Tool } from "@/types";
import { getPublicSiteOrigin, toolSupportsInAppRuntime } from "@/lib/first-party-inapp";

function isSafeHttpUrl(raw: string): boolean {
  const s = raw.trim();
  if (!s) return false;
  try {
    const u = new URL(s);
    if (u.protocol !== "http:" && u.protocol !== "https:") return false;
    return Boolean(u.hostname);
  } catch {
    return false;
  }
}

function isExternalWebUrl(webUrl: string, baseOrigin: string): boolean {
  const w = webUrl.trim();
  if (!w) return false;
  if (!isSafeHttpUrl(w)) return false;
  if (!baseOrigin.trim()) return true;
  try {
    return new URL(w).origin !== new URL(baseOrigin).origin;
  } catch {
    return true;
  }
}

/** Valid App Store / Play Store links for off-site buttons (client-safe). */
export function resolveMobileStoreLinks(tool: Tool): { apple?: string; play?: string } {
  const out: { apple?: string; play?: string } = {};
  const apple = (tool.app_store_url ?? "").trim();
  const play = (tool.play_store_url ?? "").trim();
  if (isSafeHttpUrl(apple)) out.apple = apple;
  if (isSafeHttpUrl(play)) out.play = play;
  return out;
}

export type ToolAction =
  | { type: "redirect"; href: string; label: string }
  | { type: "runtime"; href: string; label: string }
  | { type: "download"; href: string; label: string }
  | { type: "none"; href: ""; label: string };

export function resolvePrimaryAction(tool: Tool): ToolAction {
  const baseOrigin = getPublicSiteOrigin();
  const web = String(tool.web_url ?? "").trim();

  if (web && isExternalWebUrl(web, baseOrigin)) {
    return { type: "redirect", href: web, label: "Open in Browser" };
  }
  if (toolSupportsInAppRuntime(tool)) {
    return { type: "runtime", href: `/tools/${tool.slug}/run`, label: "Try in your browser" };
  }
  if (web) {
    return { type: "redirect", href: web, label: "Open in Browser" };
  }
  if (tool.download_url) {
    return { type: "download", href: tool.download_url, label: "Download to install" };
  }
  return { type: "none", href: "", label: "Project page" };
}
