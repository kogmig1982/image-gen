import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Image Gen Studio",
  description: "AI image generation and editing via OpenRouter",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
