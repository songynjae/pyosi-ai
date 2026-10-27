import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Pyosi",
  description:
    "Turn screenshots and rough technical notes into clear, structured visual explanations.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
