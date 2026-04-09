import Link from "next/link";
import type { Tool } from "@/types";

export default function ToolCard({ tool }: { tool: Tool }) {
  const platformBadges = tool.platform.split(",").map((p) => p.trim());

  return (
    <Link href={`/tools/${tool.slug}`} className="block group">
      <div className="glass-card rounded-2xl p-6 h-full flex flex-col">
        <div className="flex items-start justify-between mb-4">
          <span className="text-3xl">{tool.icon}</span>
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-green-500" />
            <span className="text-xs text-green-400 font-medium">Verified</span>
          </div>
        </div>

        <h3 className="text-lg font-semibold text-foreground group-hover:text-accent-purple transition-colors mb-1">
          {tool.name}
        </h3>

        <p className="text-sm text-foreground/50 flex-1 mb-4">
          {tool.short_description}
        </p>

        <div className="flex items-center justify-between">
          <div className="flex gap-1.5">
            {platformBadges.map((p) => (
              <span
                key={p}
                className="px-2 py-0.5 rounded-md text-[11px] font-medium bg-white/5 text-foreground/50 uppercase tracking-wider"
              >
                {p}
              </span>
            ))}
          </div>
          <span className="px-2.5 py-0.5 rounded-md text-[11px] font-medium bg-accent-purple/10 text-accent-purple capitalize">
            {tool.category}
          </span>
        </div>
      </div>
    </Link>
  );
}
