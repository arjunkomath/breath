import type { Metadata, Viewport } from "next";
import { Archivo } from "next/font/google";
import "./globals.css";

const archivo = Archivo({
  variable: "--font-archivo",
  subsets: ["latin"],
  axes: ["wdth"],
});

const title = "Breath — Custom Breathing Timer";
const description =
  "Create custom breathing exercises with flexible phases, guided animations, sound cues, and ready-made Box, 4-7-8, and Coherent Breathing presets.";
const ogImage = `https://og.techulus.cloud/api/image?${new URLSearchParams({
  title,
  content: description,
})}`;

export const metadata: Metadata = {
  applicationName: "Breath",
  title,
  description,
  keywords: [
    "breathing timer",
    "breathing exercises",
    "Box breathing",
    "4-7-8 breathing",
    "Coherent Breathing",
  ],
  manifest: "/manifest.json",
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/icons/icon-48x48.png", type: "image/png", sizes: "48x48" },
      { url: "/icons/icon-96x96.png", type: "image/png", sizes: "96x96" },
      { url: "/icons/icon-192x192.png", type: "image/png", sizes: "192x192" },
      { url: "/icons/icon-512x512.png", type: "image/png", sizes: "512x512" },
    ],
    // iOS masks and composites these over an opaque backdrop, so they come
    // from the un-rounded logo rather than the pre-rounded one.
    apple: [
      { url: "/icons/icon-152x152.png", type: "image/png", sizes: "152x152" },
      { url: "/icons/icon-167x167.png", type: "image/png", sizes: "167x167" },
      { url: "/icons/icon-180x180.png", type: "image/png", sizes: "180x180" },
    ],
  },
  appleWebApp: {
    capable: true,
    title: "Breath",
    statusBarStyle: "default",
  },
  openGraph: {
    type: "website",
    locale: "en_US",
    siteName: "Breath",
    title,
    description,
    images: [{ url: ogImage, width: 1200, height: 630, alt: title }],
  },
  twitter: {
    card: "summary_large_image",
    title,
    description,
    images: [{ url: ogImage, alt: title }],
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#faf6ef" },
    { media: "(prefers-color-scheme: dark)", color: "#1c1917" },
  ],
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${archivo.variable} antialiased`}>
      {/* dvh rather than a percentage chain, so mobile browser chrome
          collapsing doesn't leave the layout short. */}
      <body className="flex min-h-dvh flex-col">{children}</body>
    </html>
  );
}
