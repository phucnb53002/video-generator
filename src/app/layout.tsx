import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "HeyGen Video Generator",
  description: "Create videos with AI avatars, voices, and text",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}
