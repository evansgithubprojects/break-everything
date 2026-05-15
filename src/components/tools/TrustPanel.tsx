import { SITE_NAME, SITE_TAGLINE } from "@/config";
import type { Tool } from "@/types";

export default function TrustPanel({ tool }: { tool: Tool }) {
  const isBrowserRuntime = tool.delivery_mode === "browserRuntime";
  const reviewDate = tool.last_reviewed_at
    ? new Date(tool.last_reviewed_at).toLocaleDateString("en-US")
    : "Not reviewed yet";

  const vendorDisplay = isBrowserRuntime ? SITE_NAME : tool.vendor || "Unknown";
  const privacyDisplay = isBrowserRuntime
    ? `${SITE_NAME} runs this tool in your browser on our domain. ${SITE_TAGLINE}`
    : tool.privacy_summary || "No privacy summary provided.";

  return (
    <div className="glass-card p-6 space-y-3">
      <h3 className="text-sm font-semibold text-foreground/70 uppercase tracking-wider">
        Transparency
      </h3>
      <p className="text-sm text-foreground/55">
        {isBrowserRuntime
          ? `${SITE_NAME} lists browser runtime tools we host ourselves so you know where the experience runs.`
          : "Break Everything strongly prefers source-linked tools and shows what we checked, so you can break software costs without guessing what is behind the listing."}
      </p>
      <div className="text-sm text-foreground/60 space-y-2">
        <p>
          <span className="text-foreground/45">Vendor:</span> {vendorDisplay}
        </p>
        <p>
          <span className="text-foreground/45">Data handling:</span> {tool.data_handling}
        </p>
        <p>
          <span className="text-foreground/45">Privacy:</span> {privacyDisplay}
        </p>
        <p>
          <span className="text-foreground/45">Last reviewed:</span> {reviewDate}
        </p>
      </div>
    </div>
  );
}
