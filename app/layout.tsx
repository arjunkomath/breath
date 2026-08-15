import type { Metadata, Viewport } from "next";
import { Fraunces, Karla } from "next/font/google";
import "./globals.css";

const fraunces = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin"],
});

const karla = Karla({
  variable: "--font-karla",
  subsets: ["latin"],
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
    icon: [{ url: "/logo.png", type: "image/png", sizes: "512x512" }],
    apple: [{ url: "/logo.png", type: "image/png", sizes: "512x512" }],
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
    <html
      lang="en"
      className={`${fraunces.variable} ${karla.variable} antialiased`}
    >
      {/* dvh rather than a percentage chain, so mobile browser chrome
          collapsing doesn't leave the layout short. */}
      <body className="flex min-h-dvh flex-col">{children}</body>
    </html>
  );
}
