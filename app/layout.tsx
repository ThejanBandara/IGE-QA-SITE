import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Image from "next/image";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "LiveStream Ops - Social Media Multi-Stream Monitoring & Timer Alert Center",
  description: "Monitor multiple YouTube and Facebook live streams concurrently in 4 or 6-grid command layouts with advance timer alerts.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
              <Image src="https://ingame.global/wp-content/uploads/2022/05/IGE-website-news-bg-1-1.webp" alt="Logo" width={100} height={100} className=" absolute h-screen w-full blur "/>
        {children}</body>
    </html>
  );
}
