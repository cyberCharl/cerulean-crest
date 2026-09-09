type ReadingItem = { id: number; url: string };

export function parseReadingProgress(value: string | null, items: ReadingItem[]): Set<string> {
  try {
    const stored: unknown = JSON.parse(value || "null");
    // Upgrade the old item-ID format using only IDs that still exist.
    if (Array.isArray(stored)) {
      return new Set(items.filter((item) => stored.includes(item.id)).map((item) => item.url));
    }
    if (stored && typeof stored === "object" && "version" in stored && stored.version === 2
      && "urls" in stored && Array.isArray(stored.urls)) {
      const urls = new Set(stored.urls.filter((url): url is string => typeof url === "string"));
      return new Set(items.filter((item) => urls.has(item.url)).map((item) => item.url));
    }
  } catch { /* Invalid or unavailable browser storage starts empty. */ }
  return new Set();
}

export function serializeReadingProgress(urls: Set<string>): string {
  return JSON.stringify({ version: 2, urls: [...urls] });
}
