import Script from "next/script";

export default function RootLayout({ children }) {
  return (
    <html>
      <body>
        {children}
        <Script
          src="/tracker.js"
          data-tracker-id="f849ff7d-f43c-487d-8f37-e871b1a23999"
          data-domain="a.b"
          data-allow-localhost="true"
          data-debug="true"
          strategy="afterInteractive"
        />
      </body>
    </html>
  );
}