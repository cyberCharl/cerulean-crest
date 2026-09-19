import Link from "next/link";
import { ArticleActions } from "@/components/article-actions";
import { requireUser } from "@/lib/browser-auth";
import { listArticleFeedback } from "@/lib/db";

export const dynamic = "force-dynamic";
export const metadata = { title: "Saved articles", robots: { index: false, follow: false } };

export default async function SavedPage() {
  const user = await requireUser();
  const articles = await listArticleFeedback(user.subject, { savedOnly: true });
  return <main className="archive-page saved-page">
    <header className="archive-header">
      <p className="edition-number">Your private collection</p>
      <h1>Saved<br /><em>Articles</em></h1>
      <p>Pieces to keep and return to whenever you have time.</p>
    </header>
    <p className="saved-explanation">Saving keeps an article here. Tell the editor what you’d like more or less of using the feedback on each piece.</p>
    {articles.length === 0 ? <div className="saved-empty">
      <h2>A little room for later.</h2>
      <p>Use “Save article” on any piece in your editions to keep it here across devices.</p>
      <Link className="source-link" href="/today">Open your latest edition →</Link>
    </div> : <div className="saved-list">
      {articles.map((article) => <article className="saved-article" key={article.url}>
        <p className="byline">{article.publication}</p>
        <h2><a href={article.url} target="_blank" rel="noreferrer">{article.title} <span aria-hidden="true">↗</span></a></h2>
        <ArticleActions url={article.url} initialFeedback={article} />
      </article>)}
    </div>}
    <p><Link href="/archive">Browse all editions →</Link></p>
  </main>;
}
