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
  const fromCheckbox =
    body.runtime_supported === true ||
    body.runtime_supported === 1 ||
    body.runtime_supported === "1" ||
    body.runtime_supported === "true";
  const fromDelivery = deliveryMode === "browserRuntime";
  const wantsRuntimeConfig = fromCheckbox || fromDelivery;
  const runtimeName = normalizeRuntimeName(body.runtime_name);

  if (wantsRuntimeConfig && !runtimeName) {
    return {
      ok: false,
      error:
        "runtime_name is required when browser runtime is enabled (folder under public/runtime, e.g. video-converter)",
    };
  }

  const runtimeSupported = fromCheckbox && runtimeName ? 1 : 0;
  const storedName = wantsRuntimeConfig && runtimeName ? runtimeName : "";
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
