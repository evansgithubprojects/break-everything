import { notFound } from "next/navigation";
import { getToolBySlug } from "@/server/db";
import { isAllowedEmbedUrl, parseCsvDomains } from "@/server/validation";
import type { Tool } from "@/types";

export const dynamic = "force-dynamic";

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
        <div className="glass-card rounded-xl p-4 text-sm text-foreground/60">
          This embedded tool runs in a sandbox with {tool.sandbox_level} restrictions.
        </div>
        <div className="rounded-2xl overflow-hidden border border-card-border">
          <iframe
            src={targetUrl}
            title={`${tool.name} embedded`}
            className="w-full min-h-[75vh] bg-black"
            sandbox="allow-forms allow-modals allow-popups allow-popups-to-escape-sandbox allow-scripts"
            referrerPolicy="strict-origin-when-cross-origin"
          />
        </div>
      </div>
    </div>
  );
}
