// Builds the Cherry Studio deep link that adds UncensoredLLM as a provider in one click:
//   cherrystudio://providers/api-keys?v=1&data=<base64 of {id, baseUrl, apiKey, name, type}>
// Format from src/main/services/protocol/handlers/providersImport.ts and
// src/renderer/pages/settings/ProviderSettings/hooks/useProviderDeepLinkImport.ts (apiKey and baseUrl must be non-empty),
// CherryHQ/cherry-studio at 7f5c102d924532a31c70e25b06d5798f67ca345f, read 2026-11-23.
//
//   UNCENSOREDLLM_API_KEY=vk-... node make-link.mjs          prints the link (it contains your key: open it, do not share it)
//
// Nothing is sent anywhere. Opening the link shows Cherry Studio's own confirmation popup before anything is saved.
import { pathToFileURL } from "node:url";

export const PROVIDER = Object.freeze({
  id: "uncensoredllm",
  baseUrl: "https://uncensoredllm.xyz/v1",
  name: "UncensoredLLM",
  type: "openai",
});

export function makeLink(apiKey, provider = PROVIDER) {
  if (!apiKey || !String(apiKey).trim()) throw new Error("a key is required: Cherry Studio rejects a link without one");
  const data = Buffer.from(JSON.stringify({ ...provider, apiKey: String(apiKey).trim() }), "utf8").toString("base64");
  return `cherrystudio://providers/api-keys?v=1&data=${encodeURIComponent(data)}`;
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  const key = process.env.UNCENSOREDLLM_API_KEY;
  if (!key) {
    console.error("Set UNCENSOREDLLM_API_KEY to your vk- key first.");
    process.exit(2);
  }
  console.log(makeLink(key));
}
