"use client";

import { useState, useEffect, useRef } from "react";
import { AdminAnalyticsPanel } from "@/components/admin";
import AdminToolForm from "@/components/forms/AdminToolForm";
import type { Tool } from "@/types";

export default function AdminPage() {
  const [authenticated, setAuthenticated] = useState(false);
  const [checking, setChecking] = useState(true);
  const [password, setPassword] = useState("");
  const [loginError, setLoginError] = useState("");
  const [loggingIn, setLoggingIn] = useState(false);

  const [tools, setTools] = useState<Tool[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editingTool, setEditingTool] = useState<Tool | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [adminTab, setAdminTab] = useState<"manage" | "analytics">("manage");

  const isMounted = useRef(true);
  useEffect(() => {
    return () => { isMounted.current = false; };
  }, []);

  async function fetchTools() {
    const res = await fetch("/api/tools");
    const data = await res.json();
    if (isMounted.current) setTools(data.tools);
  }

  useEffect(() => {
    let cancelled = false;
    async function init() {
      const res = await fetch("/api/auth");
      const data = await res.json();
      if (!cancelled) {
        setAuthenticated(data.authenticated);
        setChecking(false);
      }
    }
    init();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (!authenticated) return;
    let cancelled = false;
    async function load() {
      const toolsRes = await fetch("/api/tools");
      if (cancelled) return;
      const toolsData = await toolsRes.json();
      setTools(toolsData.tools);
    }
    load();
    return () => { cancelled = true; };
  }, [authenticated]);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoggingIn(true);
    setLoginError("");

    const res = await fetch("/api/auth", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    });

    if (!res.ok) {
      setLoginError("Invalid password");
      setLoggingIn(false);
      return;
    }

    setAuthenticated(true);
    setLoggingIn(false);
    setPassword("");
  }

  async function handleLogout() {
    await fetch("/api/auth", { method: "DELETE" });
    setAuthenticated(false);
    setTools([]);
  }

  async function handleDelete(slug: string) {
    if (!confirm("Are you sure you want to delete this tool?")) return;
    setDeleting(slug);
    await fetch(`/api/tools/${slug}`, { method: "DELETE" });
    await fetchTools();
    setDeleting(null);
  }

  function handleEdit(tool: Tool) {
    setEditingTool(tool);
    setShowForm(true);
  }

  function handleFormSave() {
    setShowForm(false);
    setEditingTool(null);
    fetchTools();
  }

  function handleFormCancel() {
    setShowForm(false);
    setEditingTool(null);
  }

  if (checking) {
    return (
      <div className="px-6 py-20 text-center">
        <div className="w-8 h-8 border-2 border-accent-amber border-t-transparent rounded-full animate-spin mx-auto" />
      </div>
    );
  }

  // Login Screen
  if (!authenticated) {
    return (
      <div className="px-6 py-20 flex items-center justify-center min-h-[60vh]">
        <div className="w-full max-w-sm">
          <div className="glass-card p-8">
            <div className="text-center mb-8">
              <div className="w-12 h-12 rounded-xl gradient-border bg-background flex items-center justify-center mx-auto mb-4">
                <svg
                  className="w-6 h-6 text-accent-amber"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z"
                  />
                </svg>
              </div>
              <h1 className="text-xl font-bold text-foreground">Admin Access</h1>
              <p className="text-sm text-foreground/40 mt-1">
                Enter the admin password to manage tools.
              </p>
            </div>

            {loginError && (
              <div className="px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm mb-4">
                {loginError}
              </div>
            )}

            <form onSubmit={handleLogin} className="space-y-4">
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Password"
                className="w-full px-4 py-3 rounded-xl bg-white/5 border border-card-border text-foreground text-sm placeholder:text-foreground/30 focus:outline-none focus:border-accent-amber/50 focus:ring-1 focus:ring-accent-amber/30 transition-colors"
                required
                autoFocus
              />
              <button
                type="submit"
                disabled={loggingIn}
                className="w-full px-6 py-3 rounded-xl font-medium text-sm bg-accent-amber hover:bg-accent-amber/90 text-white transition-all disabled:opacity-50"
              >
                {loggingIn ? "Logging in..." : "Login"}
              </button>
            </form>
          </div>
        </div>
      </div>
    );
  }

  // Admin Dashboard
  return (
    <div className="px-6 py-16">
      <div className="mx-auto max-w-5xl">
        {/* Header */}
        <div className="flex flex-col gap-6 mb-10">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold text-foreground">Admin Dashboard</h1>
              <p className="text-foreground/50 text-sm mt-1">
                Manage tools and analytics.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center gap-1.5 glass-card p-1 rounded-xl">
                <button
                  type="button"
                  onClick={() => setAdminTab("manage")}
                  className={`px-4 py-2 rounded-lg text-xs font-medium transition-colors ${
                    adminTab === "manage"
                      ? "bg-accent-amber/15 text-accent-amber border border-accent-amber/30"
                      : "text-foreground/40 hover:text-foreground/60"
                  }`}
                >
                  Manage
                </button>
                <button
                  type="button"
                  onClick={() => setAdminTab("analytics")}
                  className={`px-4 py-2 rounded-lg text-xs font-medium transition-colors ${
                    adminTab === "analytics"
                      ? "bg-accent-amber/15 text-accent-amber border border-accent-amber/30"
                      : "text-foreground/40 hover:text-foreground/60"
                  }`}
                >
                  Analytics
                </button>
              </div>
              {adminTab === "manage" && !showForm && (
                <button
                  onClick={() => {
                    setEditingTool(null);
                    setShowForm(true);
                  }}
                  className="px-5 py-2.5 rounded-xl font-medium text-sm bg-accent-amber hover:bg-accent-amber/90 text-white transition-all"
                >
                  + Add Tool
                </button>
              )}
              <button
                onClick={handleLogout}
                className="px-5 py-2.5 font-medium text-sm glass-card text-foreground/60 hover:text-foreground"
              >
                Logout
              </button>
            </div>
          </div>
        </div>

        {adminTab === "analytics" && (
          <div className="mb-10">
            <h2 className="text-xl font-bold text-foreground mb-4">Analytics</h2>
            <AdminAnalyticsPanel />
          </div>
        )}

        {adminTab === "manage" && (
          <>
        {/* Add/Edit Form */}
        {showForm && (
          <div className="glass-card p-6 mb-8">
            <AdminToolForm
              key={editingTool?.slug ?? "new"}
              tool={editingTool}
              onSave={handleFormSave}
              onCancel={handleFormCancel}
            />
          </div>
        )}

        {/* Tools List */}
        <h2 className="text-xl font-bold text-foreground mb-4">Tools</h2>
        <div className="space-y-3">
          {tools.length === 0 ? (
            <div className="text-center py-20">
              <p className="text-foreground/40 text-lg">No tools yet. Add one above!</p>
            </div>
          ) : (
            tools.map((tool) => (
              (() => {
                const staleDays = tool.last_reviewed_at
                  ? Math.floor(
                      (Date.now() - new Date(tool.last_reviewed_at).getTime()) / (1000 * 60 * 60 * 24)
                    )
                  : null;
                const stale = staleDays == null || staleDays > 90;
                return (
              <div
                key={tool.id}
                className="glass-card p-5 flex items-center justify-between"
              >
                <div className="flex items-center gap-4 min-w-0">
                  <span className="text-2xl">{tool.icon}</span>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-semibold text-foreground truncate">
                        {tool.name}
                      </h3>
                      <span
                        className={`shrink-0 px-2 py-0.5 rounded-md text-[10px] font-medium uppercase tracking-wider border ${
                          tool.tool_kind === "web"
                            ? "bg-sky-500/10 text-sky-400 border-sky-500/25"
                            : "bg-violet-500/10 text-violet-300 border-violet-500/25"
                        }`}
                      >
                        {tool.tool_kind === "web" ? "Web" : "Download"}
                      </span>
                      <span className="shrink-0 px-2 py-0.5 rounded-md text-[10px] font-medium uppercase tracking-wider border border-card-border text-foreground/45">
                        {tool.delivery_mode}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 mt-0.5">
                      <span className="text-xs text-foreground/40">/{tool.slug}</span>
                      <span className="text-xs text-foreground/40 capitalize">
                        {tool.category}
                      </span>
                      <span className="text-xs text-foreground/40">
                        reviewed{" "}
                        {tool.last_reviewed_at
                          ? new Date(tool.last_reviewed_at).toLocaleDateString()
                          : "—"}
                      </span>
                      <span
                        className={`text-xs ${stale ? "text-yellow-400" : "text-foreground/40"}`}
                        title="Tool trust metadata should be re-reviewed every 90 days"
                      >
                        {stale ? "review stale" : "review fresh"}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0 ml-4">
                  <button
                    onClick={() => handleEdit(tool)}
                    className="px-3 py-1.5 text-xs font-medium glass-card text-foreground/60 hover:text-foreground"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDelete(tool.slug)}
                    disabled={deleting === tool.slug}
                    className="px-3 py-1.5 rounded-lg text-xs font-medium bg-red-500/10 text-red-400 hover:bg-red-500/20 border border-red-500/20 disabled:opacity-50"
                  >
                    {deleting === tool.slug ? "..." : "Delete"}
                  </button>
                </div>
              </div>
                );
              })()
            ))
          )}
        </div>
          </>
        )}
      </div>
    </div>
  );
}
