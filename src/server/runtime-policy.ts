import type { RuntimeCapability, RuntimePermissions, Tool, RuntimeManifest } from "@/types";
import { isValidRuntimeEntryPath, resolveRuntimeEntryAppUrl } from "@/lib/first-party-inapp";

const PERMISSION_KEYS: Array<keyof RuntimePermissions> = [
  "network",
  "storage",
  "clipboard",
  "downloads",
  "popups",
];

type RuntimePolicyTool = Pick<Tool, "slug" | "sandbox_level">;

export interface RuntimePolicy {
  executionMode: "iframe" | "module";
  sandbox: string;
  iframeAllow: string | null;
  /** Sanitized `/runtime…` entry; iframe/module consumers resolve absolute URL from site origin. */
  entry: string;
  /** Absolute URL resolved for iframe `src`; same as resolved module script URL origin semantics. */
  entryAppUrl: string;
  allowedPostMessageOrigins: string[];
  permissions: Required<RuntimePermissions>;
  capabilities: RuntimeCapability[];
  deniedReasons: string[];
}

function normalizePermissions(raw: RuntimeManifest["permissions"]): Required<RuntimePermissions> {
  const out: Required<RuntimePermissions> = {
    network: false,
    storage: false,
    clipboard: false,
    downloads: false,
    popups: false,
  };
  for (const key of PERMISSION_KEYS) {
    out[key] = raw?.[key] === true;
  }
  return out;
}

function clampPermissionsBySandbox(
  requested: Required<RuntimePermissions>,
  level: Tool["sandbox_level"]
): Required<RuntimePermissions> {
  const out = { ...requested };
  if (level === "strict") {
    out.network = false;
    out.storage = false;
    out.clipboard = false;
    out.downloads = false;
    out.popups = false;
    return out;
  }
  if (level === "standard") {
    out.popups = false;
    return out;
  }
  return out;
}

function clampCapabilitiesBySandbox(
  requested: RuntimeCapability[],
  level: Tool["sandbox_level"]
): RuntimeCapability[] {
  if (level === "trusted") return requested;
  if (level === "standard") {
    return requested.filter((c) => c === "copyToClipboard" || c === "openExternal");
  }
  return [];
}

/** Real origin inside the iframe (WASM/workers/storage); required for ffmpeg.wasm and similar. First-party `/runtime` only. */
function iframeSandbox(
  level: Tool["sandbox_level"],
  allowPopups: boolean,
  allowDownloads: boolean
): string {
  const parts = ["allow-forms", "allow-modals", "allow-scripts", "allow-same-origin allow-downloads"];
  if (allowDownloads) {
    parts.push("allow-downloads");
  }
  const base = parts.join(" ");
  if (level === "trusted" && allowPopups) {
    return `${base} allow-popups allow-popups-to-escape-sandbox`;
  }
  if ((level === "standard" || level === "trusted") && allowPopups) {
    return `${base} allow-popups`;
  }
  return base;
}

function toIframeAllow(permissions: Required<RuntimePermissions>): string | null {
  const tokens: string[] = [];
  if (permissions.clipboard) {
    tokens.push("clipboard-read", "clipboard-write");
  }
  if (permissions.downloads) {
    tokens.push("downloads");
  }
  if (tokens.length === 0) return null;
  return tokens.join("; ");
}

function computePostMessageOrigins(allowedOrigins: string[]): string[] {
  const out = new Set<string>();
  for (const origin of allowedOrigins) out.add(origin.toLowerCase());
  return [...out];
}

/**
 * Resolve effective runtime policy from manifest + trust controls.
 * Deny-by-default: strict levels clear most permissions/capabilities even if requested.
 */
export function resolveRuntimePolicy(
  tool: RuntimePolicyTool,
  manifest: RuntimeManifest,
  options: {
    moduleBetaEnabled: boolean;
    rollout?: { enabled: boolean; reason?: string };
    /** Site origin (`https://your.domain`) used to resolve relative `/runtime` entries. */
    firstPartyOrigin?: string;
  }
): RuntimePolicy {
  const deniedReasons: string[] = [];
  const entry = String(manifest.entry ?? "").trim();
  const requestedPermissions = normalizePermissions(manifest.permissions);
  const permissions = clampPermissionsBySandbox(requestedPermissions, tool.sandbox_level);
  const capabilities = clampCapabilitiesBySandbox(
    Array.isArray(manifest.capabilities) ? manifest.capabilities : [],
    tool.sandbox_level
  );

  if (options.rollout && !options.rollout.enabled) {
    deniedReasons.push(options.rollout.reason ?? "Runtime rollout denied this tool.");
  }

  const fpOrigin = String(options.firstPartyOrigin ?? "").trim();

  if (!entry) {
    deniedReasons.push("Runtime entry is missing.");
  } else if (!isValidRuntimeEntryPath(entry)) {
    deniedReasons.push("Runtime entry must be a relative path under /runtime only.");
  }

  const entryAppUrl =
    fpOrigin && entry && isValidRuntimeEntryPath(entry)
      ? resolveRuntimeEntryAppUrl(entry, fpOrigin)
      : entry;

  let executionMode: "iframe" | "module" = "iframe";
  if (manifest.executionMode === "module") {
    if (!options.moduleBetaEnabled) {
      deniedReasons.push("Module mode disabled by environment flag.");
    } else if (tool.sandbox_level !== "trusted") {
      deniedReasons.push("Module mode requires trusted sandbox level.");
    } else {
      executionMode = "module";
    }
  }

  let allowedPostMessageOrigins = computePostMessageOrigins(manifest.allowedOrigins ?? []);

  if (fpOrigin) {
    try {
      allowedPostMessageOrigins = [
        ...new Set([...allowedPostMessageOrigins, new URL(fpOrigin).origin.toLowerCase()]),
      ];
    } catch {
      /* ignore */
    }
  }

  return {
    executionMode,
    sandbox: iframeSandbox(tool.sandbox_level, permissions.popups, permissions.downloads),
    iframeAllow: toIframeAllow(permissions),
    entry,
    entryAppUrl,
    allowedPostMessageOrigins,
    permissions,
    capabilities,
    deniedReasons,
  };
}
