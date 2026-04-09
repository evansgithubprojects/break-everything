import Link from "next/link";
import ToolCard from "@/components/tools/ToolCard";
import { getAllTools, getToolCount, getTotalDownloads } from "@/server/db";
import type { Tool } from "@/components/tools/ToolCard";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const tools = (await getAllTools()) as Tool[];
  const toolCount = await getToolCount();
  const totalDownloads = await getTotalDownloads();

  const featured = tools.slice(0, 6);

  return (
    <div className="relative">
      {/* Hero Section */}
      <section className="relative px-6 pt-20 pb-24 md:pt-32 md:pb-36">
        <div className="mx-auto max-w-6xl text-center">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-accent-purple/10 border border-accent-purple/20 mb-8">
            <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
            <span className="text-xs font-medium text-accent-purple">
              100% Free &amp; Open Source
            </span>
          </div>

          <h1 className="text-5xl md:text-7xl font-bold tracking-tight mb-6">
            <span className="gradient-text">Break</span>{" "}
            <span className="text-foreground">Everything</span>
          </h1>

          <p className="text-lg md:text-xl text-foreground/50 max-w-2xl mx-auto mb-10 leading-relaxed">
            Free tools for broke college students. PDF editors, file converters,
            and utilities — all open-source, safety-verified, and downloadable
            as exe/app files.
          </p>

          <div className="flex items-center justify-center gap-4 mb-16">
            <Link
              href="/tools"
              className="px-6 py-3 rounded-xl font-medium text-sm bg-accent-purple hover:bg-accent-purple/90 text-white transition-all hover:scale-105"
            >
              Browse Tools
            </Link>
            <a
              href="https://github.com"
              target="_blank"
              rel="noopener noreferrer"
              className="px-6 py-3 rounded-xl font-medium text-sm glass-card text-foreground/70 hover:text-foreground"
            >
              View on GitHub
            </a>
          </div>

          {/* Trust Stats */}
          <div className="grid grid-cols-3 gap-6 max-w-lg mx-auto">
            <div className="text-center">
              <div className="text-2xl md:text-3xl font-bold gradient-text">
                {toolCount}
              </div>
              <div className="text-xs text-foreground/40 mt-1">Free Tools</div>
            </div>
            <div className="text-center">
              <div className="text-2xl md:text-3xl font-bold gradient-text">
                {totalDownloads.toLocaleString()}
              </div>
              <div className="text-xs text-foreground/40 mt-1">Downloads</div>
            </div>
            <div className="text-center">
              <div className="text-2xl md:text-3xl font-bold gradient-text">
                100%
              </div>
              <div className="text-xs text-foreground/40 mt-1">Open Source</div>
            </div>
          </div>
        </div>
      </section>

      {/* Trust Pillars */}
      <section className="px-6 pb-20">
        <div className="mx-auto max-w-6xl grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="glass-card rounded-2xl p-6 text-center">
            <div className="w-12 h-12 rounded-xl bg-green-500/10 flex items-center justify-center mx-auto mb-4">
              <svg className="w-6 h-6 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
              </svg>
            </div>
            <h3 className="font-semibold text-foreground mb-2">Safety Verified</h3>
            <p className="text-sm text-foreground/50">
              Every tool comes with SHA-256 checksums, safety scans, and a verification certificate you can inspect.
            </p>
          </div>

          <div className="glass-card rounded-2xl p-6 text-center">
            <div className="w-12 h-12 rounded-xl bg-blue-500/10 flex items-center justify-center mx-auto mb-4">
              <svg className="w-6 h-6 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M17.25 6.75L22.5 12l-5.25 5.25m-10.5 0L1.5 12l5.25-5.25m7.5-3l-4.5 16.5" />
              </svg>
            </div>
            <h3 className="font-semibold text-foreground mb-2">Fully Open Source</h3>
            <p className="text-sm text-foreground/50">
              Every tool links directly to its GitHub repository. Read the code, fork it, contribute — full transparency.
            </p>
          </div>

          <div className="glass-card rounded-2xl p-6 text-center">
            <div className="w-12 h-12 rounded-xl bg-purple-500/10 flex items-center justify-center mx-auto mb-4">
              <svg className="w-6 h-6 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h3 className="font-semibold text-foreground mb-2">Always Free</h3>
            <p className="text-sm text-foreground/50">
              No trials, no freemium, no subscriptions. Built by students who know what it&apos;s like to be broke.
            </p>
          </div>
        </div>
      </section>

      {/* Featured Tools */}
      {featured.length > 0 && (
        <section className="px-6 pb-24">
          <div className="mx-auto max-w-6xl">
            <div className="flex items-end justify-between mb-8">
              <div>
                <h2 className="text-2xl md:text-3xl font-bold text-foreground">
                  Featured Tools
                </h2>
                <p className="text-sm text-foreground/40 mt-1">
                  The most popular picks from the community
                </p>
              </div>
              <Link
                href="/tools"
                className="text-sm text-accent-purple hover:text-accent-purple/80 transition-colors font-medium"
              >
                View all &rarr;
              </Link>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {featured.map((tool) => (
                <ToolCard key={tool.id} tool={tool} />
              ))}
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
