// A local stand-in for the UncensoredLLM API, for tests. Scenario is picked by the last user message text:
//   "tool"     -> streams one tool call split across chunks (after a tool result is present: a text answer)
//   "fail401"  -> 401 JSON error            "fail429" -> 429 with retry-after
//   "midfail"  -> an SSE error event mid-stream
//   "empty"    -> a stream with no content   "slow" -> streams slowly (for cancellation)
//   anything else -> streams "Hello from fake" in three chunks, with reasoning_content first and SSE comments
"use strict";
const http = require("node:http");

const KEY = "vk-test-fake-key-123456";

function sse(res, events, { delay = 0 } = {}) {
  res.writeHead(200, { "content-type": "text/event-stream" });
  let i = 0;
  const next = () => {
    if (res.destroyed) return;
    if (i >= events.length) return res.end();
    res.write(events[i++]);
    delay ? setTimeout(next, delay) : setImmediate(next);
  };
  next();
}
const chunk = (delta, finish = null) => `data: ${JSON.stringify({ id: "c1", object: "chat.completion.chunk", choices: [{ index: 0, delta, finish_reason: finish }] })}\n\n`;

function start() {
  const requests = [];
  const server = http.createServer((req, res) => {
    let raw = "";
    req.on("data", (d) => (raw += d));
    req.on("end", () => {
      const auth = req.headers.authorization || "";
      const body = raw ? JSON.parse(raw) : null;
      requests.push({ method: req.method, url: req.url, auth: auth === `Bearer ${KEY}` ? "ok" : "bad", body });
      if (auth !== `Bearer ${KEY}`) {
        res.writeHead(401, { "content-type": "application/json" });
        return res.end(JSON.stringify({ error: { message: "Invalid API key.", type: "invalid_request_error", code: "invalid_api_key" } }));
      }
      if (req.method === "GET" && req.url === "/v1/models") {
        res.writeHead(200, { "content-type": "application/json" });
        return res.end(JSON.stringify({ object: "list", data: [{ id: "uncensoredllm-1", object: "model" }] }));
      }
      if (req.method === "GET" && req.url === "/v1/balance") {
        res.writeHead(200, { "content-type": "application/json" });
        return res.end(JSON.stringify({ balance_usd: 0.25, plan: "trial" }));
      }
      if (req.method !== "POST" || req.url !== "/v1/chat/completions") {
        res.writeHead(404);
        return res.end();
      }
      const msgs = body.messages || [];
      const lastUser = [...msgs].reverse().find((m) => m.role === "user");
      const hasToolResult = msgs.some((m) => m.role === "tool");
      const said = (lastUser && lastUser.content) || "";
      if (said.includes("fail401")) {
        res.writeHead(401, { "content-type": "application/json" });
        return res.end(JSON.stringify({ error: { message: "Invalid API key.", code: "invalid_api_key" } }));
      }
      if (said.includes("fail429")) {
        res.writeHead(429, { "content-type": "application/json", "retry-after": "7" });
        return res.end(JSON.stringify({ error: { message: "Slow down.", type: "rate_limit_error", code: "rate_limited" } }));
      }
      if (said.includes("midfail"))
        return sse(res, [chunk({ content: "Part" }), `data: ${JSON.stringify({ error: { message: "upstream cut", type: "server_error", code: "upstream_error" } })}\n\n`]);
      if (said.includes("empty")) return sse(res, [chunk({ role: "assistant" }), chunk({}, "stop"), "data: [DONE]\n\n"]);
      if (said.includes("tool") && !hasToolResult)
        return sse(res, [
          chunk({ role: "assistant", reasoning_content: "I should call the tool." }),
          chunk({ tool_calls: [{ index: 0, id: "call_abc", type: "function", function: { name: "get_time", arguments: "" } }] }),
          chunk({ tool_calls: [{ index: 0, function: { arguments: '{"zone":' } }] }),
          chunk({ tool_calls: [{ index: 0, function: { arguments: '"UTC"}' } }] }),
          chunk({}, "tool_calls"),
          "data: [DONE]\n\n",
        ]);
      if (said.includes("tool") && hasToolResult) {
        const result = msgs.filter((m) => m.role === "tool").pop().content;
        return sse(res, [chunk({ content: `The tool said: ${result}` }, "stop"), "data: [DONE]\n\n"]);
      }
      const delay = said.includes("slow") ? 200 : 0;
      const parts = said.includes("slow") ? Array.from({ length: 50 }, (_, i) => chunk({ content: `w${i} ` })) : [chunk({ content: "Hello " }), chunk({ content: "from " }), chunk({ content: "fake" })];
      return sse(
        res,
        [": keepalive\n\n", chunk({ role: "assistant", reasoning_content: "thinking..." }), ...parts, chunk({}, "stop"), `data: ${JSON.stringify({ choices: [], usage: { prompt_tokens: 5, completion_tokens: 3 } })}\n\n`, "data: [DONE]\n\n"],
        { delay },
      );
    });
  });
  return new Promise((resolve) =>
    server.listen(0, "127.0.0.1", () => {
      const { port } = server.address();
      resolve({ baseUrl: `http://127.0.0.1:${port}/v1`, key: KEY, requests, close: () => new Promise((r) => { server.closeAllConnections?.(); server.close(r); }) });
    }),
  );
}

module.exports = { start, KEY };
