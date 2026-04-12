"use client";

import { useCallback, useState, type MouseEvent } from "react";
import type { Tool } from "@/types";
import { trackToolActionClick } from "@/analytics";

function isolateActionInteraction(e: { stopPropagation: () => void }) {
  e.stopPropagation();
}

const shareIcon = (
  <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden>
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M7.217 10.907a2.25 2.25 0 100 2.186m0-2.186c.18.324.283.696.283 1.093s-.103.77-.283 1.093m0-2.186l9.566-5.314m-9.566 7.5l9.566 5.314m0 0a2.25 2.25 0 103.935 2.186 2.25 2.25 0 00-3.935-2.186zm0-12.814a2.25 2.25 0 103.935-2.186 2.25 2.25 0 00-3.935 2.186z"
    />
  </svg>
);

export default function ToolShareLink({
  tool,
  className,
  shortLabel,
}: {
  tool: Pick<Tool, "slug" | "name">;
  className: string;
  /** Card row: shorter button text */
  shortLabel?: boolean;
}) {
  const [status, setStatus] = useState<"idle" | "copied" | "error">("idle");

  const defaultLabel = shortLabel ? "Share" : "Share link";
  const label =
    status === "copied" ? (shortLabel ? "Copied" : "Copied!") : status === "error" ? "Try again" : defaultLabel;

  const shareUrl = useCallback(() => {
    if (typeof window === "undefined") return "";
    return `${window.location.origin}/tools/${encodeURIComponent(tool.slug)}`;
  }, [tool.slug]);

  const onClick = useCallback(
    async (e: MouseEvent<HTMLButtonElement>) => {
      isolateActionInteraction(e);
      const url = shareUrl();
      if (!url) return;

      void trackToolActionClick(tool.slug, "share_link");

      try {
        if (typeof navigator !== "undefined" && typeof navigator.share === "function") {
          await navigator.share({
            title: tool.name,
            text: `${tool.name} — Break Everything`,
            url,
          });
          setStatus("idle");
          return;
        }
      } catch (err: unknown) {
        const name = err && typeof err === "object" && "name" in err ? String((err as { name: string }).name) : "";
        if (name === "AbortError") return;
      }

      try {
        await navigator.clipboard.writeText(url);
        setStatus("copied");
        window.setTimeout(() => setStatus("idle"), 2000);
      } catch {
        try {
          window.prompt("Copy this link to share this tool:", url);
        } catch {
          setStatus("error");
          window.setTimeout(() => setStatus("idle"), 2500);
        }
      }
    },
    [shareUrl, tool.name, tool.slug],
  );

  return (
    <button
      type="button"
      className={className}
      onClick={(e) => void onClick(e)}
      onPointerDownCapture={isolateActionInteraction}
      aria-label={`Share a link to ${tool.name} on this site`}
    >
      {shareIcon}
      {label}
    </button>
  );
}
