"use client";

import { useState } from "react";
import type { Tool } from "./ToolCard";

interface AdminToolFormProps {
  tool?: Tool | null;
  onSave: () => void;
  onCancel: () => void;
}

function buildInitialForm(tool?: Tool | null) {
  if (tool) {
    return {
      name: tool.name,
      slug: tool.slug,
      description: tool.description,
      short_description: tool.short_description,
      category: tool.category,
      icon: tool.icon,
      download_url: tool.download_url,
      github_url: tool.github_url,
      platform: tool.platform,
      sha256_hash: tool.sha256_hash || "",
      safety_score: tool.safety_score,
      last_scan_date: tool.last_scan_date || "",
    };
  }
  return {
    name: "",
    slug: "",
    description: "",
    short_description: "",
    category: "",
    icon: "🔧",
    download_url: "",
    github_url: "",
    platform: "windows",
    sha256_hash: "",
    safety_score: 100,
    last_scan_date: "",
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
    setForm((prev) => ({
      ...prev,
      [name]: name === "safety_score" ? parseInt(value) || 0 : value,
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

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
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
    "w-full px-4 py-2.5 rounded-xl bg-white/5 border border-card-border text-foreground text-sm placeholder:text-foreground/30 focus:outline-none focus:border-accent-purple/50 focus:ring-1 focus:ring-accent-purple/30 transition-colors";

  const labelClass = "block text-sm font-medium text-foreground/70 mb-1.5";

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
          <label className={labelClass}>Name</label>
          <input
            type="text"
            name="name"
            value={form.name}
            onChange={handleChange}
            onBlur={autoSlug}
            placeholder="PDF Forge"
            className={inputClass}
            required
          />
        </div>
        <div>
          <label className={labelClass}>Slug</label>
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
        <label className={labelClass}>Short Description</label>
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
        <label className={labelClass}>Full Description</label>
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
          <label className={labelClass}>Category</label>
          <input
            type="text"
            name="category"
            value={form.category}
            onChange={handleChange}
            placeholder="pdf, converter, utility..."
            className={inputClass}
            required
          />
        </div>
        <div>
          <label className={labelClass}>Icon (emoji)</label>
          <input
            type="text"
            name="icon"
            value={form.icon}
            onChange={handleChange}
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
            <option value="windows">Windows</option>
            <option value="mac">Mac</option>
            <option value="windows,mac">Windows & Mac</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <div>
          <label className={labelClass}>Download URL</label>
          <input
            type="url"
            name="download_url"
            value={form.download_url}
            onChange={handleChange}
            placeholder="https://github.com/.../releases/latest"
            className={inputClass}
            required
          />
        </div>
        <div>
          <label className={labelClass}>GitHub URL</label>
          <input
            type="url"
            name="github_url"
            value={form.github_url}
            onChange={handleChange}
            placeholder="https://github.com/user/repo"
            className={inputClass}
            required
          />
        </div>
      </div>

      {/* Safety Certificate Fields */}
      <div className="border-t border-card-border pt-5 mt-6">
        <h3 className="text-sm font-semibold text-foreground/70 uppercase tracking-wider mb-4">
          Safety Certificate
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          <div>
            <label className={labelClass}>SHA-256 Hash</label>
            <input
              type="text"
              name="sha256_hash"
              value={form.sha256_hash}
              onChange={handleChange}
              placeholder="a1b2c3d4e5f6..."
              className={`${inputClass} font-mono text-xs`}
            />
          </div>
          <div>
            <label className={labelClass}>Safety Score (0-100)</label>
            <input
              type="number"
              name="safety_score"
              value={form.safety_score}
              onChange={handleChange}
              min={0}
              max={100}
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass}>Last Scan Date</label>
            <input
              type="date"
              name="last_scan_date"
              value={form.last_scan_date}
              onChange={handleChange}
              className={inputClass}
            />
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-3 pt-4">
        <button
          type="submit"
          disabled={saving}
          className="px-6 py-2.5 rounded-xl font-medium text-sm bg-accent-purple hover:bg-accent-purple/90 text-white transition-all disabled:opacity-50"
        >
          {saving ? "Saving..." : isEdit ? "Update Tool" : "Add Tool"}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="px-6 py-2.5 rounded-xl font-medium text-sm glass-card text-foreground/60 hover:text-foreground"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
