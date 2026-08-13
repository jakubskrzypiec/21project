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
    title: "21project — strony, które zdobywają klientów",
    description: "Projektowanie i tworzenie nowoczesnych stron internetowych dla firm na Śląsku.",
    url: "https://21project.pl/",
    siteName: "21project",
    locale: "pl_PL",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "21project — nowoczesne strony internetowe",
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
