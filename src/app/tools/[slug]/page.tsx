import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import ToolAccessLinks from "@/components/tools/ToolAccessLinks";
import TrustPanel from "@/components/tools/TrustPanel";
import {
  DEFAULT_OG_IMAGE,
  GOOGLE_ADSENSE_ACCOUNT,
  SITE_NAME,
} from "@/config";
import { getToolBySlug } from "@/server/db";
import type { Tool } from "@/types";

export const dynamic = "force-dynamic";

function toolSummary(tool: Tool): string {
  const short = tool.short_description?.trim();
  if (short) return short;
  const flat = tool.description.trim().replace(/\s+/g, " ");
  return flat.length > 160 ? `${flat.slice(0, 157)}…` : flat;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const tool = (await getToolBySlug(slug)) as Tool | undefined;
  if (!tool) {
    return { title: "Not found" };
  }

  const description = toolSummary(tool);
  const path = `/tools/${slug}`;
  const pageTitle = tool.name;
  const ogTitle = `${tool.name} | ${SITE_NAME}`;

  return {
    title: pageTitle,
    description,
    alternates: { canonical: path },
    openGraph: {
      type: "website",
      url: path,
      siteName: SITE_NAME,
      title: ogTitle,
      description,
      images: [
        {
          ...DEFAULT_OG_IMAGE,
          alt: `${tool.name} — ${SITE_NAME}`,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: ogTitle,
      description,
      images: [
        {
          url: DEFAULT_OG_IMAGE.url,
          alt: `${tool.name} — ${SITE_NAME}`,
          width: DEFAULT_OG_IMAGE.width,
          height: DEFAULT_OG_IMAGE.height,
        },
      ],
    },
    other: {
      "google-adsense-account": GOOGLE_ADSENSE_ACCOUNT,
    },
  };
}

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
  const githubUrl = String(tool.github_url ?? "").trim();
  const categories =
    Array.isArray(tool.categories) && tool.categories.length > 0
      ? tool.categories
      : tool.category
        ? [tool.category]
        : [];

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
          <div className="w-16 h-16 glass-card flex items-center justify-center text-3xl shrink-0">
            {tool.icon}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-3xl md:text-4xl font-bold text-foreground">
                {tool.name}
              </h1>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-none text-xs font-medium bg-accent-lime/10 text-accent-lime border-2 border-accent-lime/35 font-mono uppercase tracking-wide">
                <span className="w-1.5 h-1.5 bg-accent-lime rotate-45 shrink-0" />
                Community tool
              </span>
            </div>
            <p className="text-foreground/50 mt-2">{tool.short_description}</p>
          </div>
        </div>

        {/* Primary action + project link */}
        <div className="mb-10">
          <ToolAccessLinks tool={tool} variant="hero" />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-8">
            {/* Description */}
            <div className="glass-card p-6">
              <h2 className="text-lg font-semibold text-foreground mb-4">
                About this tool
              </h2>
              <p className="text-foreground/60 leading-relaxed whitespace-pre-wrap">
                {tool.description}
              </p>
            </div>

            <TrustPanel tool={tool} />
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Info Card */}
            <div className="glass-card p-6 space-y-4">
              <h3 className="text-sm font-semibold text-foreground/70 uppercase tracking-wider">
                Details
              </h3>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-foreground/50">Categories</span>
                  <div className="flex gap-1.5 flex-wrap justify-end">
                    {categories.map((category) => (
                      <span
                        key={category}
                        className="geo-badge px-2 py-0.5 text-[11px] font-medium bg-accent-amber/10 text-accent-amber tracking-wider font-mono border border-accent-amber/25"
                      >
                        {category}
                      </span>
                    ))}
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-foreground/50">Platform</span>
                  <div className="flex gap-1.5">
                    {platformBadges.map((p) => (
                      <span
                        key={p}
                        className="geo-badge px-2 py-0.5 text-[11px] font-medium bg-white/5 text-foreground/60 uppercase tracking-wider font-mono border border-card-border"
                      >
                        {p}
                      </span>
                    ))}
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-foreground/50">Last reviewed</span>
                  <span className="text-sm text-foreground">
                    {tool.last_reviewed_at
                      ? new Date(tool.last_reviewed_at).toLocaleDateString("en-US", {
                          year: "numeric",
                          month: "short",
                          day: "numeric",
                        })
                      : "Not set"}
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

            {/* Project page */}
            {githubUrl ? (
              <a
                href={githubUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="github-project-card block glass-card p-6 group"
              >
                <div className="flex items-center gap-3 mb-3">
                  <svg
                    className="github-project-card__icon w-5 h-5 text-foreground/60 transition-colors"
                    fill="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
                  </svg>
                  <span className="github-project-card__label text-sm font-semibold text-foreground/70 transition-colors">
                    Project page
                  </span>
                </div>
                <p className="text-xs text-foreground/40">
                  Learn more, ask questions, or get updates from the people who maintain this tool.
                </p>
              </a>
            ) : (
              <div className="glass-card p-6 border border-card-border/80">
                <h3 className="text-sm font-semibold text-foreground/75 mb-2">Public project page unavailable</h3>
                <p className="text-xs text-foreground/45 leading-relaxed">
                  This listing does not currently include a public project link. We still prefer source-linked tools
                  whenever possible and will add one if it becomes available.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
