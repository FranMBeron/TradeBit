import type { Metadata } from "next";
import { Inter, Geist } from "next/font/google";
import { APP_NAME } from "@tradebit/shared/constants";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
const geist = Geist({ subsets: ["latin"], variable: "--font-geist" });

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
    <html lang="en" className="dark">
      <body className={`${inter.variable} ${geist.variable} font-sans antialiased`}>{children}</body>
    </html>
  );
}
