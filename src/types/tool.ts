import type { RuntimeManifest } from "./runtime";

export type ToolKind = "download" | "web";
export type ToolDeliveryMode = "redirect" | "browserRuntime" | "download";
export type ToolSandboxLevel = "strict" | "standard" | "trusted";
export type ToolDataHandling = "low" | "medium" | "high";

export interface Tool {
  id: number;
  name: string;
  slug: string;
  description: string;
  short_description: string;
  /** Primary category kept for legacy compatibility. */
  category: string;
  /** Normalized list of categories (canonical field). */
  categories: string[];
  icon: string;
  /** download = release or install URL when not primarily web; web = in-browser app URL */
  tool_kind: ToolKind;
  delivery_mode: ToolDeliveryMode;
  download_url: string;
  web_url: string;
  /** Apple App Store listing (https://apps.apple.com/...) */
  app_store_url: string;
  /** Google Play listing (https://play.google.com/...) */
  play_store_url: string;
  embed_allowed: number;
  embed_url: string;
  runtime_supported: number;
  runtime_entrypoint: string;
  /** Optional runtime contract (pending DB persistence rollout). */
  runtime_manifest?: RuntimeManifest | null;
  sandbox_level: ToolSandboxLevel;
  trusted_domains: string;
  vendor: string;
  privacy_summary: string;
  data_handling: ToolDataHandling;
  review_notes: string;
  last_reviewed_at: string | null;
  github_url: string;
  platform: string;
  downloads: number;
  created_at: string;
  updated_at: string;
}
