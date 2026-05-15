import type { RuntimeManifest } from "@/types";
import { isValidRuntimeEntryPath } from "@/lib/first-party-inapp";

export type FirstPartyToolPayload = {
  delivery_mode: "redirect" | "browserRuntime" | "download";
  runtime_supported: boolean;
  runtime_entrypoint: string;
  runtime_manifest: RuntimeManifest | null;
};

/**
 * Validates `/runtime` browser runtime path rules. Returns an error message or null.
 */
export function validateFirstPartyInApp(payload: FirstPartyToolPayload): string | null {
  if (payload.runtime_supported || payload.delivery_mode === "browserRuntime") {
    const entries: string[] = [];
    const rp = String(payload.runtime_entrypoint ?? "").trim();
    if (rp) entries.push(rp);
    const me = payload.runtime_manifest?.entry;
    if (typeof me === "string" && me.trim()) entries.push(me.trim());
    const unique = [...new Set(entries)];
    if (unique.length === 0) {
      return "runtime requires runtime_entrypoint or runtime_manifest.entry under /runtime";
    }
    for (const e of unique) {
      if (!isValidRuntimeEntryPath(e)) {
        return "runtime entries must be relative paths under /runtime only (same-origin tooling)";
      }
    }
  }

  return null;
}
