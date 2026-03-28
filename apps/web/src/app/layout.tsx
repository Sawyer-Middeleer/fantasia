import type { Metadata } from "next";
import "./globals.css";

const siteUrl = "https://fantasia.sh";

export const metadata: Metadata = {
  title: "Fantasia — CLI-first CRM audit & fix",
  description:
    "Audit your CRM health and fix data issues from the command line.",
  metadataBase: new URL(siteUrl),
  openGraph: {
    type: "website",
    url: siteUrl,
    siteName: "Fantasia",
    title: "Fantasia — CLI-first CRM audit & fix",
    description:
      "Audit your CRM health and fix data issues from the command line.",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "Fantasia — CLI-first CRM audit & fix",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Fantasia — CLI-first CRM audit & fix",
    description:
      "Audit your CRM health and fix data issues from the command line.",
    images: ["/og-image.png"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true },
  },
  alternates: {
    canonical: siteUrl,
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
