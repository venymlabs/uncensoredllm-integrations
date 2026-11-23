// Chatbox provider import: a JSON config (paste it with "Import from clipboard" in Settings > Model Provider) and the
// equivalent one-click deep link chatbox://provider/import?config=<base64 of the JSON>.
// Format from src/renderer/utils/provider-config.ts (CustomProviderConfigSchema; apiKey is optional),
// src/main/deeplinks.ts and src/renderer/routes/settings/provider/route.tsx (decodeBase64 after URL decoding),
// chatboxai/chatbox at 446bcf43e7a89a0411218821de54d87d7f3cfe11, read 2026-11-23.
// The config carries no key, so the link is safe to publish; the user pastes the key after importing.
//
//   node make-import.mjs           writes uncensoredllm.chatbox.json and deep-link.txt next to this file
import fs from "node:fs";
import { fileURLToPath, pathToFileURL } from "node:url";

export const CONFIG = Object.freeze({
  isCustom: true,
  id: "uncensoredllm",
  name: "UncensoredLLM",
  type: "openai",
  urls: {
    website: "https://uncensoredllm.xyz/?src=chatbox",
    getApiKey: "https://uncensoredllm.xyz/?src=chatbox",
    docs: "https://uncensoredllm.xyz/docs",
  },
  settings: {
    apiHost: "https://uncensoredllm.xyz/v1",
    models: [
      {
        modelId: "uncensoredllm-1",
        nickname: "UncensoredLLM 1",
        type: "chat",
        capabilities: ["reasoning", "tool_use"],
        contextWindow: 262144,
        maxOutput: 65536,
      },
    ],
  },
});

export function deepLink(config = CONFIG) {
  const b64 = Buffer.from(JSON.stringify(config), "utf8").toString("base64");
  return `chatbox://provider/import?config=${encodeURIComponent(b64)}`;
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  const dir = fileURLToPath(new URL(".", import.meta.url));
  fs.writeFileSync(dir + "uncensoredllm.chatbox.json", JSON.stringify(CONFIG, null, 2) + "\n");
  fs.writeFileSync(dir + "deep-link.txt", deepLink() + "\n");
  console.log("wrote uncensoredllm.chatbox.json and deep-link.txt");
}
