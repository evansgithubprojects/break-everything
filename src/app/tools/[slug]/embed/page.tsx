import type { Metadata } from "next";
import { notFound } from "next/navigation";
import {
  DEFAULT_OG_IMAGE,
  SITE_NAME,
} from "@/lib/site-metadata";
import { getToolBySlug } from "@/server/db";
import { isAllowedEmbedUrl, parseCsvDomains } from "@/server/validation";
import type { Tool } from "@/types";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const tool = (await getToolBySlug(slug)) as Tool | undefined;
  if (!tool) return { title: "Not found" };

  const targetUrl = tool.embed_url || tool.web_url;
  const trusted = parseCsvDomains(tool.trusted_domains);
  const valid = Boolean(tool.embed_allowed) && isAllowedEmbedUrl(targetUrl, trusted);
  if (!valid) return { title: "Not found", robots: { index: false, follow: false } };

  const title = `${tool.name} — use on this page`;
  const description = `Use ${tool.name} right here on ${SITE_NAME}.`;
  const path = `/tools/${slug}/embed`;
  const ogTitle = `${tool.name} | ${SITE_NAME}`;

  return {
    title,
    description,
    alternates: { canonical: path },
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

export default async function ToolEmbedPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const tool = (await getToolBySlug(slug)) as Tool | undefined;
  if (!tool) notFound();

  const targetUrl = tool.embed_url || tool.web_url;
  const trusted = parseCsvDomains(tool.trusted_domains);
  const valid = Boolean(tool.embed_allowed) && isAllowedEmbedUrl(targetUrl, trusted);
  if (!valid) notFound();

  return (
    <div className="px-6 py-10">
      <div className="mx-auto max-w-6xl space-y-4">
        <div className="glass-card p-4 text-sm text-foreground/60">
          This view runs the tool in a limited, safer browser frame ({tool.sandbox_level} restrictions).
        </div>
        <div className="rounded-none overflow-hidden border-2 border-card-border">
          <iframe
            src={targetUrl}
            title={`${tool.name} — in-page view`}
            className="w-full min-h-[75vh] bg-black"
            sandbox="allow-forms allow-modals allow-popups allow-popups-to-escape-sandbox allow-scripts"
            referrerPolicy="strict-origin-when-cross-origin"
          />
        </div>
      </div>
    </div>
  );
}
