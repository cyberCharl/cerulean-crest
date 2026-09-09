import assert from "node:assert/strict";
import test from "node:test";
import { parseReadingProgress, serializeReadingProgress } from "../lib/reading-progress.ts";

test("read state survives replacement IDs and drops removed articles", () => {
  const saved = serializeReadingProgress(new Set(["https://example.com/kept", "https://example.com/removed"]));
  const restored = parseReadingProgress(saved, [{ id: 99, url: "https://example.com/kept" }, { id: 100, url: "https://example.com/new" }]);
  assert.deepEqual([...restored], ["https://example.com/kept"]);
});

test("legacy IDs migrate only when present, and malformed storage is harmless", () => {
  const items = [{ id: 5, url: "https://example.com/article" }];
  assert.deepEqual([...parseReadingProgress("[5,6]", items)], [items[0].url]);
  for (const value of [null, "broken", "{}", '{"version":2,"urls":false}', '{"version":2,"urls":[null,3]}']) {
    assert.equal(parseReadingProgress(value, items).size, 0);
  }
});
