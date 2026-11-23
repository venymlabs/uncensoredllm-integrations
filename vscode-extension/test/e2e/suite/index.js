// Runs inside the VS Code extension host. Drives the provider the way another extension (Cline's
// "VS Code LM API" provider, for example) or the chat view does: vscode.lm.selectChatModels + sendRequest.
// The fake API server runs in this process. Results go to ULLM_E2E_RESULT.
"use strict";
const vscode = require("vscode");
const fs = require("node:fs");
const path = require("node:path");
const assert = require("node:assert/strict");
const fake = require("../../fake-server");

const results = [];
async function step(name, fn) {
  const t = Date.now();
  try {
    const detail = await fn();
    results.push({ name, ok: true, ms: Date.now() - t, detail: detail ?? null });
  } catch (err) {
    results.push({ name, ok: false, ms: Date.now() - t, error: String(err && err.stack || err) });
  }
}

function waitForModels(want, timeout = 10000) {
  return new Promise((resolve, reject) => {
    const started = Date.now();
    const poll = async () => {
      const models = await vscode.lm.selectChatModels({ vendor: "uncensoredllm" });
      if (models.length === want) return resolve(models);
      if (Date.now() - started > timeout) return reject(new Error(`expected ${want} model(s), have ${models.length}`));
      setTimeout(poll, 200);
    };
    poll();
  });
}

async function collect(response) {
  const text = [];
  const calls = [];
  for await (const part of response.stream) {
    if (part instanceof vscode.LanguageModelTextPart) text.push(part.value);
    else if (part instanceof vscode.LanguageModelToolCallPart) calls.push({ callId: part.callId, name: part.name, input: part.input });
  }
  return { text: text.join(""), calls };
}

async function run() {
  const srv = await fake.start();
  const cts = new vscode.CancellationTokenSource();
  try {
    await step("environment", async () => ({ vscode: vscode.version, appName: vscode.env.appName }));

    await step("extension activates", async () => {
      const ext = vscode.extensions.getExtension("uncensoredllm.uncensoredllm");
      assert.ok(ext, "extension not found");
      await ext.activate();
      assert.ok(ext.isActive);
      const cmds = await vscode.commands.getCommands(true);
      for (const c of ["uncensoredllm.manage", "uncensoredllm.setApiKey", "uncensoredllm.removeApiKey", "uncensoredllm.checkConnection", "uncensoredllm.getApiKey"]) assert.ok(cmds.includes(c), c);
    });

    await step("base URL pointed at the local fake server (user settings)", async () => {
      await vscode.workspace.getConfiguration("uncensoredllm").update("baseUrl", srv.baseUrl, vscode.ConfigurationTarget.Global);
      return srv.baseUrl;
    });

    await step("no key: no model offered", async () => {
      const models = await vscode.lm.selectChatModels({ vendor: "uncensoredllm" });
      assert.equal(models.length, 0);
    });

    await step("key saved to secret storage: model appears with the right metadata", async () => {
      assert.equal(await vscode.commands.executeCommand("uncensoredllm.setApiKey", srv.key), true);
      const [m] = await waitForModels(1);
      assert.equal(m.id, "uncensoredllm-1");
      assert.equal(m.name, "UncensoredLLM 1");
      assert.equal(m.vendor, "uncensoredllm");
      assert.equal(m.family, "uncensoredllm");
      assert.equal(m.maxInputTokens, 196608);
      return { id: m.id, name: m.name, vendor: m.vendor, family: m.family, version: m.version, maxInputTokens: m.maxInputTokens };
    });

    await step("key is not in settings.json", async () => {
      const settings = path.join(process.env.ULLM_E2E_USERDATA, "User", "settings.json");
      const txt = fs.existsSync(settings) ? fs.readFileSync(settings, "utf8") : "";
      assert.ok(!txt.includes(srv.key), "key leaked into settings.json");
      assert.ok(!txt.includes("vk-"), "a vk- string is in settings.json");
      return { settingsJson: txt.trim() };
    });

    const [model] = await vscode.lm.selectChatModels({ vendor: "uncensoredllm" });

    await step("streamed text answer through vscode.lm", async () => {
      const r = await model.sendRequest([vscode.LanguageModelChatMessage.User("hello")], {}, cts.token);
      const out = await collect(r);
      assert.equal(out.text, "Hello from fake");
      const sent = srv.requests.filter((q) => q.url === "/v1/chat/completions").at(-1);
      assert.equal(sent.auth, "ok");
      assert.equal(sent.body.model, "uncensoredllm-1");
      assert.equal(sent.body.stream, true);
      return out;
    });

    await step("tool call, then the tool result round-trips", async () => {
      const tools = [{ name: "get_time", description: "Current time", inputSchema: { type: "object", properties: { zone: { type: "string" } } } }];
      const first = await collect(await model.sendRequest([vscode.LanguageModelChatMessage.User("use the tool")], { tools, toolMode: vscode.LanguageModelChatToolMode.Auto }, cts.token));
      assert.equal(first.calls.length, 1);
      assert.deepEqual(first.calls[0], { callId: "call_abc", name: "get_time", input: { zone: "UTC" } });
      const sentTools = srv.requests.filter((q) => q.url === "/v1/chat/completions").at(-1).body.tools;
      assert.equal(sentTools[0].function.name, "get_time");
      const second = await collect(
        await model.sendRequest(
          [
            vscode.LanguageModelChatMessage.User("use the tool"),
            vscode.LanguageModelChatMessage.Assistant([new vscode.LanguageModelToolCallPart("call_abc", "get_time", { zone: "UTC" })]),
            vscode.LanguageModelChatMessage.User([new vscode.LanguageModelToolResultPart("call_abc", [new vscode.LanguageModelTextPart("12:00 UTC")])]),
          ],
          { tools },
          cts.token,
        ),
      );
      assert.equal(second.text, "The tool said: 12:00 UTC");
      return { first, second };
    });

    await step("API errors reach the caller with a clear message", async () => {
      let msg = null;
      try {
        await collect(await model.sendRequest([vscode.LanguageModelChatMessage.User("fail429")], {}, cts.token));
      } catch (err) {
        msg = String(err && err.message);
      }
      assert.ok(msg && /rate limited/.test(msg), `got: ${msg}`);
      assert.ok(!msg.includes(srv.key));
      return msg;
    });

    await step("cancellation stops a slow stream", async () => {
      const c = new vscode.CancellationTokenSource();
      const r = await model.sendRequest([vscode.LanguageModelChatMessage.User("slow")], {}, c.token);
      let n = 0;
      const t = Date.now();
      try {
        for await (const part of r.stream) {
          if (part instanceof vscode.LanguageModelTextPart && ++n === 2) c.cancel();
        }
      } catch {}
      // VS Code 1.104.0 did not pass the caller's cancellation on to the provider (all 50 chunks arrived);
      // 1.143 (VSCodium) and 1.147 do. Recorded there, asserted from 1.143 on.
      const [maj, min] = vscode.version.split(".").map(Number);
      const propagated = n < 50;
      if (maj > 1 || min >= 143) assert.ok(propagated, `got ${n} chunks`);
      return { chunks: n, ms: Date.now() - t, propagated };
    });

    await step("token count", async () => {
      const n = await model.countTokens("abcdefgh", cts.token);
      assert.equal(n, 2);
    });

    await step("check connection command", async () => {
      const r = await vscode.commands.executeCommand("uncensoredllm.checkConnection");
      assert.equal(r.ok, true);
      assert.deepEqual(r.models, ["uncensoredllm-1"]);
      return r;
    });

    await step("workspace settings cannot redirect the key (baseUrl is application-scoped)", async () => {
      const insp = vscode.workspace.getConfiguration("uncensoredllm").inspect("baseUrl");
      let threw = false;
      try {
        await vscode.workspace.getConfiguration("uncensoredllm").update("baseUrl", "https://example.invalid/v1", vscode.ConfigurationTarget.Workspace);
      } catch {
        threw = true;
      }
      const after = vscode.workspace.getConfiguration("uncensoredllm").get("baseUrl");
      assert.equal(after, srv.baseUrl);
      return { workspaceWriteRejected: threw, defaultValue: insp.defaultValue };
    });

    await step("remove key: model goes away", async () => {
      await vscode.commands.executeCommand("uncensoredllm.removeApiKey");
      await waitForModels(0);
    });

    if (process.env.ULLM_E2E_LIVE_KEYFILE) {
      await step("LIVE: one short call to uncensoredllm.xyz through vscode.lm", async () => {
        const { key } = JSON.parse(fs.readFileSync(process.env.ULLM_E2E_LIVE_KEYFILE, "utf8"));
        await vscode.workspace.getConfiguration("uncensoredllm").update("baseUrl", undefined, vscode.ConfigurationTarget.Global);
        await vscode.commands.executeCommand("uncensoredllm.setApiKey", key);
        const [m] = await waitForModels(1);
        const check = await vscode.commands.executeCommand("uncensoredllm.checkConnection");
        assert.equal(check.ok, true);
        assert.ok(check.models.includes("uncensoredllm-1"));
        const t = Date.now();
        const out = await collect(await m.sendRequest([vscode.LanguageModelChatMessage.User("Reply with the single word: pong")], {}, cts.token));
        assert.ok(out.text.length > 0);
        await vscode.commands.executeCommand("uncensoredllm.removeApiKey");
        return { text: out.text.slice(0, 80), ms: Date.now() - t, check: { models: check.models, balanceKnown: typeof check.balance === "number" } };
      });
    }
  } finally {
    await srv.close();
    fs.writeFileSync(process.env.ULLM_E2E_RESULT, JSON.stringify({ passed: results.filter((r) => r.ok).length, failed: results.filter((r) => !r.ok).length, results }, null, 2));
  }
  const failed = results.filter((r) => !r.ok);
  if (failed.length) throw new Error(`${failed.length} step(s) failed: ${failed.map((f) => f.name).join("; ")}`);
}

module.exports = { run };
