import Script from "next/script";
import "./globals.css";
import {Inter} from "next/font/google";

const inter = Inter({ subsets: ["latin"] });

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className={inter.className}>
        {children}
        <Script
          src="/tracker.js"
          data-tracker-id="a0b13b39-797f-4009-96bf-82f2c09e2704"
          data-domain="a.b"
          strategy="afterInteractive"
          data-allow-localhost="true"
          data-debug="true"
        />
      </body>
    </html>
  );
}