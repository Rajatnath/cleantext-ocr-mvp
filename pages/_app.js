import "@/styles/globals.css";

// WHY: This is the root component for all pages.
// We import global styles here to ensure they are applied consistently across the entire application.
export default function App({ Component, pageProps }) {
  return <Component {...pageProps} />;
}
