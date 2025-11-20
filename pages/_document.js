import { Html, Head, Main, NextScript } from "next/document";

export default function Document() {
  return (
    <Html lang="en">
      <Head>
        <script src='https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/tesseract.min.js' async></script>
        <script
          src="https://unpkg.com/pdfjs-dist@4.0.379/build/pdf.min.js"
          async
        ></script>
        <script dangerouslySetInnerHTML={{
          __html: `
            window.addEventListener('load', function() {
              if (typeof pdfjsLib !== 'undefined') {
                pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://unpkg.com/pdfjs-dist@4.0.379/build/pdf.worker.min.js';
                console.log('PDF.js loaded successfully');
              } else {
                console.error('PDF.js failed to load');
              }
            });
          `
        }} />
      </Head>
      <body className="antialiased">
        <Main />
        <NextScript />
      </body>
    </Html>
  );
}
