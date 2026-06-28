import type { Metadata } from "next";
import { Syne, DM_Sans } from "next/font/google";
import "./globals.css";

const display = Syne({
  subsets: ["latin"],
  variable: "--font-display",
  weight: ["400", "600", "700", "800"],
});

const body = DM_Sans({
  subsets: ["latin"],
  variable: "--font-body",
  weight: ["400", "500", "600"],
});

export const metadata: Metadata = {
  title: "TalentBridge — Mutual Agent Diligence",
  description:
    "Two-sided hiring coordination through Aicoo permissioned share links. Candidate screens the role. Recruiter queries verified context.",
  icons: {
    icon: [{ url: "/talentbridge_logo.svg", type: "image/svg+xml" }],
    apple: [{ url: "/talentbridge_logo.svg", type: "image/svg+xml" }],
    shortcut: ["/talentbridge_logo.svg"],
  },
  openGraph: {
    title: "TalentBridge",
    description:
      "Mutual hiring diligence via Aicoo — Clears, Blocked, and Rescued demo scenarios.",
    images: [{ url: "/talentbridge_logo.svg", width: 560, height: 160, alt: "TalentBridge" }],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${display.variable} ${body.variable}`}>
      <body className="min-h-screen font-body">
        <div className="mesh-bg" aria-hidden />
        <div className="grid-overlay" aria-hidden />
        {children}
      </body>
    </html>
  );
}
