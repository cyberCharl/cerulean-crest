import type { LinkMetadata } from "./link-metadata.ts";
import { claimReadingMetadata, finishReadingMetadata } from "./reading-store.ts";

/** Durable claims; bounded work in Next after(). Interrupted work is reclaimed on a later visit. */
export async function processReadingMetadata(owner: string) {
  for (let i=0;i<3;i++) {
    const job=await claimReadingMetadata(owner);
    if(!job)break;
    let metadata: LinkMetadata | null=null;
    try {
      // Metadata is optional: even a parser loading failure must not prevent
      // signing in, viewing a paper, or saving a link.
      const { extractLinkMetadata } = await import("./link-metadata.ts");
      metadata=await extractLinkMetadata(job.url);
    } catch { /* The saved link remains useful without metadata. */ }
    await finishReadingMetadata(owner,job.url,job.token,metadata);
  }
}
