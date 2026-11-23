// Checks the config against the fields of Chatbox's CustomProviderConfigSchema (provider-config.ts at 446bcf43) and
// decodes the deep link the way Chatbox does: URL.searchParams in the main process, then ' ' -> '+' and base64.
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { fileURLToPath } from "node:url";
import { CONFIG, deepLink } from "./make-import.mjs";

function chatboxDecode(link) {
  const url = new URL(link);
  assert.equal(url.hostname, "provider");
  assert.equal(url.pathname, "/import");
  const encoded = url.searchParams.get("config");
  return JSON.parse(Buffer.from(encoded.replaceAll(" ", "+"), "base64").toString("utf8"));
}

test("config has the shape CustomProviderConfigSchema requires", () => {
  assert.equal(CONFIG.isCustom, true);
  for (const k of ["id", "name", "type"]) assert.equal(typeof CONFIG[k], "string");
  assert.ok(["openai", "openai-responses", "anthropic"].includes(CONFIG.type));
  assert.equal(typeof CONFIG.settings.apiHost, "string");
  assert.equal(CONFIG.urls.website.startsWith("https://uncensoredllm.xyz"), true);
  for (const m of CONFIG.settings.models) {
    assert.equal(typeof m.modelId, "string");
    assert.ok(["chat", "embedding", "rerank", "image"].includes(m.type));
    for (const c of m.capabilities) assert.ok(["vision", "reasoning", "tool_use"].includes(c));
  }
  assert.equal(JSON.stringify(CONFIG).includes("vk-"), false, "no key in a publishable config");
});

test("the deep link round-trips through Chatbox's decoding", () => {
  assert.deepEqual(chatboxDecode(deepLink()), CONFIG);
});

test("the checked-in files match the generator", () => {
  const dir = new URL(".", import.meta.url);
  assert.deepEqual(JSON.parse(fs.readFileSync(fileURLToPath(new URL("uncensoredllm.chatbox.json", dir)), "utf8")), CONFIG);
  assert.equal(fs.readFileSync(fileURLToPath(new URL("deep-link.txt", dir)), "utf8").trim(), deepLink());
});
