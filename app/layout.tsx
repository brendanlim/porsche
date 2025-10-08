import { Inter } from "next/font/google";
import "./globals.css";
import { LayoutContent } from "./LayoutContent";

const inter = Inter({ subsets: ["latin"] });

export const metadata = {
  title: "PorscheStats - Market Intelligence for Porsche Enthusiasts",
  description: "Real-time market data, price trends, and comprehensive analysis for the Porsche market. Track values, find deals, and make informed decisions.",
  keywords: "Porsche, market value, price trends, 911, 718, Cayman, Boxster, GT3, GT4, market analysis",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${inter.className} antialiased`}>
        <LayoutContent>{children}</LayoutContent>
      </body>
    </html>
  );
}
