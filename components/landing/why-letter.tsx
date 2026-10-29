import { marketingUrl } from "@/lib/site-config";
import { BriefCard, Desk, FoundSlip, ReplyCard, type AccountLink } from "./desk";
import styles from "./desk.module.css";

type Props = { signupUrl: string; account: AccountLink; signedIn: boolean };

/** The "why I made this" page: Charl's essay, condensed into a letter. */
export function WhyLetter({ signupUrl, account, signedIn }: Props) {
  return (
    <Desk account={account}>
      <main className={styles.desk}>
        <div className={styles.spread}>
          <article className={styles.letter} aria-labelledby="letter-title">
            <div className={styles.letterhead}>
              <a href={marketingUrl()}>Filtered<span className={styles.dot}>.</span></a>
              <span>A note from Charl</span>
            </div>
            <h1 id="letter-title">A newspaper <em>of my own.</em></h1>

            <div className={styles.body}>
              <p className={styles.salutation}>Dear reader,</p>
              <p>
                I used to sit down at lunch meaning to read something good, and
                end up scrolling. The feeds are very good at finding things.
                They just aren’t working for me, and more of what they find
                reads as though it was written to spread, or written by no one
                at all.
              </p>
              <p>
                Saving things to read later helped for a while, until the list
                became a backlog I was never going to finish, and the feed was
                easier again.
              </p>
              <p>
                So I tried something else. I wrote down what I’m curious about,
                what I want to learn and what I’d rather not see, and asked an
                AI to go looking for me. Now it makes me a small paper: a handful
                of pieces chosen against that brief, with some room left for
                things I’d never think to search for. Then it ends.
              </p>
              <p>
                It has found me an essay on the pleasure of chopping firewood,
                the story of how Edo was built to keep its samurai busy, and the
                mining that threatens the surf on South Africa’s West Coast.
                I wouldn’t have come across any of them on my own.
              </p>
              <p>
                The AI only finds. It doesn’t summarise or rewrite anything, and
                you read every piece on the writer’s own site. The links you
                save along the way go in as candidates, not a backlog: pass on
                one and it quietly steps aside.
              </p>
              <p>Filtered is that experiment, made so you can have a paper of your own.</p>
              <p className={styles.signoff}>Warmly,</p>
              <p className={styles.signature}>Charl</p>
              <p className={styles.role}>who makes Filtered</p>
            </div>
          </article>

          <div className={styles.side}>
            <BriefCard />
            <FoundSlip />
          </div>

          <ReplyCard signupUrl={signupUrl} account={account} signedIn={signedIn} />
        </div>
      </main>
    </Desk>
  );
}
