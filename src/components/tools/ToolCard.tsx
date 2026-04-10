import Link from "next/link";
import type { Tool, ToolKind } from "@/types";
import ToolAccessLinks from "./ToolAccessLinks";
import { resolvePrimaryAction } from "./delivery";

function kindBadge(k: ToolKind) {
  if (k === "web") {
    return (
      <span className="px-2 py-0.5 rounded-md text-[10px] font-medium bg-sky-500/15 text-sky-300 border border-sky-500/25 uppercase tracking-wider">
        Web
      </span>
    );
  }
  return (
    <span className="px-2 py-0.5 rounded-md text-[10px] font-medium bg-violet-500/15 text-violet-300 border border-violet-500/25 uppercase tracking-wider">
      Download
    </span>
  );
}

export default function ToolCard({ tool }: { tool: Tool }) {
  const platformBadges = tool.platform.split(",").map((p) => p.trim());
  const k: ToolKind = tool.tool_kind === "web" ? "web" : "download";
  const action = resolvePrimaryAction(tool);

  return (
    <div className="glass-card rounded-2xl p-6 h-full flex flex-col group hover:border-accent-purple/20 transition-colors">
      <div className="flex items-start justify-between mb-4">
        <span className="text-3xl">{tool.icon}</span>
        <div className="flex flex-col items-end gap-1.5">
          {kindBadge(k)}
          <span className="px-2 py-0.5 rounded-md text-[10px] font-medium bg-foreground/5 text-foreground/50 border border-card-border uppercase tracking-wider">
            {action.type}
          </span>
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-green-500" />
            <span className="text-xs text-green-400 font-medium">Verified</span>
          </div>
        </div>
      </div>

      <Link href={`/tools/${tool.slug}`} className="block flex-1 min-h-0">
        <h3 className="text-lg font-semibold text-foreground group-hover:text-accent-purple transition-colors mb-1">
          {tool.name}
        </h3>
        <p className="text-sm text-foreground/50 mb-4 line-clamp-3">{tool.short_description}</p>
      </Link>

      <div className="flex items-center justify-between mb-4">
        <div className="flex gap-1.5 flex-wrap">
          {platformBadges.map((p) => (
            <span
              key={p}
              className="px-2 py-0.5 rounded-md text-[11px] font-medium bg-white/5 text-foreground/50 uppercase tracking-wider"
            >
              {p}
            </span>
          ))}
        </div>
        <span className="px-2.5 py-0.5 rounded-md text-[11px] font-medium bg-accent-purple/10 text-accent-purple capitalize shrink-0">
          {tool.category}
        </span>
      </div>

      <div className="pt-3 border-t border-card-border">
        <ToolAccessLinks tool={tool} variant="card" />
      </div>
    </div>
  );
}
