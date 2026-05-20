"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import type { RuntimeManifest, Tool } from "@/types";
import { trackRuntimeLifecycleEvent } from "@/analytics";
import { getPublicSiteOrigin } from "@/lib/first-party-inapp";
import { resolveRuntimePolicy } from "@/server/runtime-policy";

type RuntimeHostTool = Pick<
  Tool,
  | "name"
  | "slug"
  | "runtime_name"
  | "runtime_entrypoint"
  | "runtime_manifest"
  | "runtime_supported"
  | "sandbox_level"
  | "trusted_domains"
>;

function normalizeEntry(value: string): string {
  return String(value ?? "").trim();
}

function toFallbackManifest(tool: RuntimeHostTool): RuntimeManifest | null {
  const entry = normalizeEntry(tool.runtime_entrypoint);
  if (!entry) return null;
  return {
    version: 1,
    entry,
    executionMode: "iframe",
    permissions: {},
    allowedOrigins: [],
    storagePolicy: "session",
    capabilities: [],
  };
}

function normalizeManifest(tool: RuntimeHostTool): RuntimeManifest | null {
  const m = tool.runtime_manifest ?? toFallbackManifest(tool);
  if (!m) return null;
  const entry = normalizeEntry(m.entry);
  if (!entry) return null;
  return { ...m, entry };
}

function FatalState({
  title,
  reason,
  slug,
  entry,
}: {
  title: string;
  reason: string;
  slug: string;
  entry?: string;
}) {
  return (
    <div className="glass-card p-8">
      <h2 className="text-xl font-semibold text-foreground mb-2">{title}</h2>
      <p className="text-sm text-foreground/60 mb-5">{reason}</p>
      {entry ? (
        <div className="rounded-none border border-card-border bg-white/5 p-4 mb-5">
          <p className="text-xs text-foreground/50">Configured runtime entry</p>
          <p className="text-xs font-mono text-foreground/75 mt-1 break-all">{entry}</p>
        </div>
      ) : null}
      <div className="flex flex-wrap gap-3">
        <Link href={`/tools/${slug}`} className="text-sm text-accent-steel hover:underline">
          Back to tool details
        </Link>
        {entry && entry.startsWith("/") ? (
          <a
            href={entry}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-accent-amber hover:underline"
          >
            Open runtime entry directly
          </a>
        ) : null}
      </div>
    </div>
  );
}

export default function ToolRuntimeHost({ tool }: { tool: RuntimeHostTool }) {
  const manifest = useMemo(() => normalizeManifest(tool), [tool]);
  const [moduleErrorState, setModuleErrorState] = useState<{ key: string; message: string } | null>(null);
  const [runtimeReadyKey, setRuntimeReadyKey] = useState<string | null>(null);
  const lastStartTrackedKey = useRef("");
  const lastReadyTrackedKey = useRef("");

  const moduleAllowed = process.env.NEXT_PUBLIC_RUNTIME_MODULE_BETA === "1";
  const firstPartyOrigin = getPublicSiteOrigin();
  const policy = useMemo(() => {
    if (!manifest) return null;
    return resolveRuntimePolicy(tool, manifest, {
      moduleBetaEnabled: moduleAllowed,
      firstPartyOrigin,
    });
  }, [manifest, moduleAllowed, tool, firstPartyOrigin]);

  const runtimeKey = `${tool.slug}:${policy?.executionMode ?? "none"}:${policy?.entry ?? ""}`;
  const runtimeReady = runtimeReadyKey === runtimeKey;
  const moduleError = moduleErrorState?.key === runtimeKey ? moduleErrorState.message : null;

  useEffect(() => {
    if (!policy || policy.deniedReasons.length > 0) return;
    if (lastStartTrackedKey.current === runtimeKey) return;
    lastStartTrackedKey.current = runtimeKey;
    void trackRuntimeLifecycleEvent(tool.slug, "runtime_start");
  }, [policy, runtimeKey, tool.slug]);

  useEffect(() => {
    if (!policy || policy.allowedPostMessageOrigins.length === 0) return;
    const allowed = new Set(policy.allowedPostMessageOrigins);
    const onMessage = (event: MessageEvent) => {
      if (!allowed.has(event.origin.toLowerCase())) return;
      const data = event.data;
      if (!data || typeof data !== "object") return;
      if ((data as { type?: string }).type === "runtime:ready") {
        setRuntimeReadyKey(runtimeKey);
      }
      if ((data as { type?: string }).type === "runtime:action") {
        const actionRaw = String((data as { action?: unknown }).action ?? "").trim();
        const action = actionRaw.replace(/[^a-zA-Z0-9_-]+/g, "_").slice(0, 64) || "runtime_action";
        void trackRuntimeLifecycleEvent(tool.slug, "runtime_action", action);
      }
    };
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, [policy, runtimeKey, tool.slug]);

  useEffect(() => {
    if (!manifest || !policy || policy.executionMode !== "module") return;
    if (policy.deniedReasons.length > 0) {
      return;
    }

    const host = document.getElementById(`runtime-module-host-${tool.slug}`);
    if (!host) {
      return;
    }

    const script = document.createElement("script");
    script.type = "module";
    script.src = policy.entry;
    script.async = true;
    script.onerror = () => {
      setModuleErrorState({ key: runtimeKey, message: "Runtime module failed to load." });
    };
    host.appendChild(script);

    return () => {
      script.remove();
    };
  }, [manifest, policy, runtimeKey, tool.slug]);

  useEffect(() => {
    if (!runtimeReady) return;
    if (lastReadyTrackedKey.current === runtimeKey) return;
    lastReadyTrackedKey.current = runtimeKey;
    void trackRuntimeLifecycleEvent(tool.slug, "runtime_ready");
  }, [runtimeKey, runtimeReady, tool.slug]);

  useEffect(() => {
    if (!moduleError) return;
    void trackRuntimeLifecycleEvent(tool.slug, "runtime_error", "module_load_failed");
  }, [moduleError, tool.slug]);

  if (!tool.runtime_supported) {
    return (
      <FatalState
        title={`${tool.name} — runtime unavailable`}
        reason="This tool is not currently enabled for browser runtime mode."
        slug={tool.slug}
      />
    );
  }

  if (!manifest) {
    return (
      <FatalState
        title={`${tool.name} — runtime not configured`}
        reason="No runtime manifest or entrypoint is configured for this tool yet."
        slug={tool.slug}
      />
    );
  }

  if (!policy) {
    return (
      <FatalState
        title={`${tool.name} — runtime policy unavailable`}
        reason="Runtime policy could not be resolved for this tool."
        slug={tool.slug}
      />
    );
  }

  if (policy.deniedReasons.length > 0) {
    return (
      <FatalState
        title={`${tool.name} — runtime blocked by policy`}
        reason={policy.deniedReasons.join(" ")}
        slug={tool.slug}
        entry={policy.entry}
      />
    );
  }

  if (policy.executionMode === "module") {
    if (moduleError) {
      return (
        <FatalState
          title={`${tool.name} — module runtime failed`}
          reason={moduleError}
          slug={tool.slug}
          entry={manifest.entry}
        />
      );
    }

    return (
      <div className="space-y-4">
        <div className="glass-card p-4 text-sm text-foreground/60">
          Running module runtime mode. This mode is enabled only for explicitly allowed tools and can be disabled at any
          time.
        </div>
        <div
          id={`runtime-module-host-${tool.slug}`}
          className="rounded-none border-2 border-card-border min-h-[70vh] bg-black/20"
        />
      </div>
    );
  }

  return (
    <iframe
      src={policy.entry}
      title={`${tool.name} — runtime host`}
      className="w-full min-h-[75vh] bg-black"
      sandbox={policy.sandbox}
      allow={policy.iframeAllow ?? undefined}
      referrerPolicy="strict-origin-when-cross-origin"
    />
  );
}

