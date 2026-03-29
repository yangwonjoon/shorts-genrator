import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Sidebar } from "@/components/sidebar";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Shorts Generator - Top 10 숏폼 자동 생성",
  description: "주제를 입력하면 자동으로 Top 10 유튜브 숏폼 영상을 생성합니다",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="ko"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="h-full flex bg-zinc-950 text-zinc-100">
        <Sidebar />
        <main className="flex-1 flex flex-col overflow-auto">{children}</main>
      </body>
    </html>
  );
}
