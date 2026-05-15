import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import ToolRuntimeHost from "@/components/runtime/ToolRuntimeHost";
import { DEFAULT_OG_IMAGE, GOOGLE_ADSENSE_ACCOUNT, SITE_NAME } from "@/config";
import { getToolBySlug } from "@/server/db";
import { resolveRuntimeRollout } from "@/server/runtime-rollout";
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
