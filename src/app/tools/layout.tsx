import type { Metadata } from "next";
import {
  DEFAULT_DESCRIPTION,
  DEFAULT_OG_IMAGE,
  SITE_NAME,
} from "@/config";

const title = "Browse tools";

export const metadata: Metadata = {
  title,
  description: `Browse free tools that help students break software costs. ${DEFAULT_DESCRIPTION}`,
  alternates: {
    canonical: "/tools",
  },
  openGraph: {
    type: "website",
    url: "/tools",
    siteName: SITE_NAME,
    title: `${title} | ${SITE_NAME}`,
    description: `Browse free tools that help students break software costs. ${DEFAULT_DESCRIPTION}`,
    images: [DEFAULT_OG_IMAGE],
  },
  twitter: {
    card: "summary_large_image",
    title: `${title} | ${SITE_NAME}`,
    description: `Browse free tools that help students break software costs. ${DEFAULT_DESCRIPTION}`,
    images: [
      {
        url: DEFAULT_OG_IMAGE.url,
        alt: DEFAULT_OG_IMAGE.alt,
        width: DEFAULT_OG_IMAGE.width,
        height: DEFAULT_OG_IMAGE.height,
      },
    ],
  },
};

export default function ToolsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
