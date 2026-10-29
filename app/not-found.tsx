import Link from "next/link";

export default function NotFound() {
  return (
    <main className="not-found">
      <p className="edition-number">404 / Off the press</p>
      <h1>This page<br /><em>isn’t here.</em></h1>
      <p>Open your current paper, or find a saved link in your collection.</p>
      <p><Link className="source-link" href="/latest">Open your paper →</Link></p>
      <Link className="source-link" href="/links">Find a link →</Link>
    </main>
  );
}
