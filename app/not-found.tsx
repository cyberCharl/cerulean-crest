import Link from "next/link";

export default function NotFound() {
  return (
    <main className="not-found">
      <p className="edition-number">404 / Off the press</p>
      <h1>No edition<br /><em>for that date.</em></h1>
      <p>The archive may have the issue you’re looking for.</p>
      <Link className="source-link" href="/archive">Browse the archive →</Link>
    </main>
  );
}
