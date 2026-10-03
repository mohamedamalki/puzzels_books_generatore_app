import type { Metadata } from "next";
import type { ReactNode } from "react";
import "@fontsource/nunito/latin-400.css";
import "@fontsource/nunito/latin-700.css";
import "@fontsource/fredoka/latin-400.css";
import "./globals.css";

export const metadata: Metadata = { title: "NicheForge Books", description: "Structured publishing with quality gates." };

export default function RootLayout({ children }: { children: ReactNode }) {
  return <html lang="en"><body>{children}</body></html>;
}
