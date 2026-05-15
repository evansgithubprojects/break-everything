import { defaultRuntimeManifestForName, normalizeRuntimeName, runtimeIndexHtmlPath } from "@/lib/runtime-name";
import type { RuntimeManifest, Tool } from "@/types";

export type ParsedToolRuntimeWrite = {
  runtime_supported: number;
  runtime_name: string;
  runtime_entrypoint: string;
  runtime_manifest: RuntimeManifest | null;
  sandbox_level: Tool["sandbox_level"];
  trusted_domains: string;
};

/**
 * Resolves runtime fields for create/update: only `runtime_name` is user-controlled;
 * entry path is always `/runtime/<name>/index.html`; manifest is derived (iframe shell).
 */
export function parseToolRuntimeWrite(body: Record<string, unknown>, deliveryMode: Tool["delivery_mode"]): {
  ok: true;
  value: ParsedToolRuntimeWrite;
} | { ok: false; error: string } {
  const fromCheckbox = Boolean(body.runtime_supported);
  const fromDelivery = deliveryMode === "browserRuntime";
  const wantsRuntime = fromCheckbox || fromDelivery;
  const runtimeName = normalizeRuntimeName(body.runtime_name);

  if (wantsRuntime && !runtimeName) {
    return {
      ok: false,
      error:
        "runtime_name is required when browser runtime is enabled (folder under public/runtime, e.g. video-converter)",
    };
  }

  const runtimeSupported = wantsRuntime && runtimeName ? 1 : 0;
  const storedName = wantsRuntime && runtimeName ? runtimeName : "";
  const runtimeEntrypoint = storedName ? runtimeIndexHtmlPath(storedName) : "";
  const runtimeManifest = storedName ? defaultRuntimeManifestForName(storedName) : null;
  const sandbox_level: Tool["sandbox_level"] = runtimeSupported ? "trusted" : "strict";
  const trusted_domains = "";

  return {
    ok: true,
    value: {
      runtime_supported: runtimeSupported,
      runtime_name: storedName,
      runtime_entrypoint: runtimeEntrypoint,
      runtime_manifest: runtimeManifest,
      sandbox_level,
      trusted_domains,
    },
  };
}
