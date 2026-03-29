import type { Metadata } from "next";
import "./globals.css";

const siteUrl = "https://fantasia.sh";

export const metadata: Metadata = {
  title: "Fantasia — micro tools for running a business",
  description:
    "An open-source collection of CLI tools for building and running a business. Starting with CRM data hygiene.",
  metadataBase: new URL(siteUrl),
  openGraph: {
    type: "website",
    url: siteUrl,
    siteName: "Fantasia",
    title: "Fantasia — micro tools for running a business",
    description:
      "An open-source collection of CLI tools for building and running a business. Starting with CRM data hygiene.",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "Fantasia — micro tools for running a business",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Fantasia — micro tools for running a business",
    description:
      "An open-source collection of CLI tools for building and running a business. Starting with CRM data hygiene.",
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
