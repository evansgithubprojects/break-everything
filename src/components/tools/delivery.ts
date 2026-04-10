import type { Tool } from "@/types";

export type ToolAction =
  | { type: "redirect"; href: string; label: string }
  | { type: "embed"; href: string; label: string }
  | { type: "runtime"; href: string; label: string }
  | { type: "download"; href: string; label: string }
  | { type: "none"; href: ""; label: string };

export function resolvePrimaryAction(tool: Tool): ToolAction {
  if (tool.web_url) {
    return { type: "redirect", href: tool.web_url, label: "Open in Browser" };
  }
  if (tool.embed_allowed && (tool.embed_url || tool.web_url)) {
    return { type: "embed", href: `/tools/${tool.slug}/embed`, label: "Open Here" };
  }
  if (tool.runtime_supported) {
    return { type: "runtime", href: `/tools/${tool.slug}/run`, label: "Run in Browser (beta)" };
  }
  if (tool.download_url) {
    return { type: "download", href: tool.download_url, label: "Download (fallback)" };
  }
  return { type: "none", href: "", label: "View source" };
}
