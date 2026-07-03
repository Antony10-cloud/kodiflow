import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "KodiFlow Private Pilot",
  description: "Secure rental management for independent Kenyan landlords.",
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
