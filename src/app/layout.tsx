import type { Metadata, Viewport } from "next";
import "./globals.css";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";

export const metadata: Metadata = {
  title: {
    default: "ClipPilot — quick video repair toolbox",
    template: "%s · ClipPilot",
  },
  description:
    "Stabilise shaky clips, compress, convert and trim short videos. Processed locally on your own machine — nothing is uploaded to the cloud.",
  applicationName: "ClipPilot",
  appleWebApp: {
    capable: true,
    title: "ClipPilot",
    statusBarStyle: "default",
  },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#1f66f0",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en-GB">
      <body className="flex min-h-screen flex-col">
        <Header />
        <main className="flex-1">{children}</main>
        <Footer />
      </body>
    </html>
  );
}
