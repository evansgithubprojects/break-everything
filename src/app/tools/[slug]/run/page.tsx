import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  DEFAULT_OG_IMAGE,
  SITE_NAME,
} from "@/lib/site-metadata";
import { getToolBySlug } from "@/server/db";
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

  const runtimeEnabled = process.env.NEXT_PUBLIC_RUNTIME_BETA === "1";
  if (!runtimeEnabled || !tool.runtime_supported) {
    return { title: "Not found", robots: { index: false, follow: false } };
  }

  const title = `${tool.name} — try online (beta)`;
  const description = `Try ${tool.name} in your browser (beta) on ${SITE_NAME}.`;
  const path = `/tools/${slug}/run`;
  const ogTitle = `${tool.name} (beta) | ${SITE_NAME}`;

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

export default async function ToolRuntimePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const tool = (await getToolBySlug(slug)) as Tool | undefined;
  if (!tool) notFound();
  const runtimeEnabled = process.env.NEXT_PUBLIC_RUNTIME_BETA === "1";
  if (!runtimeEnabled || !tool.runtime_supported) notFound();

  return (
    <div className="px-6 py-16">
      <div className="mx-auto max-w-3xl glass-card p-8">
        <h1 className="text-2xl font-bold text-foreground mb-3">{tool.name} — try online (beta)</h1>
        <p className="text-foreground/55 mb-4">
          This experimental view runs the tool inside your browser. For now it limits networking and only
          keeps data for this browsing session — don&apos;t rely on it for anything you need to save.
        </p>
        <div className="rounded-none border border-card-border bg-white/5 p-4 mb-6">
          <p className="text-sm text-foreground/60">Technical entry path</p>
          <p className="font-mono text-xs text-foreground/75 mt-1">
            {tool.runtime_entrypoint || "not configured"}
          </p>
        </div>
        <p className="text-sm text-foreground/45 mb-6">
          Full in-browser run support is still being rolled out carefully. This page is a placeholder until
          that work ships.
        </p>
        <Link href={`/tools/${tool.slug}`} className="text-sm text-accent-steel hover:underline">
          Back to tool details
        </Link>
      </div>
    </div>
  );
}
