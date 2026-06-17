import type { Metadata, Viewport } from "next";
import { Fraunces, Inter } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/Providers";

/*
  Fraunces = editorial display serif. Stands in for Kepler Std (a paid Adobe
  font) until we license it. Swapping fonts later means changing only this file.
*/
const fraunces = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin"],
  display: "swap",
});

/* Inter = warm humanist sans-serif for body text. */
const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Andiamo",
  description:
    "The bridge between potential and momentum for independent musicians.",
  manifest: "/manifest.json",
  // Lets the artist install Andiamo to the iPhone Home Screen — required for
  // Web Push to work on iOS.
  appleWebApp: { capable: true, title: "Andiamo", statusBarStyle: "default" },
  icons: { apple: "/logo-icon.png" },
};

export const viewport: Viewport = { themeColor: "#0c0b0a" };

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${fraunces.variable} ${inter.variable} h-full antialiased`}
    >
      <body className="min-h-full">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
