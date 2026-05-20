import type { Tool } from "@/types";

export function isRuntimeTool(tool: Pick<Tool, "delivery_mode" | "runtime_supported">): boolean {
  return tool.delivery_mode === "browserRuntime" || Number(tool.runtime_supported) > 0;
}
