// Decodes the link the way Cherry Studio does (providersImport.ts at 7f5c102d) and checks the result passes the
// fields its import hook requires.
import test from "node:test";
import assert from "node:assert/strict";
import { makeLink, PROVIDER } from "./make-link.mjs";

function cherryDecode(link) {
  const url = new URL(link);
  assert.equal(url.protocol, "cherrystudio:");
  assert.equal(url.host, "providers");
  assert.equal(url.pathname, "/api-keys");
  const processedSearch = url.search.replaceAll("+", "_").replaceAll("/", "-");
  const params = new URLSearchParams(processedSearch);
  assert.equal(params.get("v"), "1");
  const b64 = params.get("data").replaceAll("_", "+").replaceAll("-", "/");
  return JSON.parse(Buffer.from(b64, "base64").toString("utf8"));
}

test("round-trips through Cherry Studio's decoder", () => {
  const d = cherryDecode(makeLink("vk-dummy-not-a-real-key"));
  assert.deepEqual(d, { ...PROVIDER, apiKey: "vk-dummy-not-a-real-key" });
  assert.ok(d.apiKey.length >= 1 && d.baseUrl.length >= 1);
});

test("a key with characters that base64-encode to + and / survives", () => {
  const key = "vk-???>>>~~~";
  assert.equal(cherryDecode(makeLink(key)).apiKey, key);
});

test("refuses an empty key", () => {
  assert.throws(() => makeLink(""));
});
