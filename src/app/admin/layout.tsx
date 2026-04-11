import type { Metadata } from "next";
import { SITE_NAME } from "@/lib/site-metadata";

export const metadata: Metadata = {
  title: "Admin",
  description: `Manage tools and requests — ${SITE_NAME}.`,
  robots: { index: false, follow: false },
  openGraph: {
    title: `Admin | ${SITE_NAME}`,
    description: `Manage tools and requests — ${SITE_NAME}.`,
    url: "/admin",
    siteName: SITE_NAME,
    type: "website",
  },
  twitter: {
    card: "summary",
    title: `Admin | ${SITE_NAME}`,
    description: `Manage tools and requests — ${SITE_NAME}.`,
  },
};

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
