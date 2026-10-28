// PROTOTYPE: in-memory links, deliberately independent of the production database.
import { seedIssue } from "@/lib/seed";

export type Commitment = "candidate" | "later" | "pinned";
export type ReadingLink = {
  id: string; url: string; title: string; publication: string; minutes: number;
  commitment: Commitment; dormant: boolean; read: boolean; eligibleFrom: number;
  lastPresented: string; reason: string;
};
export type Paper = { number: number; front: string[]; inside: string[]; presented: string[]; insideOpened: boolean };
export type ReadingState = { links: ReadingLink[]; paper: Paper | null; nextNumber: number; message: string };

export function compose(links: ReadingLink[], number: number): Paper {
  const priority = { pinned: 0, later: 1, candidate: 2 };
  const available = links.filter(link => !link.dormant && !link.read && link.eligibleFrom <= number)
    .sort((a, b) => priority[a.commitment] - priority[b.commitment]);
  const lead = available.find(link => link.minutes >= 12);
  const shorts = available.filter(link => link.minutes < 12).slice(0, 3);
  const front = [...(lead ? [lead.id] : []), ...shorts.map(link => link.id)];
  const inside = available.filter(link => !front.includes(link.id)).slice(0, 4).map(link => link.id);
  // The front page is presented as a whole on opening. Selection alone is not exposure.
  return { number, front, inside, presented: front, insideOpened: false };
}

function recordPresentation(links: ReadingLink[], paper: Paper, ids: string[], stage: string): ReadingLink[] {
  return links.map(link => ids.includes(link.id) ? { ...link, lastPresented: `Edition ${paper.number} · ${stage}` } : link);
}

export function initialState(): ReadingState {
  const sources = seedIssue.sections.flatMap(section => section.items);
  const links: ReadingLink[] = [
    { id: "wood", url: "https://aeon.co/essays/the-simple-pleasure-and-rituals-of-chopping-firewood", title: "The simple pleasure and rituals of chopping firewood", publication: "Aeon", minutes: 18,
      commitment: "candidate", dormant: false, read: false, eligibleFrom: 1, lastPresented: "Never", reason: "Saved from your browser" },
    ...sources.map((item, i): ReadingLink => ({ id: `sample-${i}`, url: item.url, title: item.title, publication: item.publication, minutes: item.readingMinutes,
      commitment: "candidate", dormant: i === sources.length - 1, read: false, eligibleFrom: 1, lastPresented: i === sources.length - 1 ? "An older edition" : "Never",
      reason: i === sources.length - 1 ? "Offered before; quietly set aside" : "Sample saved link" })),
  ];
  const paper = compose(links, 1);
  return { links: recordPresentation(links, paper, paper.front, "front page"), paper, nextNumber: 2, message: "Front page opened. Inside links are still unpresented." };
}

export function openInside(state: ReadingState): ReadingState {
  if (!state.paper || state.paper.insideOpened) return state;
  const paper = { ...state.paper, insideOpened: true, presented: [...state.paper.front, ...state.paper.inside] };
  return { ...state, paper, links: recordPresentation(state.links, paper, paper.inside, "inside pages"), message: "Inside pages opened. Their links are now presented, but not marked read." };
}

export function retire(state: ReadingState): ReadingState {
  if (!state.paper) return state;
  const paper = state.paper;
  const links = state.links.map(link => {
    if (!paper.presented.includes(link.id)) return link;
    if (link.read) return { ...link, reason: "Read; retained as a link, no longer offered" };
    if (link.commitment === "pinned") return { ...link, reason: "Pinned; stays eligible until you read or release it" };
    if (link.commitment === "later") return { ...link, eligibleFrom: paper.number + 2, reason: "Maybe later; rests for one edition, then becomes eligible" };
    return { ...link, dormant: true, reason: "Presented and passed over; now dormant" };
  });
  return { ...state, links, paper: null, message: "Edition retired. All links remain; unseen inside links keep their previous eligibility." };
}

export function nextPaper(state: ReadingState): ReadingState {
  const retired = retire(state);
  const paper = compose(retired.links, retired.nextNumber);
  return { ...retired, paper, nextNumber: retired.nextNumber + 1,
    links: recordPresentation(retired.links, paper, paper.front, "front page"), message: `Edition ${paper.number} opened. Only its front page has been presented.` };
}

export function setCommitment(state: ReadingState, id: string, commitment: Commitment): ReadingState {
  return { ...state, links: state.links.map(link => link.id === id ? { ...link, commitment, dormant: false,
    eligibleFrom: commitment === "later" ? (state.paper?.number ?? state.nextNumber - 1) + 2 : state.nextNumber,
    reason: commitment === "pinned" ? "Explicitly pinned for later" : commitment === "later" ? "Maybe later; give it one edition of breathing room" : "Returned to the candidate pool" } : link),
    message: commitment === "pinned" ? "Pinned for later." : commitment === "later" ? "Set aside for another occasion." : "Returned to candidates." };
}
