"use client";

import { useState, useEffect, useRef } from "react";
import AdminToolForm from "@/components/AdminToolForm";
import type { Tool } from "@/components/ToolCard";

interface ToolRequest {
  id: number;
  tool_name: string;
  description: string;
  submitted_by: string | null;
  link: string | null;
  status: string;
  created_at: string;
}

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

  const [requests, setRequests] = useState<ToolRequest[]>([]);
  const [requestFilter, setRequestFilter] = useState<string>("pending");

  const isMounted = useRef(true);
  useEffect(() => {
    return () => { isMounted.current = false; };
  }, []);

  async function fetchTools() {
    const res = await fetch("/api/tools");
    const data = await res.json();
    if (isMounted.current) setTools(data.tools);
  }

  async function fetchRequests() {
    const res = await fetch("/api/requests");
    if (res.ok && isMounted.current) {
      const data = await res.json();
      setRequests(data.requests);
    }
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
      const [toolsRes, reqsRes] = await Promise.all([
        fetch("/api/tools"),
        fetch("/api/requests"),
      ]);
      if (cancelled) return;
      const toolsData = await toolsRes.json();
      setTools(toolsData.tools);
      if (reqsRes.ok) {
        const reqsData = await reqsRes.json();
        setRequests(reqsData.requests);
      }
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

  async function handleRequestStatus(id: number, status: string) {
    await fetch(`/api/requests/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    await fetchRequests();
  }

  async function handleDeleteRequest(id: number) {
    await fetch(`/api/requests/${id}`, { method: "DELETE" });
    await fetchRequests();
  }

  const filteredRequests =
    requestFilter === "all"
      ? requests
      : requests.filter((r) => r.status === requestFilter);

  const pendingCount = requests.filter((r) => r.status === "pending").length;

  if (checking) {
    return (
      <div className="px-6 py-20 text-center">
        <div className="w-8 h-8 border-2 border-accent-purple border-t-transparent rounded-full animate-spin mx-auto" />
      </div>
    );
  }

  // Login Screen
  if (!authenticated) {
    return (
      <div className="px-6 py-20 flex items-center justify-center min-h-[60vh]">
        <div className="w-full max-w-sm">
          <div className="glass-card rounded-2xl p-8">
            <div className="text-center mb-8">
              <div className="w-12 h-12 rounded-xl gradient-border bg-background flex items-center justify-center mx-auto mb-4">
                <svg
                  className="w-6 h-6 text-accent-purple"
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
                className="w-full px-4 py-3 rounded-xl bg-white/5 border border-card-border text-foreground text-sm placeholder:text-foreground/30 focus:outline-none focus:border-accent-purple/50 focus:ring-1 focus:ring-accent-purple/30 transition-colors"
                required
                autoFocus
              />
              <button
                type="submit"
                disabled={loggingIn}
                className="w-full px-6 py-3 rounded-xl font-medium text-sm bg-accent-purple hover:bg-accent-purple/90 text-white transition-all disabled:opacity-50"
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
        <div className="flex items-center justify-between mb-10">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Admin Dashboard</h1>
            <p className="text-foreground/50 text-sm mt-1">
              Manage tools, certificates, and downloads.
            </p>
          </div>
          <div className="flex items-center gap-3">
            {!showForm && (
              <button
                onClick={() => {
                  setEditingTool(null);
                  setShowForm(true);
                }}
                className="px-5 py-2.5 rounded-xl font-medium text-sm bg-accent-purple hover:bg-accent-purple/90 text-white transition-all"
              >
                + Add Tool
              </button>
            )}
            <button
              onClick={handleLogout}
              className="px-5 py-2.5 rounded-xl font-medium text-sm glass-card text-foreground/60 hover:text-foreground"
            >
              Logout
            </button>
          </div>
        </div>

        {/* Add/Edit Form */}
        {showForm && (
          <div className="glass-card rounded-2xl p-6 mb-8">
            <AdminToolForm
              key={editingTool?.slug ?? "new"}
              tool={editingTool}
              onSave={handleFormSave}
              onCancel={handleFormCancel}
            />
          </div>
        )}

        {/* Tool Requests */}
        <div className="mb-10">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <h2 className="text-xl font-bold text-foreground">Tool Requests</h2>
              {pendingCount > 0 && (
                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-accent-purple/15 text-accent-purple border border-accent-purple/30">
                  {pendingCount} new
                </span>
              )}
            </div>
            <div className="flex items-center gap-1.5">
              {["pending", "approved", "dismissed", "all"].map((f) => (
                <button
                  key={f}
                  onClick={() => setRequestFilter(f)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium capitalize transition-colors ${
                    requestFilter === f
                      ? "bg-accent-purple/15 text-accent-purple border border-accent-purple/30"
                      : "text-foreground/40 hover:text-foreground/60"
                  }`}
                >
                  {f}
                </button>
              ))}
            </div>
          </div>

          {filteredRequests.length === 0 ? (
            <div className="glass-card rounded-xl p-8 text-center">
              <p className="text-foreground/40 text-sm">
                {requestFilter === "pending"
                  ? "No pending requests."
                  : `No ${requestFilter === "all" ? "" : requestFilter + " "}requests.`}
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {filteredRequests.map((req) => (
                <div
                  key={req.id}
                  className="glass-card rounded-xl p-4 flex items-start gap-4"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="font-semibold text-foreground text-sm">
                        {req.tool_name}
                      </h4>
                      <span
                        className={`px-2 py-0.5 rounded-md text-[10px] font-medium uppercase tracking-wider ${
                          req.status === "pending"
                            ? "bg-yellow-500/10 text-yellow-400 border border-yellow-500/20"
                            : req.status === "approved"
                              ? "bg-green-500/10 text-green-400 border border-green-500/20"
                              : "bg-foreground/5 text-foreground/30 border border-foreground/10"
                        }`}
                      >
                        {req.status}
                      </span>
                    </div>
                    <p className="text-xs text-foreground/50 mt-1 line-clamp-2">
                      {req.description}
                    </p>
                    <div className="flex items-center gap-3 mt-2">
                      {req.submitted_by && (
                        <span className="text-[11px] text-foreground/30">
                          by {req.submitted_by}
                        </span>
                      )}
                      {req.link && (
                        <a
                          href={req.link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[11px] text-accent-blue hover:text-accent-blue/80 transition-colors"
                        >
                          View link
                        </a>
                      )}
                      <span className="text-[11px] text-foreground/20">
                        {new Date(req.created_at).toLocaleDateString()}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    {req.status === "pending" && (
                      <>
                        <button
                          onClick={() => handleRequestStatus(req.id, "approved")}
                          className="px-2.5 py-1.5 rounded-lg text-[11px] font-medium bg-green-500/10 text-green-400 hover:bg-green-500/20 border border-green-500/20 transition-colors"
                          title="Approve"
                        >
                          Approve
                        </button>
                        <button
                          onClick={() => handleRequestStatus(req.id, "dismissed")}
                          className="px-2.5 py-1.5 rounded-lg text-[11px] font-medium bg-foreground/5 text-foreground/40 hover:text-foreground/60 border border-foreground/10 transition-colors"
                          title="Dismiss"
                        >
                          Dismiss
                        </button>
                      </>
                    )}
                    <button
                      onClick={() => handleDeleteRequest(req.id)}
                      className="px-2.5 py-1.5 rounded-lg text-[11px] font-medium bg-red-500/10 text-red-400 hover:bg-red-500/20 border border-red-500/20 transition-colors"
                      title="Delete"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Tools List */}
        <h2 className="text-xl font-bold text-foreground mb-4">Tools</h2>
        <div className="space-y-3">
          {tools.length === 0 ? (
            <div className="text-center py-20">
              <p className="text-foreground/40 text-lg">No tools yet. Add one above!</p>
            </div>
          ) : (
            tools.map((tool) => (
              <div
                key={tool.id}
                className="glass-card rounded-xl p-5 flex items-center justify-between"
              >
                <div className="flex items-center gap-4 min-w-0">
                  <span className="text-2xl">{tool.icon}</span>
                  <div className="min-w-0">
                    <h3 className="font-semibold text-foreground truncate">
                      {tool.name}
                    </h3>
                    <div className="flex items-center gap-3 mt-0.5">
                      <span className="text-xs text-foreground/40">/{tool.slug}</span>
                      <span className="text-xs text-foreground/40 capitalize">
                        {tool.category}
                      </span>
                      <span className="text-xs text-foreground/40">
                        {tool.downloads.toLocaleString()} downloads
                      </span>
                      <span className="inline-flex items-center gap-1 text-xs text-green-400">
                        <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
                        {tool.safety_score}/100
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0 ml-4">
                  <button
                    onClick={() => handleEdit(tool)}
                    className="px-3 py-1.5 rounded-lg text-xs font-medium glass-card text-foreground/60 hover:text-foreground"
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
            ))
          )}
        </div>
      </div>
    </div>
  );
}
