"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { importReadingMarks } from "@/app/links/actions";
import type { ReadingLink } from "@/lib/reading";

function mergeLinks(current: ReadingLink[], incoming: ReadingLink[]) {
  const merged = new Map(current.map(link => [link.url, link]));
  for (const link of incoming) {
    const existing = merged.get(link.url);
    if (!existing || link.updatedAt >= existing.updatedAt) merged.set(link.url, link);
  }
  return [...merged.values()];
}

export function useReadingLinks(owner: string, initialLinks: ReadingLink[]) {
  const [links, setLinks] = useState(initialLinks);
  const [syncError, setSyncError] = useState("");
  const [pollVersion, setPollVersion] = useState(0);
  const migrationStarted = useRef(false);
  const updateLink = useCallback((link: ReadingLink) => {
    setLinks(current => mergeLinks(current, [link]));
  }, []);
  const refreshMetadata = useCallback(() => setPollVersion(value => value + 1), []);
  const pending = links.some(link => link.metadataStatus === "pending" || link.metadataStatus === "fetching");

  useEffect(() => {
    if (!pending) return;
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout>;
    const controller = new AbortController();
    let attempts = 0;
    async function poll() {
      if (cancelled) return;
      attempts += 1;
      try {
        const response = await fetch("/api/reading-links", { cache: "no-store", signal: controller.signal });
        if (response.status === 401 || response.status === 403) return;
        if (response.ok) {
          const data: { links: ReadingLink[] } = await response.json();
          if (cancelled) return;
          setLinks(current => mergeLinks(current, data.links));
          if (!data.links.some(link => link.metadataStatus === "pending" || link.metadataStatus === "fetching")) return;
        }
      } catch { /* Keep saved links usable if metadata refresh is temporarily offline. */ }
      if (!cancelled && attempts < 12) timer = setTimeout(poll, 5000);
    }
    timer = setTimeout(poll, 2000);
    return () => { cancelled = true; clearTimeout(timer); controller.abort(); };
  }, [pending, pollVersion]);

  useEffect(() => {
    if (migrationStarted.current) return;
    migrationStarted.current = true;
    const marker = `filtered:${encodeURIComponent(owner)}:read-import-v1`;
    let urls: string[] = [];
    try {
      if (localStorage.getItem(marker)) return;
      const prefix = `cerulean-crest:${encodeURIComponent(owner)}:`;
      const saved = new Set<string>();
      for (let index = 0; index < localStorage.length; index += 1) {
        const key = localStorage.key(index);
        if (!key?.startsWith(prefix) || !key.endsWith(":read")) continue;
        try {
          const value = JSON.parse(localStorage.getItem(key) ?? "null");
          if (value?.version === 2 && Array.isArray(value.urls)) {
            for (const url of value.urls) if (typeof url === "string") saved.add(url);
          }
        } catch { /* Ignore malformed entries; never read pre-account storage. */ }
      }
      urls = [...saved];
      if (!urls.length) { localStorage.setItem(marker, "done"); return; }
    } catch { return; }
    void (async () => {
      try {
        for (let offset = 0; offset < urls.length; offset += 1000) {
          const result = await importReadingMarks({ urls: urls.slice(offset, offset + 1000) });
          if (result.error) { setSyncError(result.error); return; }
        }
        try { localStorage.setItem(marker, "done"); } catch { /* Server migration is idempotent. */ }
        const response = await fetch("/api/reading-links", { cache: "no-store" });
        if (response.ok) {
          const data: { links: ReadingLink[] } = await response.json();
          setLinks(current => mergeLinks(current, data.links));
        }
      } catch { setSyncError("Older reading marks could not be synced. Reload to try again."); }
    })();
  }, [owner]);

  return { links, updateLink, refreshMetadata, syncError };
}
