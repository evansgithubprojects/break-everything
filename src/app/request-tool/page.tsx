import type { Metadata } from "next";
import Link from "next/link";
import { TOOL_REQUEST_FORM_URL } from "@/config";

export const metadata: Metadata = {
  title: "Continue to request form",
  robots: {
    index: false,
    follow: true,
  },
};

export default function RequestToolRedirectPage() {
  const jiraHost = new URL(TOOL_REQUEST_FORM_URL).host;

  return (
    <div className="px-6 py-16">
      <div className="mx-auto max-w-2xl">
        <div className="glass-card p-8 sm:p-10 border-2 border-accent-steel/35">
          <p className="text-xs font-mono font-semibold uppercase tracking-widest text-accent-lime/90 mb-3">
            External form
          </p>
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground mb-3">
            You&apos;re leaving Break Everything
          </h1>
          <p className="text-sm sm:text-base text-foreground/60 leading-relaxed">
            Tool requests are handled in Jira so we can track suggestions and follow-ups. Click continue to open
            the request form on <span className="text-foreground/80">{jiraHost}</span>.
          </p>

          <div className="mt-7 flex flex-col sm:flex-row gap-3">
            <a
              href={TOOL_REQUEST_FORM_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-none font-semibold text-sm bg-accent-amber hover:bg-accent-amber/90 text-background border-2 border-accent-steel/40 shadow-[2px_2px_0_rgba(91,143,199,0.35)] transition-all hover:scale-[1.02]"
            >
              Continue to Jira form
            </a>
            <Link
              href="/tools#request-a-tool"
              className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-none font-medium text-sm glass-card text-foreground/70 hover:text-foreground border-2 border-card-border"
            >
              Go back
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
