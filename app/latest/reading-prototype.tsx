"use client";

// PROTOTYPE: three front-page arrangements at /latest?prototype=reading&variant=A|B|C.
// Question: do three commitments and disposable, two-stage editions remove reading debt?
import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { initialState, nextPaper, openInside, retire, setCommitment, type ReadingLink, type ReadingState } from "./reading-prototype-model";
import styles from "./reading-prototype.module.css";

type Variant = "A" | "B" | "C";
const variants: Variant[] = ["A", "B", "C"];
const names = { A: "The front page", B: "The reading desk", C: "The pocket paper" };
type CardProps = { link: ReadingLink; lead?: boolean; update: (change: (state: ReadingState) => ReadingState) => void };

function LinkCard({ link, lead = false, update }: CardProps) {
  return <article className={`${styles.article} ${lead ? styles.lead : ""}`}>
    <p className={styles.byline}>{link.publication} <span>·</span> {link.minutes} min{link.read ? " · Read" : ""}</p>
    <h2><a href={link.url} target="_blank" rel="noreferrer">{link.title}</a></h2>
    <a className={styles.source} href={link.url} target="_blank" rel="noreferrer">Read at source ↗</a>
    <div className={styles.actions} aria-label={`Choices for ${link.title}`}>
      <button aria-pressed={link.commitment === "later"} onClick={() => update(state => setCommitment(state, link.id, link.commitment === "later" ? "candidate" : "later"))}>Maybe later</button>
      <button aria-pressed={link.commitment === "pinned"} onClick={() => update(state => setCommitment(state, link.id, link.commitment === "pinned" ? "candidate" : "pinned"))}>{link.commitment === "pinned" ? "Pinned for later" : "Pin for later"}</button>
      <button aria-pressed={link.read} onClick={() => update(state => ({ ...state, links: state.links.map(item => item.id === link.id ? { ...item, read: !item.read } : item), message: link.read ? "Marked unread." : "Marked read. The link stays in your collection." }))}>{link.read ? "Mark unread" : "Mark read"}</button>
    </div>
  </article>;
}

function FrontPage({ links, variant, update }: { links: ReadingLink[]; variant: Variant; update: CardProps["update"] }) {
  const lead = links.find(link => link.minutes >= 12);
  const smaller = links.filter(link => link.id !== lead?.id);
  if (variant === "B") return <div className={styles.desk}>
    <aside className={styles.deskMargin}><p className={styles.eyebrow}>A little room<br />for reading.</p><p>Start with the long piece,<br />or follow a smaller curiosity.</p><span className={styles.ornament} aria-hidden="true">❧</span></aside>
    <div>{lead ? <LinkCard link={lead} lead update={update} /> : null}<div className={styles.deskShorts}>{smaller.map(link => <LinkCard key={link.id} link={link} update={update} />)}</div></div>
  </div>;
  if (variant === "C") return <div className={styles.pocket}>
    {lead ? <div className={styles.pocketLead}><p className={styles.eyebrow}>One to settle into</p><LinkCard link={lead} lead update={update} /></div> : null}
    <div className={styles.pocketShorts}><p className={styles.eyebrow}>A few shorter reads</p>{smaller.map(link => <LinkCard key={link.id} link={link} update={update} />)}</div>
  </div>;
  return <div className={styles.broadsheet}>
    {lead ? <div className={styles.feature}><p className={styles.eyebrow}>The long read</p><LinkCard link={lead} lead update={update} /></div> : null}
    <div className={styles.shorts}><p className={styles.eyebrow}>Alongside</p>{smaller.map(link => <LinkCard key={link.id} link={link} update={update} />)}</div>
  </div>;
}

function PrototypeSwitcher({ variant }: { variant: Variant }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      const target = event.target;
      if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey || (target instanceof HTMLElement && target.closest("input, textarea, select, button, a, [contenteditable=true]"))) return;
      if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
      event.preventDefault();
      const params = new URLSearchParams(searchParams.toString());
      params.set("variant", variants[(variants.indexOf(variant) + (event.key === "ArrowRight" ? 1 : 2)) % 3]);
      router.replace(`/latest?${params}`, { scroll: false });
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [router, searchParams, variant]);
  function cycle(direction: number) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("variant", variants[(variants.indexOf(variant) + direction + 3) % 3]);
    router.replace(`/latest?${params}`, { scroll: false });
  }
  if (process.env.NODE_ENV === "production") return null;
  return <nav className={styles.switcher} aria-label="Prototype layouts"><button onClick={() => cycle(-1)} aria-label="Previous layout">←</button><span><small>Layout study</small>{variant} · {names[variant]}</span><button onClick={() => cycle(1)} aria-label="Next layout">→</button></nav>;
}

export function ReadingPrototype() {
  const query = useSearchParams();
  const rawVariant = query.get("variant");
  const variant: Variant = rawVariant === "B" || rawVariant === "C" ? rawVariant : "A";
  const [state, update] = useState(initialState);
  const [view, setView] = useState<"paper" | "links">("paper");
  const [shelf, setShelf] = useState("candidate");
  const [search, setSearch] = useState("");
  const [url, setUrl] = useState("");
  const [title, setTitle] = useState("");
  const [minutes, setMinutes] = useState(7);
  const [formMessage, setFormMessage] = useState("");
  const [stage, setStage] = useState<"front" | "inside">("front");
  const paper = state.paper;
  const front = paper?.front.flatMap(id => state.links.find(link => link.id === id) ?? []) ?? [];
  const inside = paper?.inside.flatMap(id => state.links.find(link => link.id === id) ?? []) ?? [];
  const library = state.links.filter(link => {
    const matches = shelf === "all" || (shelf === "read" ? link.read : shelf === "dormant" ? link.dormant && !link.read : !link.read && !link.dormant && link.commitment === shelf);
    return matches && `${link.title} ${link.publication} ${link.url}`.toLowerCase().includes(search.toLowerCase());
  });

  function addLink(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    let parsed: URL;
    try { parsed = new URL(url); } catch { setFormMessage("Enter a complete https:// or http:// link."); return; }
    if (!["https:", "http:"].includes(parsed.protocol)) { setFormMessage("Use an https:// or http:// link."); return; }
    if (state.links.some(link => link.url === parsed.href)) { setFormMessage("That link is already here. Find it under All links."); return; }
    const link: ReadingLink = { id: crypto.randomUUID(), url: parsed.href, title: title.trim() || parsed.hostname, publication: parsed.hostname, minutes,
      commitment: "candidate", dormant: false, read: false, eligibleFrom: state.nextNumber, lastPresented: "Never", reason: "Added by you" };
    update(current => ({ ...current, links: [...current.links, link], message: "Link added as a candidate for a future edition." }));
    setUrl(""); setTitle(""); setShelf("candidate"); setSearch(""); setFormMessage("Added to this demo. Refreshing clears prototype changes.");
  }

  return <main className={styles.prototype}>
    <div className={styles.prototypeNote}>Interactive prototype · sample links · changes last until refresh</div>
    <nav className={styles.localNav} aria-label="Reading prototype">
      <button aria-current={view === "paper" ? "page" : undefined} onClick={() => setView("paper")}>Your paper</button>
      <button aria-current={view === "links" ? "page" : undefined} onClick={() => setView("links")}>Your links</button>
      <span>Wednesday, 28 October</span>
    </nav>
    {view === "paper" ? <>
      <header className={styles.masthead}><p className={styles.eyebrow}>{paper ? `Edition ${paper.number} · ${stage === "front" ? "Front page" : "Inside the paper"}` : "Between editions"}</p><h1>{stage === "inside" && paper ? "A little further." : "A paper of your own."}</h1><p>{paper ? "A few things worth your time. Read whatever takes your interest." : "The paper is gone. Your links are still here."}</p></header>
      {paper ? <>
        {stage === "front" ? <>
          {front.length ? <FrontPage links={front} variant={variant} update={update} /> : <p className={styles.empty}>Nothing for the front page this time. You can add a link, revisit your collection, or leave it here.</p>}
          <div className={styles.fold}><span aria-hidden="true">❦</span><h2>You can leave it here.</h2><p>Or turn the page for a little more reading.</p>{inside.length ? <button onClick={() => { update(openInside); setStage("inside"); window.scrollTo({ top: 0, behavior: "instant" }); }}>Open the rest of the paper <span aria-hidden="true">→</span></button> : <p>That’s the whole paper for this occasion.</p>}</div>
        </> : <section className={styles.inside} aria-label="Inside pages"><button className={styles.back} onClick={() => { setStage("front"); window.scrollTo({ top: 0, behavior: "instant" }); }}>← Back to the front page</button>{inside.map(link => <LinkCard key={link.id} link={link} update={update} />)}<p className={styles.end}>That’s all for this edition.</p></section>}
      </> : <div className={styles.empty}><p>No old editions to catch up on.</p><button className={styles.primary} onClick={() => { update(nextPaper); setStage("front"); }}>Open the next edition →</button></div>}
    </> : <section className={styles.collection}>
      <header className={styles.masthead}><p className={styles.eyebrow}>Your collection</p><h1>Possibilities, not obligations.</h1><p>Keep a link. Change your mind. Come back when it suits you.</p></header>
      <details className={styles.capture}><summary>Add a link</summary><form onSubmit={addLink}>
        <label>Article URL<input required type="url" value={url} onChange={event => setUrl(event.target.value)} placeholder="https://…" /></label>
        <label>Title <span>(optional)</span><input value={title} onChange={event => setTitle(event.target.value)} /></label>
        <label>Reading minutes <span>(estimate)</span><input required type="number" min={1} max={180} value={minutes} onChange={event => setMinutes(Number(event.target.value))} /></label>
        <button className={styles.primary} type="submit">Add as a candidate</button><p role="status">{formMessage}</p>
      </form></details>
      <div className={styles.shelves} role="group" aria-label="Link shelves">{[["candidate", "Candidates"], ["later", "Maybe later"], ["pinned", "Pinned"], ["dormant", "Dormant"], ["read", "Read"], ["all", "All links"]].map(([key, label]) => <button key={key} aria-pressed={shelf === key} onClick={() => setShelf(key)}>{label}</button>)}</div>
      <p className={styles.shelfNote}>{{ candidate: "Available for a future selection. Being saved is enough; nothing is due.", later: "Still interested, just not now. These links rest for one edition before becoming eligible again.", pinned: "A deliberate intention to read. These stay eligible until you read or release them.", dormant: "Quietly set aside, always findable. Bring a link back whenever you like.", read: "Links you marked read. No score, no finish line.", all: "Every link stays here, even when its edition is gone." }[shelf]}</p>
      <label className={styles.search}>Find a link<input type="search" value={search} onChange={event => setSearch(event.target.value)} placeholder="Search titles, sources or URLs" /></label>
      <div className={styles.library}>{library.map(link => <div key={link.id} className={styles.libraryEntry}><LinkCard link={link} update={update} /><div className={styles.libraryMeta}><p>{link.read ? "Read" : link.dormant ? "Dormant" : link.commitment === "pinned" ? "Pinned" : link.commitment === "later" ? "Maybe later" : "Candidate"} · {link.reason}</p>{link.dormant ? <button onClick={() => update(current => setCommitment(current, link.id, "candidate"))}>Return to candidates</button> : <button onClick={() => update(current => ({ ...current, links: current.links.map(item => item.id === link.id ? { ...item, dormant: true, commitment: "candidate", reason: "Set aside by you" } : item), message: "Link is dormant and remains searchable." }))}>Let this go dormant</button>}</div></div>)}{library.length === 0 ? <p className={styles.empty}>Nothing here. There’s nothing to catch up on.</p> : null}</div>
    </section>}
    <details className={styles.lab}>
      <summary>Prototype controls &amp; state</summary>
      <p className={styles.status} role="status">{state.message}</p>
      <p>Selection is not presentation. Opening a stage presents that whole stage; it never marks anything read. These controls simulate time passing.</p>
      <div className={styles.labActions}><button disabled={!paper} onClick={() => update(retire)}>Retire this edition</button><button onClick={() => { update(nextPaper); setView("paper"); setStage("front"); }}>Next edition</button><button onClick={() => { update(initialState()); setView("paper"); setStage("front"); setFormMessage(""); }}>Reset demo</button></div>
      <p>{paper ? `Edition ${paper.number} · inside pages ${paper.insideOpened ? "opened" : "unopened"}` : "No edition retained"}. Next edition: {state.nextNumber}.</p>
      <div className={styles.tableScroll}><table><caption>Link state — all sample and added links</caption><thead><tr><th>Link</th><th>Commitment</th><th>State</th><th>Current selection</th><th>Last presented</th><th>Eligible from</th></tr></thead><tbody>{state.links.map(link => <tr key={link.id}><th scope="row">{link.title}</th><td>{link.commitment}</td><td>{link.read ? "read" : link.dormant ? "dormant" : "active"}</td><td>{paper?.front.includes(link.id) ? "front" : paper?.inside.includes(link.id) ? "inside" : "—"}</td><td>{link.lastPresented}</td><td>{link.eligibleFrom}</td></tr>)}</tbody></table></div>
    </details>
    <PrototypeSwitcher variant={variant} />
  </main>;
}
