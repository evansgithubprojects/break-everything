import type { Metadata } from "next";
import Link from "next/link";
import Script from "next/script";
import ToolCard from "@/components/tools/ToolCard";
import {
  getAllTools,
  getReviewedToolCount,
  getSourceLinkedToolStats,
  getToolCount,
} from "@/server/db";
import { GOOGLE_ADSENSE_ACCOUNT } from "@/config";
import type { Tool } from "@/types";

export const metadata: Metadata = {
  other: {
    "google-adsense-account": GOOGLE_ADSENSE_ACCOUNT,
  },
};

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const tools = (await getAllTools()) as unknown as Tool[];
  const toolCount = await getToolCount();
  const reviewedToolCount = await getReviewedToolCount();
  const { linked: sourceLinkedCount, total: sourceTotal } =
    await getSourceLinkedToolStats();
  const sourceLinkPct =
    sourceTotal === 0 ? 0 : Math.round((sourceLinkedCount / sourceTotal) * 100);

  const featured = tools.slice(0, 6);

  return (
    <div className="relative">
      {/* Hero Section */}
      <section className="relative px-6 pt-12 pb-16 md:pt-16 md:pb-24">
        <div className="mx-auto max-w-6xl text-center">
          <div className="inline-flex items-center gap-2.5 px-4 py-2 rounded-none bg-accent-amber/10 border-2 border-accent-steel/30 mb-6 md:mb-8">
            <span
              className="w-2 h-2 bg-accent-lime shrink-0 rotate-45 border border-accent-amber/40"
              aria-hidden
            />
            <span className="text-xs font-semibold font-mono uppercase tracking-widest text-accent-lime/90">
              Free tools to break software costs
            </span>
          </div>

          <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold tracking-tight mb-6 md:mb-8">
            <span className="gradient-text">Break</span>{" "}
            <span className="text-foreground">Everything</span>
          </h1>
          <p className="mx-auto max-w-2xl text-base md:text-lg text-foreground/60 leading-relaxed mb-10 md:mb-12">
            Break Everything exists to help students break past expensive software costs with free tools that actually do the job.
            We test each pick, explain what it does, and point you to the people behind it.
          </p>

          <div className="flex flex-col items-center gap-4 mb-16">
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4 w-full max-w-md sm:max-w-none">
              <Link
                href="/tools"
                className="w-full sm:w-auto text-center px-6 py-3 rounded-none font-semibold text-sm bg-accent-amber hover:bg-accent-amber/90 text-background transition-all hover:scale-[1.02] border-2 border-accent-steel/40 shadow-[2px_2px_0_rgba(91,143,199,0.35)]"
              >
                Browse Tools
              </Link>
              <a
                href="https://github.com/break-everything/break-everything"
                target="_blank"
                rel="noopener noreferrer"
                className="w-full sm:w-auto text-center px-6 py-3 rounded-none font-medium text-sm glass-card text-foreground/70 hover:text-foreground border-2 border-card-border"
              >
                About this site
              </a>
            </div>
            <Link
              href="/request-tool"
              className="text-sm font-semibold text-accent-amber hover:text-accent-amber/85 underline-offset-4 hover:underline decoration-accent-amber/50"
            >
              Don&apos;t see what you need? Request a tool
            </Link>
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
                {reviewedToolCount}
              </div>
              <div className="text-xs text-foreground/40 mt-1">Reviewed Tools</div>
            </div>
            <div className="text-center">
              <div className="text-2xl md:text-3xl font-bold gradient-text">
                {sourceTotal === 0 ? "—" : `${sourceLinkPct}%`}
              </div>
              <div className="text-xs text-foreground/40 mt-1">
                With a project link
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Trust Pillars */}
      <section className="px-6 pb-20">
        <div className="mx-auto max-w-6xl grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="glass-card p-6 text-center">
            <div className="w-12 h-12 rounded-none bg-accent-amber/12 border-2 border-accent-amber/30 flex items-center justify-center mx-auto mb-4">
              <svg className="w-6 h-6 text-accent-amber" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
              </svg>
            </div>
            <h3 className="font-semibold text-foreground mb-2">Checked before we list</h3>
            <p className="text-sm text-foreground/50">
              We read the basics, try the tool when we can, and link to where it comes from so you can decide if it fits your work.
            </p>
          </div>

          <div className="glass-card p-6 text-center">
            <div className="w-12 h-12 rounded-none bg-accent-steel/12 border-2 border-accent-steel/30 flex items-center justify-center mx-auto mb-4">
              <svg className="w-6 h-6 text-accent-steel" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M17.25 6.75L22.5 12l-5.25 5.25m-10.5 0L1.5 12l5.25-5.25m7.5-3l-4.5 16.5" />
              </svg>
            </div>
            <h3 className="font-semibold text-foreground mb-2">See who made it</h3>
            <p className="text-sm text-foreground/50">
              We prefer tools with a public project page so you can read more, ask questions, or get involved if you want to.
            </p>
          </div>

          <div className="glass-card p-6 text-center">
            <div className="w-12 h-12 rounded-none bg-accent-lime/10 border-2 border-accent-lime/30 flex items-center justify-center mx-auto mb-4">
              <svg className="w-6 h-6 text-accent-lime" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
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
              <div className="flex flex-col items-end gap-2 sm:flex-row sm:items-center sm:gap-4">
                <Link
                  href="/request-tool"
                  className="text-sm font-medium text-foreground/50 hover:text-accent-amber transition-colors"
                >
                  Request a tool
                </Link>
                <Link
                  href="/tools"
                  className="text-sm text-accent-amber hover:text-accent-amber/80 transition-colors font-medium"
                >
                  View all &rarr;
                </Link>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {featured.map((tool) => (
                <ToolCard key={tool.id} tool={tool} />
              ))}
            </div>
          </div>
        </section>
      )}

      <section className="px-6 pb-24">
        <div className="mx-auto max-w-6xl">
          <div className="glass-card p-3">
            <Script
              src="https://pl29162066.profitablecpmratenetwork.com/c1ef9b9d2f016bfd38d6ac41ca7d015f/invoke.js"
              strategy="afterInteractive"
              data-cfasync="false"
            />
            <div id="container-c1ef9b9d2f016bfd38d6ac41ca7d015f" />
          </div>
        </div>
      </section>
    </div>
  );
}
