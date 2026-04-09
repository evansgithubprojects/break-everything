import Link from "next/link";
import { notFound } from "next/navigation";
import SafetyCertificate from "@/components/tools/SafetyCertificate";
import { getToolBySlug } from "@/server/db";
import type { Tool } from "@/types";

export const dynamic = "force-dynamic";

export default async function ToolDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const tool = (await getToolBySlug(slug)) as Tool | undefined;

  if (!tool) {
    notFound();
  }

  const platformBadges = tool.platform.split(",").map((p) => p.trim());

  return (
    <div className="px-6 py-16">
      <div className="mx-auto max-w-4xl">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-2 text-sm text-foreground/40 mb-8">
          <Link href="/" className="hover:text-foreground transition-colors">
            Home
          </Link>
          <span>/</span>
          <Link href="/tools" className="hover:text-foreground transition-colors">
            Tools
          </Link>
          <span>/</span>
          <span className="text-foreground/60">{tool.name}</span>
        </nav>

        {/* Tool Header */}
        <div className="flex items-start gap-5 mb-8">
          <div className="w-16 h-16 rounded-2xl glass-card flex items-center justify-center text-3xl shrink-0">
            {tool.icon}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-3xl md:text-4xl font-bold text-foreground">
                {tool.name}
              </h1>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-500/10 text-green-400 border border-green-500/20">
                <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
                Verified Safe
              </span>
            </div>
            <p className="text-foreground/50 mt-2">{tool.short_description}</p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-3 mb-10">
          <a
            href={tool.download_url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl font-medium text-sm bg-accent-purple hover:bg-accent-purple/90 text-white transition-all hover:scale-105"
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
                d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3"
              />
            </svg>
            Download
          </a>
          <a
            href={tool.github_url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl font-medium text-sm glass-card text-foreground/70 hover:text-foreground"
          >
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
            </svg>
            View Source
          </a>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-8">
            {/* Description */}
            <div className="glass-card rounded-2xl p-6">
              <h2 className="text-lg font-semibold text-foreground mb-4">
                About this tool
              </h2>
              <p className="text-foreground/60 leading-relaxed whitespace-pre-wrap">
                {tool.description}
              </p>
            </div>

            {/* Safety Certificate */}
            <SafetyCertificate tool={tool} />
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Info Card */}
            <div className="glass-card rounded-2xl p-6 space-y-4">
              <h3 className="text-sm font-semibold text-foreground/70 uppercase tracking-wider">
                Details
              </h3>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-foreground/50">Category</span>
                  <span className="text-sm text-foreground capitalize">
                    {tool.category}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-foreground/50">Platform</span>
                  <div className="flex gap-1.5">
                    {platformBadges.map((p) => (
                      <span
                        key={p}
                        className="px-2 py-0.5 rounded-md text-[11px] font-medium bg-white/5 text-foreground/60 uppercase tracking-wider"
                      >
                        {p}
                      </span>
                    ))}
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-foreground/50">Downloads</span>
                  <span className="text-sm text-foreground">
                    {tool.downloads.toLocaleString()}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-foreground/50">Added</span>
                  <span className="text-sm text-foreground/60">
                    {new Date(tool.created_at).toLocaleDateString("en-US", {
                      year: "numeric",
                      month: "short",
                      day: "numeric",
                    })}
                  </span>
                </div>
              </div>
            </div>

            {/* GitHub Card */}
            <a
              href={tool.github_url}
              target="_blank"
              rel="noopener noreferrer"
              className="block glass-card rounded-2xl p-6 group"
            >
              <div className="flex items-center gap-3 mb-3">
                <svg
                  className="w-5 h-5 text-foreground/60 group-hover:text-foreground transition-colors"
                  fill="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
                </svg>
                <span className="text-sm font-semibold text-foreground/70 group-hover:text-foreground transition-colors">
                  View on GitHub
                </span>
              </div>
              <p className="text-xs text-foreground/40">
                Inspect the source code, report issues, or contribute to this tool.
              </p>
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
