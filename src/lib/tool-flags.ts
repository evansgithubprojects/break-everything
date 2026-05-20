import type { Tool } from "@/types";

export function isRuntimeTool(
  tool: Pick<Tool, "delivery_mode" | "runtime_supported" | "runtime_name">
): boolean {
  if (tool.delivery_mode === "browserRuntime") return true;
  if (Number(tool.runtime_supported) > 0) return true;
  return Boolean(String(tool.runtime_name ?? "").trim());
}
