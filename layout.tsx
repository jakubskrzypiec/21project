import type { Metadata, Viewport } from "next";
import { Geist } from "next/font/google";
import "./globals.css";

const geist = Geist({ variable: "--font-geist", subsets: ["latin"] });

export const metadata: Metadata = {
  metadataBase: new URL("https://21project.pl"),
  title: "21project — strony internetowe Ruda Śląska, Katowice i Śląsk",
  description: "Nowoczesne strony internetowe dla firm z Rudy Śląskiej, Katowic, Chorzowa i całego Śląska. Projekt, wdrożenie, mobile i SEO w jednym miejscu.",
  keywords: [
    "strony internetowe Ruda Śląska",
    "tworzenie stron Katowice",
    "strony www Chorzów",
    "projektowanie stron Śląsk",
    "strona internetowa dla firmy",
    "landing page",
    "21project",
  ],
  alternates: { canonical: "/" },
  openGraph: {
    title: "21project — strony internetowe, które robią robotę",
    description: "Projekt, wdrożenie, mobile i lokalne SEO dla firm z Rudy Śląskiej, Katowic, Chorzowa i całego Śląska.",
    url: "https://21project.pl/",
    siteName: "21project",
    locale: "pl_PL",
    type: "website",
    images: [{ url: "/cases/drg-desktop.webp", width: 1800, height: 1008, alt: "Realizacja strony internetowej DRG Auto — 21project" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "21project — strony internetowe, które robią robotę",
    description: "Strony internetowe dla firm z Rudy Śląskiej, Katowic, Chorzowa i całego Śląska.",
  },
  robots: { index: true, follow: true },
  other: { "codex-preview": "development" },
  icons: { icon: "/favicon.svg", shortcut: "/favicon.svg" },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#ffffff",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="pl"><body className={geist.variable}>{children}</body></html>;
}
