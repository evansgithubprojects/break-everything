"use client";

import { useState } from "react";

export default function RequestToolForm() {
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");

  const [form, setForm] = useState({
    tool_name: "",
    description: "",
    submitted_by: "",
    link: "",
  });

  function handleChange(
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError("");

    try {
      const res = await fetch("/api/requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Failed to submit request");
        setSubmitting(false);
        return;
      }

      setSubmitted(true);
      setSubmitting(false);
      setForm({ tool_name: "", description: "", submitted_by: "", link: "" });
    } catch {
      setError("Network error. Please try again.");
      setSubmitting(false);
    }
  }

  function handleClose() {
    setOpen(false);
    setSubmitted(false);
    setError("");
  }

  const inputClass =
    "w-full px-4 py-2.5 rounded-xl bg-white/5 border border-card-border text-foreground text-sm placeholder:text-foreground/30 focus:outline-none focus:border-accent-purple/50 focus:ring-1 focus:ring-accent-purple/30 transition-colors";

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl font-medium text-sm glass-card text-foreground/70 hover:text-foreground gradient-border"
      >
        <svg
          className="w-4 h-4"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M12 18v-5.25m0 0a6.01 6.01 0 001.5-.189m-1.5.189a6.01 6.01 0 01-1.5-.189m3.75 7.478a12.06 12.06 0 01-4.5 0m3.75 2.383a14.406 14.406 0 01-3 0M14.25 18v-.192c0-.983.658-1.823 1.508-2.316a7.5 7.5 0 10-7.517 0c.85.493 1.509 1.333 1.509 2.316V18"
          />
        </svg>
        Request a Tool
      </button>
    );
  }

  return (
    <div className="glass-card rounded-2xl p-6 glow-purple">
      <div className="flex items-center justify-between mb-5">
        <h3 className="text-lg font-semibold text-foreground">
          Request a Tool
        </h3>
        <button
          onClick={handleClose}
          className="text-foreground/40 hover:text-foreground transition-colors"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {submitted ? (
        <div className="text-center py-6">
          <div className="w-12 h-12 rounded-full bg-green-500/10 flex items-center justify-center mx-auto mb-4">
            <svg className="w-6 h-6 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
            </svg>
          </div>
          <h4 className="font-semibold text-foreground mb-1">Request Submitted!</h4>
          <p className="text-sm text-foreground/50">
            Thanks for the suggestion. We&apos;ll review it and see if we can add it.
          </p>
          <button
            onClick={handleClose}
            className="mt-4 px-5 py-2 rounded-xl text-sm font-medium glass-card text-foreground/60 hover:text-foreground"
          >
            Close
          </button>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <p className="text-sm text-foreground/40 -mt-2 mb-2">
            Know a free tool that should be here, or want us to build one? Let us know!
          </p>

          {error && (
            <div className="px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
              {error}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-foreground/70 mb-1.5">
              Tool Name <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              name="tool_name"
              value={form.tool_name}
              onChange={handleChange}
              placeholder="e.g. ImageMagick, OBS Studio..."
              className={inputClass}
              required
              maxLength={100}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground/70 mb-1.5">
              What does it do? <span className="text-red-400">*</span>
            </label>
            <textarea
              name="description"
              value={form.description}
              onChange={handleChange}
              placeholder="Briefly describe the tool and why it'd be useful for students..."
              className={`${inputClass} h-24 resize-y`}
              required
              maxLength={1000}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-foreground/70 mb-1.5">
                Your Name <span className="text-foreground/30">(optional)</span>
              </label>
              <input
                type="text"
                name="submitted_by"
                value={form.submitted_by}
                onChange={handleChange}
                placeholder="Anonymous"
                className={inputClass}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground/70 mb-1.5">
                Link <span className="text-foreground/30">(optional)</span>
              </label>
              <input
                type="url"
                name="link"
                value={form.link}
                onChange={handleChange}
                placeholder="https://github.com/..."
                className={inputClass}
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full px-6 py-2.5 rounded-xl font-medium text-sm bg-accent-purple hover:bg-accent-purple/90 text-white transition-all disabled:opacity-50"
          >
            {submitting ? "Submitting..." : "Submit Request"}
          </button>
        </form>
      )}
    </div>
  );
}
