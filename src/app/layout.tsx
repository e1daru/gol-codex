import type { Metadata, Viewport } from "next";

import "@/app/globals.css";

export const metadata: Metadata = {
  title: "Conway Name Wall",
  description: "An interactive Conway's Game of Life wall for event name submissions."
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  colorScheme: "dark"
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
