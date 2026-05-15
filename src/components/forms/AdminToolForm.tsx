"use client";

import { type ReactNode, useMemo, useState } from "react";
import type { RuntimeManifest, Tool, ToolDeliveryMode, ToolKind } from "@/types";

function CollapsibleSection({
  title,
  subtitle,
  defaultOpen,
  children,
}: {
  title: string;
  subtitle?: string;
  defaultOpen?: boolean;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(Boolean(defaultOpen));

  return (
    <details
      open={open}
      onToggle={(e) => setOpen(e.currentTarget.open)}
      className="rounded-xl border border-card-border bg-white/[0.02] group [&_summary::-webkit-details-marker]:hidden"
    >
      <summary className="cursor-pointer px-4 py-3 flex items-start justify-between gap-4 rounded-xl hover:bg-white/[0.04] list-none marker:content-none transition-colors select-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-amber/40">
        <div className="min-w-0 flex-1">
          <span className="text-sm font-medium text-foreground block">{title}</span>
          {subtitle ? (
            <span className="text-xs text-foreground/45 mt-0.5 block leading-relaxed">{subtitle}</span>
          ) : null}
        </div>
        <span
          aria-hidden
          className="shrink-0 text-foreground/40 text-xs transition-transform group-open:-rotate-180 mt-1"
        >
          ▾
        </span>
      </summary>
      <div className="border-t border-card-border px-4 py-5 space-y-5">{children}</div>
    </details>
  );
}

interface AdminToolFormProps {
  tool?: Tool | null;
  onSave: () => void;
  onCancel: () => void;
}

type RuntimePreset = "none" | "localOnly" | "networkedUtility" | "trustedEmbeddedApp";

const RUNTIME_PRESET_LABELS: Record<Exclude<RuntimePreset, "none">, string> = {
  localOnly: "Local-only utility (no network)",
  networkedUtility: "Networked utility (session storage)",
  trustedEmbeddedApp: "Trusted app (full iframe runtime preset)",
};

function presetManifest(preset: Exclude<RuntimePreset, "none">, entry: string): RuntimeManifest {
  const normalizedEntry = entry.trim() || "/runtime/main.js";
  if (preset === "localOnly") {
    return {
      version: 1,
      entry: normalizedEntry,
      executionMode: "module",
      permissions: { network: false, storage: true, clipboard: false, downloads: false, popups: false },
      allowedOrigins: [],
      storagePolicy: "session",
      capabilities: ["fileOpen", "fileSave"],
    };
  }
  if (preset === "networkedUtility") {
    return {
      version: 1,
      entry: normalizedEntry,
      executionMode: "module",
      permissions: { network: true, storage: true, clipboard: true, downloads: true, popups: false },
      allowedOrigins: [],
      storagePolicy: "session",
      capabilities: ["fileOpen", "fileSave", "copyToClipboard", "share"],
    };
  }
  return {
    version: 1,
    entry: normalizedEntry,
    executionMode: "iframe",
    permissions: { network: true, storage: true, clipboard: true, downloads: true, popups: true },
    allowedOrigins: [],
    storagePolicy: "persistent",
    capabilities: ["openExternal", "share", "copyToClipboard"],
  };
}

function inferManifestFromTool(tool?: Tool | null): RuntimeManifest | null {
  if (!tool) return null;
  if (tool.runtime_manifest) return tool.runtime_manifest;
  if (!tool.runtime_supported && !tool.runtime_entrypoint) return null;
  return {
    version: 1,
    entry: tool.runtime_entrypoint || "/runtime/main.js",
    executionMode: "module",
    permissions: { network: false, storage: true, clipboard: false, downloads: false, popups: false },
    allowedOrigins: [],
    storagePolicy: "session",
    capabilities: ["fileOpen", "fileSave"],
  };
}

function buildInitialForm(tool?: Tool | null) {
  const initialCategories = tool?.categories?.length
    ? tool.categories.join(", ")
    : tool?.category ?? "";
  const initialManifest = inferManifestFromTool(tool);
  if (tool) {
    const kind: ToolKind = tool.tool_kind === "web" ? "web" : "download";
    return {
      name: tool.name,
      slug: tool.slug,
      description: tool.description,
      short_description: tool.short_description,
      categories: initialCategories,
      icon: tool.icon,
      tool_kind: kind,
      delivery_mode: tool.delivery_mode || "download",
      download_url: tool.download_url || "",
      web_url: tool.web_url || "",
      runtime_supported: Boolean(tool.runtime_supported),
      runtime_entrypoint: tool.runtime_entrypoint || "",
      runtime_manifest_preset: "none" as RuntimePreset,
      runtime_manifest_text: initialManifest ? JSON.stringify(initialManifest, null, 2) : "",
      sandbox_level: tool.sandbox_level || "strict",
      trusted_domains: tool.trusted_domains || "",
      vendor: tool.vendor || "",
      privacy_summary: tool.privacy_summary || "",
      data_handling: tool.data_handling || "medium",
      review_notes: tool.review_notes || "",
      last_reviewed_at: tool.last_reviewed_at || "",
      github_url: tool.github_url,
      platform: tool.platform,
      app_store_url: tool.app_store_url || "",
      play_store_url: tool.play_store_url || "",
    };
  }
  return {
    name: "",
    slug: "",
    description: "",
    short_description: "",
    categories: "",
    icon: "🔧",
    tool_kind: "download" as ToolKind,
    delivery_mode: "download",
    download_url: "",
    web_url: "",
    runtime_supported: false,
    runtime_entrypoint: "",
    runtime_manifest_preset: "none" as RuntimePreset,
    runtime_manifest_text: "",
    sandbox_level: "strict",
    trusted_domains: "",
    vendor: "",
    privacy_summary: "",
    data_handling: "medium",
    review_notes: "",
    last_reviewed_at: "",
    github_url: "",
    platform: "windows",
    app_store_url: "",
    play_store_url: "",
  };
}

export default function AdminToolForm({ tool, onSave, onCancel }: AdminToolFormProps) {
  const isEdit = !!tool;
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState(() => buildInitialForm(tool));

  function handleChange(
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) {
    const { name, value } = e.target;
    const checked = "checked" in e.target ? e.target.checked : false;
    setForm((prev) => ({
      ...prev,
      [name]: name === "runtime_supported" ? checked : value,
    }));
  }

  function autoSlug() {
    if (!isEdit) {
      setForm((prev) => ({
        ...prev,
        slug: prev.name
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/^-|-$/g, ""),
      }));
    }
  }

  function applyRuntimePreset() {
    if (form.runtime_manifest_preset === "none") return;
    const manifest = presetManifest(form.runtime_manifest_preset, form.runtime_entrypoint);
    setForm((prev) => ({
      ...prev,
      runtime_supported: true,
      runtime_entrypoint: manifest.entry,
      runtime_manifest_text: JSON.stringify(manifest, null, 2),
    }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");

    try {
      const url = isEdit ? `/api/tools/${tool!.slug}` : "/api/tools";
      const method = isEdit ? "PUT" : "POST";
      const categories = form.categories
        .split(",")
        .map((value) => value.trim())
        .filter(Boolean);
      let runtimeManifest: RuntimeManifest | undefined;
      const runtimeManifestRaw = form.runtime_manifest_text.trim();
      if (runtimeManifestRaw) {
        try {
          const parsed = JSON.parse(runtimeManifestRaw);
          if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
            setError("Runtime manifest must be a JSON object.");
            setSaving(false);
            return;
          }
          runtimeManifest = parsed as RuntimeManifest;
        } catch {
          setError("Runtime manifest must be valid JSON.");
          setSaving(false);
          return;
        }
      }

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          categories,
          runtime_manifest: runtimeManifest,
          runtime_manifest_preset:
            form.runtime_manifest_preset === "none" ? undefined : form.runtime_manifest_preset,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to save tool");
        setSaving(false);
        return;
      }
      onSave();
    } catch {
      setError("Network error");
      setSaving(false);
    }
  }

  const inputClass =
    "w-full px-4 py-2.5 rounded-xl bg-white/5 border border-card-border text-foreground text-sm placeholder:text-foreground/30 focus:outline-none focus:border-accent-amber/50 focus:ring-1 focus:ring-accent-amber/30 transition-colors";

  const labelClass = "block text-sm font-medium text-foreground/70 mb-1.5";
  const requiredMark = <span className="text-accent-amber">*</span>;

  const hasStoreDraft =
    String(form.app_store_url ?? "").trim().length > 0 ||
    String(form.play_store_url ?? "").trim().length > 0;

  const { runtimeRelevant, isolationRelevant, mobileStoresDefaultOpen, trustDefaultOpen } = useMemo(() => {
    const delivery = form.delivery_mode as ToolDeliveryMode;
    const runtimeRelevantInner = delivery === "browserRuntime" || form.runtime_supported;
    const platformLooksMobile = /ios|android/i.test(form.platform);
    const mobileStoresOpen = hasStoreDraft || platformLooksMobile;
    const trustOpen = Boolean(
      String(form.vendor).trim() ||
        String(form.privacy_summary).trim() ||
        String(form.review_notes).trim() ||
        String(form.last_reviewed_at).trim()
    );
    return {
      runtimeRelevant: runtimeRelevantInner,
      isolationRelevant: runtimeRelevantInner,
      mobileStoresDefaultOpen: mobileStoresOpen,
      trustDefaultOpen: trustOpen,
    };
  }, [
    form.delivery_mode,
    form.runtime_supported,
    form.platform,
    hasStoreDraft,
    form.vendor,
    form.privacy_summary,
    form.review_notes,
    form.last_reviewed_at,
  ]);

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <h2 className="text-xl font-bold text-foreground">
        {isEdit ? "Edit Tool" : "Add New Tool"}
      </h2>
      <p className="text-xs text-foreground/45">
        <span className="text-accent-amber">*</span> Required field
      </p>

      {error && (
        <div className="px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <div>
          <label className={labelClass}>Name {requiredMark}</label>
          <input
            type="text"
            name="name"
            value={form.name}
            onChange={handleChange}
            onBlur={autoSlug}
            placeholder="PDF Forge"
            className={inputClass}
            required
            autoFocus
          />
        </div>
        <div>
          <label className={labelClass}>Slug {requiredMark}</label>
          <input
            type="text"
            name="slug"
            value={form.slug}
            onChange={handleChange}
            placeholder="pdf-forge"
            className={inputClass}
            required
            disabled={isEdit}
          />
        </div>
      </div>

      <div>
        <label className={labelClass}>Short Description {requiredMark}</label>
        <input
          type="text"
          name="short_description"
          value={form.short_description}
          onChange={handleChange}
          placeholder="A brief one-liner about the tool"
          className={inputClass}
          required
        />
      </div>

      <div>
        <label className={labelClass}>Full Description {requiredMark}</label>
        <textarea
          name="description"
          value={form.description}
          onChange={handleChange}
          placeholder="Detailed description of what the tool does..."
          className={`${inputClass} h-28 resize-y`}
          required
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <div>
          <label className={labelClass}>Tool type</label>
          <select
            name="tool_kind"
            value={form.tool_kind}
            onChange={handleChange}
            className={inputClass}
          >
            <option value="download">Release / install link (non-web default)</option>
            <option value="web">Web app (runs in browser)</option>
          </select>
        </div>
        <div>
          <label className={labelClass}>Delivery mode</label>
          <select
            name="delivery_mode"
            value={form.delivery_mode}
            onChange={handleChange}
            className={inputClass}
          >
            <option value="redirect">A: Redirect to trusted web tool</option>
            <option value="browserRuntime">B: Browser runtime beta</option>
            <option value="download">Download fallback</option>
          </select>
        </div>
        <div>
          <label className={labelClass}>Categories {requiredMark}</label>
          <input
            type="text"
            name="categories"
            value={form.categories}
            onChange={handleChange}
            placeholder="pdf, converter, mobile, utility"
            className={inputClass}
            required
          />
        </div>
        <div>
          <label className={labelClass}>Icon (emoji or image URL)</label>
          <input
            type="text"
            name="icon"
            value={form.icon}
            onChange={handleChange}
            placeholder="🔧 or https://example.com/icon.png"
            className={inputClass}
          />
        </div>
        <div>
          <label className={labelClass}>Platform</label>
          <select
            name="platform"
            value={form.platform}
            onChange={handleChange}
            className={inputClass}
          >
            <option value="web">Web browser</option>
            <option value="ios">iOS (App Store)</option>
            <option value="android">Android (Google Play)</option>
            <option value="ios,android">iOS & Android</option>
            <option value="windows">Windows</option>
            <option value="mac">Mac</option>
            <option value="windows,mac">Windows & Mac</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {form.tool_kind === "download" ? (
          <div>
            <label className={labelClass}>
              Download URL {!hasStoreDraft ? requiredMark : <span className="text-foreground/30">(optional)</span>}
            </label>
            <input
              type="url"
              name="download_url"
              value={form.download_url}
              onChange={handleChange}
              placeholder="https://… direct or release link (optional if store links below)"
              className={inputClass}
              required={!hasStoreDraft}
            />
            {hasStoreDraft && (
              <p className="mt-1 text-xs text-foreground/40">
                Optional because at least one store URL is provided.
              </p>
            )}
          </div>
        ) : (
          <div>
            <label className={labelClass}>
              Web app URL <span className="text-foreground/30">(optional)</span>
            </label>
            <input
              type="url"
              name="web_url"
              value={form.web_url}
              onChange={handleChange}
              placeholder="https://… external app URL, if any (omit for runtime-only listings)"
              className={inputClass}
            />
            <p className="mt-1 text-xs text-foreground/40">
              Leave blank when users only open the tool via browser runtime (“Try in your browser”).
            </p>
          </div>
        )}
        <div>
          <label className={labelClass}>
            Public project link <span className="text-foreground/30">(optional)</span>
          </label>
          <input
            type="url"
            name="github_url"
            value={form.github_url}
            onChange={handleChange}
            placeholder="Usually GitHub — https://…"
            className={inputClass}
          />
        </div>
      </div>

      <CollapsibleSection
        key={`stores-${mobileStoresDefaultOpen}`}
        title="Mobile app listings"
        subtitle={
          mobileStoresDefaultOpen
            ? "App Store and Google Play URLs. Visitors open each store off-site when set."
            : "Collapsed for desktop-only listings. Expand to add App Store or Play URLs without changing platform."
        }
        defaultOpen={mobileStoresDefaultOpen}
      >
        <p className="text-xs text-foreground/45 -mt-1">
          Include <span className="font-mono text-foreground/55">mobile</span> in categories to group listings with
          other mobile tools.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div>
            <label className={labelClass}>Apple App Store URL</label>
            <input
              type="url"
              name="app_store_url"
              value={form.app_store_url}
              onChange={handleChange}
              placeholder="https://apps.apple.com/…"
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass}>Google Play URL</label>
            <input
              type="url"
              name="play_store_url"
              value={form.play_store_url}
              onChange={handleChange}
              placeholder="https://play.google.com/…"
              className={inputClass}
            />
          </div>
        </div>
      </CollapsibleSection>

      <CollapsibleSection
        key={`runtime-${runtimeRelevant}`}
        title="Browser runtime"
        subtitle={
          runtimeRelevant
            ? "Entry script, manifest JSON, and presets for the in-browser runtime beta."
            : "Shown when delivery is “Browser runtime beta” or “Runtime supported” is checked."
        }
        defaultOpen={runtimeRelevant}
      >
        <p className="text-xs text-foreground/45 -mt-1 leading-relaxed">
          Runtime entrypoints and manifest <span className="font-mono text-foreground/55">entry</span> must live under{" "}
          <span className="font-mono text-foreground/55">/runtime/...</span> only.
        </p>
        <label className="flex items-center gap-2 text-sm text-foreground/70">
          <input
            type="checkbox"
            name="runtime_supported"
            checked={form.runtime_supported}
            onChange={handleChange}
          />
          Runtime supported
        </label>
        {runtimeRelevant ? (
          <div className="space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div>
                <label className={labelClass}>Runtime entrypoint</label>
                <input
                  type="text"
                  name="runtime_entrypoint"
                  value={form.runtime_entrypoint}
                  onChange={handleChange}
                  placeholder="/runtime/main.js"
                  className={inputClass}
                />
                <p className="mt-1 text-xs text-foreground/45">
                  Relative path only (<span className="font-mono text-foreground/55">/runtime/...</span>) — same site, no{" "}
                  <span className="font-mono text-foreground/55">https://</span> prefix.
                </p>
              </div>
              <div>
                <label className={labelClass}>Runtime preset</label>
                <div className="flex gap-2">
                  <select
                    name="runtime_manifest_preset"
                    value={form.runtime_manifest_preset}
                    onChange={handleChange}
                    className={inputClass}
                  >
                    <option value="none">No preset</option>
                    {Object.entries(RUNTIME_PRESET_LABELS).map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={applyRuntimePreset}
                    className="px-3 py-2 text-xs font-medium glass-card text-foreground/70 hover:text-foreground border border-card-border shrink-0"
                  >
                    Apply
                  </button>
                </div>
              </div>
            </div>
            <div>
              <label className={labelClass}>Runtime manifest JSON</label>
              <textarea
                name="runtime_manifest_text"
                value={form.runtime_manifest_text}
                onChange={handleChange}
                placeholder='{"version":1,"entry":"/runtime/main.js","executionMode":"module","permissions":{"network":false},"allowedOrigins":[],"storagePolicy":"session","capabilities":["fileOpen"]}'
                className={`${inputClass} h-44 resize-y font-mono text-xs`}
              />
              <p className="mt-1 text-xs text-foreground/45">
                Optional. If provided, this is validated by the API. Presets generate a safe starter manifest.
              </p>
            </div>
          </div>
        ) : (
          <p className="text-xs text-foreground/40">
            Set delivery mode to <strong className="font-medium text-foreground/55">Browser runtime beta</strong> or
            enable <strong className="font-medium text-foreground/55">Runtime supported</strong> to configure the
            entrypoint and manifest.
          </p>
        )}
      </CollapsibleSection>

      <CollapsibleSection
        key={`sandbox-${isolationRelevant}`}
        title="Sandbox & isolation"
        subtitle={
          isolationRelevant
            ? "Sandbox level and trusted domains for browser runtime iframe/module experiences."
            : "Configure ahead of enabling browser runtime beta; collapses until runtime is relevant."
        }
        defaultOpen={isolationRelevant}
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 max-w-4xl">
          <div className="max-w-md">
            <label className={labelClass}>Sandbox level</label>
            <select
              name="sandbox_level"
              value={form.sandbox_level}
              onChange={handleChange}
              className={inputClass}
            >
              <option value="strict">Strict</option>
              <option value="standard">Standard</option>
              <option value="trusted">Trusted</option>
            </select>
          </div>
          <div>
            <label className={labelClass}>Trusted domains (comma-separated)</label>
            <input
              type="text"
              name="trusted_domains"
              value={form.trusted_domains}
              onChange={handleChange}
              placeholder="example.com,cdn.example.com"
              className={inputClass}
            />
            <p className="mt-1 text-xs text-foreground/45">
              Used when the runtime communicates with origins outside the deployment (module manifest / presets).
            </p>
          </div>
        </div>
      </CollapsibleSection>

      <CollapsibleSection
        key={`trust-${trustDefaultOpen}`}
        title="Trust & moderation"
        subtitle="Vendor, privacy, data handling, and internal review fields."
        defaultOpen={trustDefaultOpen}
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div>
            <label className={labelClass}>Vendor</label>
            <input
              type="text"
              name="vendor"
              value={form.vendor}
              onChange={handleChange}
              placeholder="Provider or publisher name"
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass}>Privacy summary</label>
            <input
              type="text"
              name="privacy_summary"
              value={form.privacy_summary}
              onChange={handleChange}
              placeholder="Where user data is processed and retained"
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass}>Data handling</label>
            <select
              name="data_handling"
              value={form.data_handling}
              onChange={handleChange}
              className={inputClass}
            >
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
            </select>
          </div>
          <div>
            <label className={labelClass}>Last reviewed</label>
            <input
              type="date"
              name="last_reviewed_at"
              value={form.last_reviewed_at}
              onChange={handleChange}
              className={inputClass}
            />
          </div>
          <div className="md:col-span-2">
            <label className={labelClass}>Review notes</label>
            <textarea
              name="review_notes"
              value={form.review_notes}
              onChange={handleChange}
              className={`${inputClass} h-24 resize-y`}
              placeholder="Moderation checklist notes, trust rationale, and follow-up tasks"
            />
          </div>
        </div>
      </CollapsibleSection>

      {/* Actions */}
      <div className="flex items-center gap-3 pt-4">
        <button
          type="submit"
          disabled={saving}
          className="px-6 py-2.5 rounded-xl font-medium text-sm bg-accent-amber hover:bg-accent-amber/90 text-white transition-all disabled:opacity-50"
        >
          {saving ? "Saving..." : isEdit ? "Update Tool" : "Add Tool"}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="px-6 py-2.5 font-medium text-sm glass-card text-foreground/60 hover:text-foreground"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
