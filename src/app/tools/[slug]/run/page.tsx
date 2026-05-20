import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import ToolRuntimeHost from "@/components/runtime/ToolRuntimeHost";
import { DEFAULT_OG_IMAGE, GOOGLE_ADSENSE_ACCOUNT, SITE_NAME } from "@/config";
import { getToolBySlug } from "@/server/db";
import { resolveRuntimeRollout } from "@/server/runtime-rollout";
import type { Tool } from "@/types";

export const dynamic = "force-dynamic";

function runtimeUnavailableMetadata(tool: Tool, slug: string): Metadata {
  const title = `${tool.name} — try online coming soon`;
  const description = `The browser version of ${tool.name} is not available yet. Check back later on ${SITE_NAME}.`;
  const path = `/tools/${slug}/run`;
  const ogTitle = `${tool.name} | ${SITE_NAME}`;

  return {
    title,
    description,
    alternates: { canonical: path },
    robots: { index: false, follow: true },
    openGraph: {
      type: "website",
      url: path,
      siteName: SITE_NAME,
      title: ogTitle,
      description,
      images: [{ ...DEFAULT_OG_IMAGE, alt: `${tool.name} — ${SITE_NAME}` }],
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
  };
}

function RuntimeUnavailablePage({ tool }: { tool: Tool }) {
  return (
    <div className="px-6 py-16">
      <div className="mx-auto max-w-3xl">
        <div className="glass-card relative overflow-hidden p-8 md:p-10 space-y-6">
          <div
            aria-hidden
            className="absolute inset-0 bg-cover bg-center mb-0"
            style={{ backgroundImage: "url('/construction_tape.webp')" }}
          />
          <div className="absolute inset-0 bg-background/70 mb-0" aria-hidden />

          <div className="relative inline-flex items-center gap-2 px-3 py-1.5 border border-accent-amber/30 bg-accent-amber/10 text-accent-amber text-xs font-semibold uppercase tracking-wider">
            Try online
          </div>

          <div className="relative space-y-3">
            <h1 className="text-3xl md:text-4xl font-bold text-foreground">
              {tool.name} is currently unavailable.
            </h1>
            <p className="text-foreground/60 leading-relaxed">
              We apologize for the inconvenience. Bookmark this page and check back later.
            </p>
          </div>

          <div className="relative flex flex-wrap gap-3">
            <Link
              href={`/tools/${tool.slug}`}
              className="inline-flex items-center justify-center px-5 py-2.5 rounded-none bg-accent-amber text-background font-semibold text-sm hover:bg-accent-amber/90 transition-colors"
            >
              Back to tool details
            </Link>
            <Link
              href="/tools"
              className="inline-flex items-center justify-center px-5 py-2.5 rounded-none border border-card-border text-foreground/70 font-semibold text-sm hover:text-foreground hover:border-accent-steel/40 transition-colors"
            >
              Browse all tools
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const tool = (await getToolBySlug(slug)) as Tool | undefined;
  if (!tool) return { title: "Not found" };

  if (!Number(tool.runtime_supported)) {
    return runtimeUnavailableMetadata(tool, slug);
  }

  const rollout = resolveRuntimeRollout(tool);
  if (!rollout.enabled) {
    return { title: "Not found", robots: { index: false, follow: false } };
  }

  const title = `${tool.name} — try online`;
  const description = `Try ${tool.name} in your browser on ${SITE_NAME}.`;
  const path = `/tools/${slug}/run`;
  const ogTitle = `${tool.name} | ${SITE_NAME}`;

  return {
    title,
    description,
    alternates: { canonical: path },
    robots: { index: false, follow: true },
    openGraph: {
      type: "website",
      url: path,
      siteName: SITE_NAME,
      title: ogTitle,
      description,
      images: [{ ...DEFAULT_OG_IMAGE, alt: `${tool.name} — ${SITE_NAME}` }],
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

export default async function ToolRuntimePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const tool = (await getToolBySlug(slug)) as Tool | undefined;
  if (!tool) notFound();

  if (!Number(tool.runtime_supported)) {
    return <RuntimeUnavailablePage tool={tool} />;
  }

  const rollout = resolveRuntimeRollout(tool);
  if (!rollout.enabled) notFound();

  return (
    <div className="px-6 py-8">
      <div className="mx-auto max-w-6xl space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-2xl font-bold text-foreground">{tool.name} — try online</h1>
          <Link href={`/tools/${tool.slug}`} className="text-sm text-accent-steel hover:underline">
            Back to tool details
          </Link>
        </div>
        <ToolRuntimeHost tool={tool} />
      </div>
    </div>
  );
}
