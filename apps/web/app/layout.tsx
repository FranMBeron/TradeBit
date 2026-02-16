import type { Metadata } from "next";
import { APP_NAME } from "@tradebit/shared/constants";
import "./globals.css";

export const metadata: Metadata = {
  title: APP_NAME,
  description: "Social trading platform powered by Wallbit",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
