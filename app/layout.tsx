import type { Metadata } from "next";
import Link from "next/link";
import "@fontsource-variable/cormorant-garamond/wght.css";
import "@fontsource-variable/cormorant-garamond/wght-italic.css";
import "@fontsource/ibm-plex-sans-condensed/latin-400.css";
import "@fontsource/ibm-plex-sans-condensed/latin-500.css";
import "@fontsource/ibm-plex-sans-condensed/latin-600.css";
import "@fontsource/ibm-plex-sans-condensed/latin-700.css";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "Cerulean Crest", template: "%s — Cerulean Crest" },
  description: "A finite, human-scale edition for a better information diet.",
};

function CrestMark() {
  return (
    <svg aria-hidden="true" className="crest-mark" viewBox="0 0 56 64">
      <path d="M4 4h48v22c0 16-9.8 28.2-24 34C13.8 54.2 4 42 4 26V4Z" />
      <path d="m14 20 8 8 7-14 6 14 8-8v17H14V20Z" />
      <path d="M15 44h26" />
    </svg>
  );
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>
        <header className="site-header">
          <Link className="brand" href="/" aria-label="Cerulean Crest — today’s issue">
            <CrestMark />
            <span className="brand-name">Cerulean Crest</span>
          </Link>
          <nav aria-label="Primary navigation">
            <Link href="/">Today</Link>
            <Link href="/archive">Archive</Link>
          </nav>
        </header>
        {children}
        <footer className="site-footer">
          <p><span className="footer-rule" />A finite edition for a better information diet.</p>
          <p>Made with judgment, not engagement metrics.</p>
        </footer>
      </body>
    </html>
  );
}
