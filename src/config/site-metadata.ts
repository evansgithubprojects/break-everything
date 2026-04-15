/** Shared strings and defaults for <meta>, Open Graph, and Twitter Cards. */

export const SITE_NAME = "Break Everything";

export const SITE_TAGLINE = "Break software costs, not your budget";

export const DEFAULT_DESCRIPTION =
  "Break Everything helps students break past expensive software by sharing free tools we review, explain in plain language, and link back to the people who build them.";

export const DEFAULT_TITLE = `${SITE_NAME} — ${SITE_TAGLINE}`;

/** 16:9 hero banner for link previews; dimensions match `public/og-hero.png`. */
export const DEFAULT_OG_IMAGE = {
  url: "/og-hero.png",
  width: 1024,
  height: 576,
  alt: `${SITE_NAME} — breaking software cost barriers for students`,
  type: "image/png",
} as const;

/** `google-adsense-account` meta value — use only on home and tool detail routes. */
export const GOOGLE_ADSENSE_ACCOUNT = "ca-pub-2587197324811876";

/** External Jira form used for community tool requests. Replace placeholder before shipping. */
export const TOOL_REQUEST_FORM_URL =
  "https://evanmcghee.atlassian.net/jira/software/projects/KAN/form/35?atlOrigin=eyJpIjoiM2RiYzM3MjQ1OTAzNGNkMThmNTg4ODUzMmI5ZDI0ZGQiLCJwIjoiaiJ9";
