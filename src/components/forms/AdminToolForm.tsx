"use client";

import { type ReactNode, useMemo, useState } from "react";
import { isRuntimeTool } from "@/lib/tool-flags";
import type { Tool, ToolDeliveryMode, ToolKind } from "@/types";

function CollapsibleSection({
  title,
  defaultOpen,
  children,
}: {
  title: string;
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
        <span className="text-sm font-medium text-foreground block">{title}</span>
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

function buildInitialForm(tool?: Tool | null) {
  const initialCategories = tool?.categories?.length
    ? tool.categories.join(", ")
    : tool?.category ?? "";
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
      runtime_name: tool.runtime_name || "",
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
    runtime_name: "",
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

      const payload = {
        name: form.name,
        slug: form.slug,
        description: form.description,
        short_description: form.short_description,
        categories,
        icon: form.icon,
        tool_kind: form.tool_kind,
        delivery_mode: form.delivery_mode,
        download_url: form.download_url,
        web_url: form.web_url,
        github_url: form.github_url,
        platform: form.platform,
        app_store_url: form.app_store_url,
        play_store_url: form.play_store_url,
        runtime_supported: form.runtime_supported,
        runtime_name: form.runtime_name.trim().toLowerCase(),
        vendor: form.vendor,
        privacy_summary: form.privacy_summary,
        data_handling: form.data_handling,
        review_notes: runtimeRelevant ? "" : form.review_notes,
        last_reviewed_at: runtimeRelevant ? "" : form.last_reviewed_at,
      };

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
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

  const { runtimeRelevant, mobileStoresDefaultOpen, trustDefaultOpen } = useMemo(() => {
    const delivery = form.delivery_mode as ToolDeliveryMode;
    const runtimeRelevantInner = isRuntimeTool({
      delivery_mode: delivery,
      runtime_supported: form.runtime_supported ? 1 : 0,
    });
    const platformLooksMobile = /ios|android/i.test(form.platform);
    const mobileStoresOpen = hasStoreDraft || platformLooksMobile;
    const trustOpen =
      !runtimeRelevantInner &&
      Boolean(
        String(form.vendor).trim() ||
          String(form.privacy_summary).trim() ||
          String(form.review_notes).trim() ||
          String(form.last_reviewed_at).trim()
      );
    return {
      runtimeRelevant: runtimeRelevantInner,
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

  const isBrowserRuntime = form.delivery_mode === "browserRuntime";

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <h2 className="text-xl font-bold text-foreground">
        {isEdit ? "Edit Tool" : "Add New Tool"}
      </h2>

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
          placeholder="One-line summary"
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
          placeholder="Full description"
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
            <option value="download">Install / release</option>
            <option value="web">Web app</option>
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
            <option value="redirect">Redirect</option>
            <option value="browserRuntime">Browser runtime</option>
            <option value="download">Download</option>
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
          <label className={labelClass}>Icon</label>
          <input
            type="text"
            name="icon"
            value={form.icon}
            onChange={handleChange}
            placeholder="🔧 or https://example.com/icon.png"
            className={inputClass}
          />
        </div>
        {!isBrowserRuntime ? (
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
        ) : null}
      </div>

      {!isBrowserRuntime || form.tool_kind === "download" ? (
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
                placeholder="https://…"
                className={inputClass}
                required={!hasStoreDraft}
              />
            </div>
          ) : !isBrowserRuntime ? (
            <div>
              <label className={labelClass}>
                Web app URL <span className="text-foreground/30">(optional)</span>
              </label>
              <input
                type="url"
                name="web_url"
                value={form.web_url}
                onChange={handleChange}
                placeholder="https://…"
                className={inputClass}
              />
            </div>
          ) : null}
          {!isBrowserRuntime ? (
            <div>
              <label className={labelClass}>
                Project link <span className="text-foreground/30">(optional)</span>
              </label>
              <input
                type="url"
                name="github_url"
                value={form.github_url}
                onChange={handleChange}
                placeholder="https://github.com/…"
                className={inputClass}
              />
            </div>
          ) : null}
        </div>
      ) : null}

      {!runtimeRelevant ? (
        <CollapsibleSection
          key={`stores-${mobileStoresDefaultOpen}`}
          title="App Store & Google Play"
          defaultOpen={mobileStoresDefaultOpen}
        >
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
      ) : null}

      <CollapsibleSection
        key={`runtime-${runtimeRelevant}`}
        title="Browser runtime"
        defaultOpen={runtimeRelevant}
      >
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
          <div>
            <label className={labelClass}>
              Runtime name {requiredMark}
            </label>
            <input
              type="text"
              name="runtime_name"
              value={form.runtime_name}
              onChange={handleChange}
              placeholder="video-converter"
              pattern="[a-z0-9][a-z0-9-]*"
              className={inputClass}
              required={form.delivery_mode === "browserRuntime"}
            />
          </div>
        ) : (
          <p className="text-xs text-foreground/40">
            Enable Browser runtime or check Runtime supported, then set the folder name (e.g. video-converter).
          </p>
        )}
      </CollapsibleSection>

      {!runtimeRelevant ? (
        <CollapsibleSection
          key={`trust-${trustDefaultOpen}`}
          title="Trust & review"
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
                placeholder="Publisher"
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
                placeholder="e.g. data region, retention"
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
                placeholder="Internal notes"
              />
            </div>
          </div>
        </CollapsibleSection>
      ) : null}

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
