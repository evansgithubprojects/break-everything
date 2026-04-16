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
        <div className="mb-6">
          <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-2">
            All Tools
          </h1>
          <p className="text-foreground/50">
            Free tools we&apos;ve tried to vet for schoolwork and side projects.
          </p>
        </div>

        {/* Category Filters */}
        <div className="mb-8 flex flex-col gap-3">
          <div className="text-xs sm:text-sm text-foreground/45">
            <span className="font-medium text-foreground/55">Quick tip:</span>{" "}
            bookmark this page for easy access to the library.
          </div>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-2 flex-wrap">
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
            <Link
              id="request-a-tool"
              href="/request-tool"
              className="scroll-mt-36 sm:scroll-mt-28 inline-flex items-center justify-center gap-2 px-3.5 py-2 rounded-none font-semibold text-xs sm:text-sm bg-accent-amber hover:bg-accent-amber/90 text-background border-2 border-accent-steel/40 transition-colors w-full sm:w-auto shrink-0"
            >
              Suggest a tool
            </Link>
          </div>
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
