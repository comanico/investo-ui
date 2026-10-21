import type { Metadata, Viewport } from "next";
import { PreviewHostBridge } from "@/components/preview-host-bridge";
import { Shell } from "@/components/shell";
import { loadDesk } from "@/lib/investo-ro.server";
import "@/styles.css";

export const metadata: Metadata = {
  title: "Investo",
  description: "Investo — BVB equity heat terminal.",
  icons: { icon: "/favicon.svg" },
};

export const viewport: Viewport = {
  themeColor: "#050506",
  width: "device-width",
  initialScale: 1,
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const desk = await loadDesk();

  return (
    <html lang="en" className="dark antialiased">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Big+Shoulders+Display:wght@800&family=IBM+Plex+Sans:wght@400;500;600;700&display=swap"
        />
      </head>
      <body className="bg-bg text-fg">
        <PreviewHostBridge />
        <Shell names={desk.names} valuations={desk.valuations} news={desk.news}>
          {children}
        </Shell>
      </body>
    </html>
  );
}
