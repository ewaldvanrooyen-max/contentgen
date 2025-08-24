import "./../styles/globals.css";
import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "contentgen",
  description: "AI content creator"
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <div className="container">
          <header>
            <h1 style={{marginBottom:8}}><Link href="/">contentgen</Link></h1>
            <div className="meta">AI content creator</div>
            <hr />
          </header>
          <main>{children}</main>
          <hr />
          <footer className="meta">© {new Date().getFullYear()} contentgen</footer>
        </div>
      </body>
    </html>
  );
}
