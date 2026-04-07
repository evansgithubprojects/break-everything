import type { Tool } from "./ToolCard";

export default function SafetyCertificate({ tool }: { tool: Tool }) {
  const scoreColor =
    tool.safety_score >= 90
      ? "text-green-400"
      : tool.safety_score >= 70
        ? "text-yellow-400"
        : "text-red-400";

  const scoreBarColor =
    tool.safety_score >= 90
      ? "bg-green-500"
      : tool.safety_score >= 70
        ? "bg-yellow-500"
        : "bg-red-500";

  return (
    <div className="safety-verified rounded-2xl p-6">
      <div className="flex items-center gap-3 mb-5">
        <div className="w-10 h-10 rounded-xl bg-green-500/10 flex items-center justify-center">
          <svg
            className="w-5 h-5 text-green-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z"
            />
          </svg>
        </div>
        <div>
          <h3 className="text-sm font-semibold text-green-400">
            Code Safety Verification Certificate
          </h3>
          <p className="text-xs text-foreground/40">
            Open Source Verified
          </p>
        </div>
      </div>

      <div className="space-y-4">
        {/* Safety Score */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-xs text-foreground/50 uppercase tracking-wider font-medium">
              Safety Score
            </span>
            <span className={`text-sm font-bold ${scoreColor}`}>
              {tool.safety_score}/100
            </span>
          </div>
          <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full ${scoreBarColor} transition-all`}
              style={{ width: `${tool.safety_score}%` }}
            />
          </div>
        </div>

        {/* SHA-256 Hash */}
        {tool.sha256_hash && (
          <div>
            <span className="text-xs text-foreground/50 uppercase tracking-wider font-medium block mb-1">
              SHA-256 Checksum
            </span>
            <code className="text-xs font-mono text-foreground/70 bg-black/20 px-3 py-2 rounded-lg block break-all">
              {tool.sha256_hash}
            </code>
          </div>
        )}

        {/* Last Scan Date */}
        {tool.last_scan_date && (
          <div className="flex items-center justify-between">
            <span className="text-xs text-foreground/50 uppercase tracking-wider font-medium">
              Last Scanned
            </span>
            <span className="text-xs text-foreground/60">
              {new Date(tool.last_scan_date).toLocaleDateString("en-US", {
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
            </span>
          </div>
        )}

        {/* Badges */}
        <div className="flex flex-wrap gap-2 pt-2">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-green-500/10 text-green-400 border border-green-500/20">
            <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
              <path
                fillRule="evenodd"
                d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                clipRule="evenodd"
              />
            </svg>
            Open Source
          </span>
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-blue-500/10 text-blue-400 border border-blue-500/20">
            <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
              <path
                fillRule="evenodd"
                d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                clipRule="evenodd"
              />
            </svg>
            Malware Free
          </span>
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-purple-500/10 text-purple-400 border border-purple-500/20">
            <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
              <path
                fillRule="evenodd"
                d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                clipRule="evenodd"
              />
            </svg>
            Community Reviewed
          </span>
        </div>
      </div>
    </div>
  );
}
