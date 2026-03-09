import Script from "next/script";
import "./globals.css";
import {Inter} from "next/font/google";
import {TrackerIdentify} from "@/components/TrackerIdentify/supabase";

const inter = Inter({ subsets: ["latin"] });

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <title>OpenAnalytics - A self-hosted analytics platform</title>
      </head>
      <body className={inter.className}>
        {children}
        <TrackerIdentify />
        <Script
          src="/tracker.js"
          data-tracker-id="a0b13b39-797f-4009-96bf-82f2c09e2704"
          data-domain="analytics.sakshamjain.dev"
          strategy="afterInteractive"
        />
      </body>
    </html>
  );
}