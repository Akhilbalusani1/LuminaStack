import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
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
  title: "LuminaStack - Transform Goals into Actionable Plans",
  description: "AI-powered workflow generator with voice narration. Transform your goals into step-by-step actionable plans with interactive Q&A support.",
  keywords: "AI workflow, goal planning, voice assistant, productivity, task management",
  authors: [{ name: "LuminaStack Team" }],
  openGraph: {
    title: "LuminaStack",
    description: "Transform your goals into actionable workflows with AI-powered voice guidance",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
