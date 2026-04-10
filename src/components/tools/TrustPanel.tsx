import type { Tool } from "@/types";

export default function TrustPanel({ tool }: { tool: Tool }) {
  const reviewDate = tool.last_reviewed_at
    ? new Date(tool.last_reviewed_at).toLocaleDateString("en-US")
    : "Not reviewed yet";

  return (
    <div className="glass-card rounded-2xl p-6 space-y-3">
      <h3 className="text-sm font-semibold text-foreground/70 uppercase tracking-wider">
        Why this is safer
      </h3>
      <p className="text-sm text-foreground/55">
        Browser-first access reduces executable downloads and makes trust signals visible before use.
      </p>
      <div className="text-sm text-foreground/60 space-y-2">
        <p>
          <span className="text-foreground/45">Vendor:</span> {tool.vendor || "Unknown"}
        </p>
        <p>
          <span className="text-foreground/45">Data handling:</span> {tool.data_handling}
        </p>
        <p>
          <span className="text-foreground/45">Privacy:</span>{" "}
          {tool.privacy_summary || "No privacy summary provided."}
        </p>
        <p>
          <span className="text-foreground/45">Last reviewed:</span> {reviewDate}
        </p>
      </div>
    </div>
  );
}
