/** Shared strings and defaults for <meta>, Open Graph, and Twitter Cards. */

export const SITE_NAME = "Break Everything";

export const SITE_TAGLINE = "Free Tools for Students";

export const DEFAULT_DESCRIPTION =
  "Hand-picked free tools for students — each one reviewed, with a clear link to learn more and see who made it.";

export const DEFAULT_TITLE = `${SITE_NAME} — ${SITE_TAGLINE}`;

/** 16:9 hero banner for link previews; dimensions match `public/og-hero.png`. */
export const DEFAULT_OG_IMAGE = {
  url: "/og-hero.png",
  width: 1024,
  height: 576,
  alt: `${SITE_NAME} — free tools for students`,
  type: "image/png",
} as const;
