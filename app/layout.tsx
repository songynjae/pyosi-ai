import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Pyosi",
  description:
    "Pyosi finds the part of a screenshot you're talking about, and marks it.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
