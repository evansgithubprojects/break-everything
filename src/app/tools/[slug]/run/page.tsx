import Link from "next/link";
import { notFound } from "next/navigation";
import { getToolBySlug } from "@/server/db";
import type { Tool } from "@/types";

export const dynamic = "force-dynamic";

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
        <h1 className="text-2xl font-bold text-foreground mb-3">{tool.name} runtime beta</h1>
        <p className="text-foreground/55 mb-4">
          This tool is configured for browser runtime execution. The current beta intentionally limits
          network access and persists data to session-only browser storage.
        </p>
        <div className="rounded-none border border-card-border bg-white/5 p-4 mb-6">
          <p className="text-sm text-foreground/60">Runtime entrypoint</p>
          <p className="font-mono text-xs text-foreground/75 mt-1">
            {tool.runtime_entrypoint || "not configured"}
          </p>
        </div>
        <p className="text-sm text-foreground/45 mb-6">
          Runtime execution host wiring (WASM/WebContainer/Pyodide) is intentionally feature-flagged and
          can be attached to this route as providers are vetted.
        </p>
        <Link href={`/tools/${tool.slug}`} className="text-sm text-accent-blue hover:underline">
          Back to tool details
        </Link>
      </div>
    </div>
  );
}
