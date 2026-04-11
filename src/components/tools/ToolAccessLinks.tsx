"use client";

import Link from "next/link";
import type { Tool } from "@/types";
import { trackToolActionClick } from "@/analytics";
import { resolvePrimaryAction } from "./delivery";

/** Keeps card / parent handlers from seeing the gesture (important on mobile WebKit). */
function isolateActionInteraction(e: { stopPropagation: () => void }) {
  e.stopPropagation();
}

const downloadIcon = (
  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3"
    />
  </svg>
);

const globeIcon = (
  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M12 21a9 9 0 100-18 9 9 0 000 18z"
    />
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M3.6 9h16.8M3.6 15h16.8M12 3a15.3 15.3 0 014 6 15.3 15.3 0 010 6 15.3 15.3 0 01-4 6 15.3 15.3 0 01-4-6 15.3 15.3 0 010-6 15.3 15.3 0 014-6z"
    />
  </svg>
);

const githubIcon = (
  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
    <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
  </svg>
);

interface ToolAccessLinksProps {
  tool: Tool;
  variant: "card" | "hero";
}

export default function ToolAccessLinks({ tool, variant }: ToolAccessLinksProps) {
  const primaryAction = resolvePrimaryAction(tool);
  const primaryHref = primaryAction.href;
  const primaryLabel = primaryAction.label;
  const primaryIcon =
    primaryAction.type === "download"
      ? downloadIcon
      : primaryAction.type === "none"
        ? githubIcon
        : globeIcon;

  const isHero = variant === "hero";
  const track = (action: string) => void trackToolActionClick(tool.slug, action);
  const primaryClass = isHero
    ? "inline-flex items-center gap-2 px-6 py-3 rounded-none border-2 border-accent-steel/35 font-semibold text-sm bg-accent-amber hover:bg-accent-amber/90 text-background transition-all hover:scale-[1.02] shadow-[2px_2px_0_rgba(91,143,199,0.3)]"
    : "inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-none border-2 border-accent-steel/30 text-xs font-semibold font-mono uppercase tracking-wide bg-accent-amber/90 hover:bg-accent-amber text-background transition-colors";
  const githubClass = isHero
    ? "inline-flex items-center gap-2 px-6 py-3 rounded-none font-medium text-sm glass-card text-foreground/70 hover:text-foreground border-2 border-card-border"
    : "inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-none text-xs font-medium glass-card text-foreground/70 hover:text-foreground border-2 border-card-border";

  if (!primaryHref || primaryAction.type === "none") {
    return (
      <a
        href={tool.github_url}
        target="_blank"
        rel="noopener noreferrer"
        className={githubClass}
        onClick={isolateActionInteraction}
        onPointerDownCapture={isolateActionInteraction}
      >
        {githubIcon}
        {isHero ? "Project page" : "Project"}
      </a>
    );
  }

  const primaryIsInternal = primaryHref.startsWith("/");
  const primaryContent = (
    <>
      {primaryIcon}
      {primaryLabel}
    </>
  );

  return (
    <div className={`flex flex-wrap items-center gap-2 ${isHero ? "gap-3" : ""}`}>
      {primaryIsInternal ? (
        <Link
          href={primaryHref}
          className={primaryClass}
          onClick={(e) => {
            isolateActionInteraction(e);
            void track(primaryAction.type);
          }}
          onPointerDownCapture={isolateActionInteraction}
        >
          {primaryContent}
        </Link>
      ) : (
        <a
          href={primaryHref}
          target="_blank"
          rel="noopener noreferrer"
          className={primaryClass}
          onClick={(e) => {
            isolateActionInteraction(e);
            void track(primaryAction.type);
          }}
          onPointerDownCapture={isolateActionInteraction}
        >
          {primaryContent}
        </a>
      )}
      <a
        href={tool.github_url}
        target="_blank"
        rel="noopener noreferrer"
        className={githubClass}
        onClick={(e) => {
          isolateActionInteraction(e);
          void track("source");
        }}
        onPointerDownCapture={isolateActionInteraction}
      >
        {githubIcon}
        {isHero ? "Project page" : "Project"}
      </a>
    </div>
  );
}
