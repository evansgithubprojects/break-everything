"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import ToolCard from "@/components/tools/ToolCard";
import type { Tool } from "@/types";

export default function ToolsPage() {
  const [tools, setTools] = useState<Tool[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [activeCategory, setActiveCategory] = useState<string>("all");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/tools")
      .then((res) => res.json())
      .then((data) => {
        setTools(data.tools);
        const catsMap = new Map<string, string>();
        for (const tool of data.tools as Tool[]) {
          const entries =
            Array.isArray(tool.categories) && tool.categories.length > 0
              ? tool.categories
              : tool.category
                ? [tool.category]
                : [];
          for (const entry of entries) {
            const label = String(entry ?? "").trim();
            if (!label) continue;
            const key = label.toLowerCase();
            if (!catsMap.has(key)) {
              catsMap.set(key, label);
            }
          }
        }
        const cats = Array.from(catsMap.values());
        setCategories(cats);
        setLoading(false);
      });
  }, []);

  const filtered =
    activeCategory === "all"
      ? tools
      : tools.filter((t) => {
          const values =
            Array.isArray(t.categories) && t.categories.length > 0
              ? t.categories
              : t.category
                ? [t.category]
                : [];
          return values.some((value) => value.trim().toLowerCase() === activeCategory.toLowerCase());
        });

  return (
    <div className="px-6 py-16">
      <div className="mx-auto max-w-6xl">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-2">
            All Tools
          </h1>
          <p className="text-foreground/50">
            Free tools we&apos;ve tried to vet for schoolwork and side projects.
          </p>
        </div>

        {/* Request a tool — anchor target for /tools#request-a-tool */}
        <section
          id="request-a-tool"
          className="scroll-mt-36 sm:scroll-mt-28 mb-10 rounded-none border-2 border-accent-amber/40 bg-gradient-to-br from-accent-amber/[0.08] to-transparent p-5 sm:p-6"
        >
          <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <div className="min-w-0">
              <p className="text-xs font-mono font-semibold uppercase tracking-widest text-accent-lime/90 mb-2">
                Community
              </p>
              <h2 className="text-xl sm:text-2xl font-bold text-foreground">
                Missing a tool? Suggest one.
              </h2>
              <p className="text-sm text-foreground/55 mt-2 max-w-2xl">
                We route suggestions through a short confirmation page first so you can see where the link goes before leaving this site.
              </p>
            </div>
            <Link
              href="/request-tool"
              className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-none font-semibold text-sm bg-accent-amber hover:bg-accent-amber/90 text-background border-2 border-accent-steel/40 shadow-[2px_2px_0_rgba(91,143,199,0.35)] transition-all hover:scale-[1.02] w-full sm:w-auto"
            >
              Continue to request form
            </Link>
          </div>
        </section>

        {/* Category Filters */}
        <div className="flex items-center gap-2 mb-8 flex-wrap">
          <button
            onClick={() => setActiveCategory("all")}
            className={`px-4 py-2 rounded-none text-sm font-medium border-2 transition-colors ${
              activeCategory === "all"
                ? "bg-accent-amber/15 text-accent-amber border-accent-amber/40"
                : "border-card-border text-foreground/60 hover:text-foreground hover:border-accent-steel/35 bg-white/[0.03]"
            }`}
          >
            All
          </button>
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`px-4 py-2 rounded-none text-sm font-medium border-2 transition-colors ${
                activeCategory === cat
                  ? "bg-accent-amber/15 text-accent-amber border-accent-amber/40"
                  : "border-card-border text-foreground/60 hover:text-foreground hover:border-accent-steel/35 bg-white/[0.03]"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Tools Grid */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="glass-card p-6 h-48 animate-pulse"
              />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-foreground/40 text-lg">No tools found in this category.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filtered.map((tool) => (
              <ToolCard key={tool.id} tool={tool} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
