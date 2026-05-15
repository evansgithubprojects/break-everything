import { isValidRuntimeEntryPath } from "@/lib/first-party-inapp";
import { normalizeRuntimeName, runtimeIndexHtmlPath } from "@/lib/runtime-name";

export type FirstPartyToolPayload = {
  delivery_mode: "redirect" | "browserRuntime" | "download";
  runtime_supported: boolean;
  runtime_name: string;
};

/**
 * Validates `/runtime/<name>/index.html` browser runtime rules. Returns an error message or null.
 */
export function validateFirstPartyInApp(payload: FirstPartyToolPayload): string | null {
  if (payload.runtime_supported || payload.delivery_mode === "browserRuntime") {
    const name = normalizeRuntimeName(payload.runtime_name);
    if (!name) {
      return "runtime requires a valid runtime_name (folder under public/runtime, loaded as /runtime/<name>/index.html)";
    }
    const path = runtimeIndexHtmlPath(name);
    if (!isValidRuntimeEntryPath(path)) {
      return "runtime_name resolves to an invalid /runtime path";
    }
  }

  return null;
}
