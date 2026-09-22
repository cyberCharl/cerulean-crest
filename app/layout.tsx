import type { Metadata } from "next";
import Link from "next/link";
import { getSocialProfile } from "@/lib/social-store";
import { getSettings } from "@/lib/db";
import { readerTheme } from "@/lib/reader-theme";
import { getUser } from "@/lib/browser-auth";
import { appUrl, marketingUrl } from "@/lib/site-config";
import "@fontsource-variable/cormorant-garamond/wght.css";
import "@fontsource-variable/cormorant-garamond/wght-italic.css";
import "@fontsource/ibm-plex-sans-condensed/latin-400.css";
import "@fontsource/ibm-plex-sans-condensed/latin-500.css";
import "@fontsource/ibm-plex-sans-condensed/latin-600.css";
import "@fontsource/ibm-plex-sans-condensed/latin-700.css";
import "@fontsource-variable/literata/wght.css";
import "@fontsource-variable/literata/wght-italic.css";
import "./globals.css";
import "./reader-theme.css";

export const metadata: Metadata = {
  title: { default: "Daybook", template: "%s — Daybook" },
  description: "A finite, human-scale edition for a better information diet.",
};

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const user = await getUser();
  const [settings, profile] = user ? await Promise.all([getSettings(user.subject), getSocialProfile(user.subject)]) : [{}, null];
  const theme = readerTheme(settings);
  return (
    <html lang="en">
      <body data-reader-theme={theme}>
        <header className="site-header">
          <Link className="brand" href={marketingUrl()}>
            <img className="study-brand-mark" src="/brand/daybook/daybook-mark.svg" width={36} height={36} alt="" aria-hidden="true" />
            <span className="study-brand-name">Daybook<span className="study-brand-dot">.</span></span>
          </Link>
          <nav aria-label="Primary navigation">
            {user ? <>
              <Link href={appUrl("/today")}>Today</Link>
              <Link href={appUrl("/archive")}>Archive</Link>
              <Link href={appUrl("/saved")}>Saved</Link>
              {profile?.enabled ? <Link href={appUrl("/friends")}>Friends</Link> : null}
              <Link href={appUrl("/settings")}>Settings</Link>
              <a href={appUrl("/auth/logout")}>Sign out</a>
            </> : <>
              <a href={appUrl("/auth/login")}>Sign in</a>
              <a href={appUrl("/auth/login?screen_hint=signup")}>Get started</a>
            </>}
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
