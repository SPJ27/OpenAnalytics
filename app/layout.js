import Script from "next/script";

export default function RootLayout({ children }) {
  return (
    <html>
      <body>
        {children}
        <Script
          src="/tracker.js"
          data-tracker-id="a0b13b39-797f-4009-96bf-82f2c09e2704"
          data-domain="a.b"
          data-allow-localhost="true"
          data-debug="true"
          strategy="afterInteractive"
          email="test@test.com"
          name="test_user"
        />
      </body>
    </html>
  );
}