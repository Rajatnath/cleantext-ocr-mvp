import { Html, Head, Main, NextScript } from "next/document";

// WHY: We use a custom Document to control the initial HTML structure.
// This is where we would add custom fonts, analytics scripts, or global meta tags
// that need to be present on every page load (server-side rendered).
export default function Document() {
  return (
    <Html lang="en">
      <Head>
        {/* PDF.js and Tesseract loaded via npm packages in components */}
      </Head>
      <body className="antialiased">
        <Main />
        <NextScript />
      </body>
    </Html>
  );
}
