import Link from "next/link";
import type { Tool, ToolKind } from "@/types";
import ToolAccessLinks from "./ToolAccessLinks";

function kindBadge(k: ToolKind) {
  if (k === "web") {
    return (
      <span className="geo-badge px-2 py-0.5 text-[10px] font-medium bg-sky-500/15 text-sky-300 border-2 border-sky-500/30 uppercase tracking-wider font-mono">
        Web
      </span>
    );
  }
  return (
    <span className="geo-badge px-2 py-0.5 text-[10px] font-medium bg-violet-500/15 text-violet-300 border-2 border-violet-500/30 uppercase tracking-wider font-mono">
      Download
    </span>
  );
}

export default function ToolCard({ tool }: { tool: Tool }) {
  const platformBadges = tool.platform.split(",").map((p) => p.trim());
  const k: ToolKind = tool.tool_kind === "web" ? "web" : "download";

  return (
    <div className="glass-card p-6 h-full flex flex-col group hover:border-accent-amber/20 transition-colors">
      <div className="flex items-start justify-between mb-4">
        <span className="text-3xl">{tool.icon}</span>
        <div className="shrink-0">{kindBadge(k)}</div>
      </div>

      <Link
        href={`/tools/${tool.slug}`}
        className="block shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-amber/50 focus-visible:ring-offset-2 focus-visible:ring-offset-background"
      >
        <h3 className="text-lg font-semibold text-foreground group-hover:text-accent-amber transition-colors mb-1">
          {tool.name}
        </h3>
        <p className="text-sm text-foreground/50 mb-4 line-clamp-3">{tool.short_description}</p>
      </Link>

      {/* Absorb extra card height without stretching the detail link hit-area (mobile touch). */}
      <div className="flex-1 min-h-0 min-w-0" aria-hidden />

      <div className="flex items-center justify-between mb-4">
        <div className="flex gap-1.5 flex-wrap">
          {platformBadges.map((p) => (
            <span
              key={p}
              className="geo-badge px-2 py-0.5 text-[11px] font-medium bg-white/5 text-foreground/50 uppercase tracking-wider font-mono"
            >
              {p}
            </span>
          ))}
        </div>
        <span className="geo-badge px-2.5 py-0.5 text-[11px] font-medium bg-accent-amber/10 text-accent-amber capitalize shrink-0 border border-accent-amber/25">
          {tool.category}
        </span>
      </div>

      <div className="relative z-10 pt-3 border-t border-card-border">
        <ToolAccessLinks tool={tool} variant="card" />
      </div>
    </div>
  );
}
