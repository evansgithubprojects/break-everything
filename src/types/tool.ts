export type ToolKind = "download" | "web";
export type ToolDeliveryMode = "redirect" | "embedded" | "browserRuntime" | "download";
export type ToolSandboxLevel = "strict" | "standard" | "trusted";
export type ToolDataHandling = "low" | "medium" | "high";

export interface Tool {
  id: number;
  name: string;
  slug: string;
  description: string;
  short_description: string;
  category: string;
  icon: string;
  /** download = release or install URL when not primarily web; web = in-browser app URL */
  tool_kind: ToolKind;
  delivery_mode: ToolDeliveryMode;
  download_url: string;
  web_url: string;
  embed_allowed: number;
  embed_url: string;
  runtime_supported: number;
  runtime_entrypoint: string;
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
