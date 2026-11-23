// UncensoredLLM for VS Code: contributes the model "UncensoredLLM 1" to the editor's language model list
// through the stable Language Model Chat Provider API (vscode.lm.registerLanguageModelChatProvider).
// The API key lives in VS Code's secret storage only. No telemetry; the log holds status lines, never
// prompts, answers or the key.
"use strict";

const vscode = require("vscode");
const core = require("./core");

const VENDOR = "uncensoredllm";
const SECRET = "uncensoredllm.apiKey";

let log; // OutputChannel

function baseUrl() {
  const raw = vscode.workspace.getConfiguration("uncensoredllm").get("baseUrl") || core.DEFAULT_BASE_URL;
  const ok = core.normalizeBaseUrl(raw);
  if (!ok) throw new core.ApiError(`UncensoredLLM: the setting uncensoredllm.baseUrl ("${raw}") must be an https address.`);
  return ok;
}

function line(s) {
  log?.appendLine(`[${new Date().toISOString()}] ${s}`);
}

class UncensoredLLMProvider {
  constructor(context) {
    this.context = context;
    this._onDidChange = new vscode.EventEmitter();
    this.onDidChangeLanguageModelChatInformation = this._onDidChange.event;
    context.subscriptions.push(
      this._onDidChange,
      context.secrets.onDidChange((e) => {
        if (e.key === SECRET) this._onDidChange.fire();
      }),
    );
  }

  async provideLanguageModelChatInformation(options) {
    let key = await this.context.secrets.get(SECRET);
    if (!key && options && options.silent === false) key = await promptForKey(this.context);
    if (!key) return [];
    return [{ ...core.MODEL, capabilities: { ...core.MODEL.capabilities } }];
  }

  async provideLanguageModelChatResponse(model, messages, options, progress, token) {
    const apiKey = await this.context.secrets.get(SECRET);
    if (!apiKey) throw new Error("UncensoredLLM: no API key. Run \"UncensoredLLM: Set API Key\".");
    const ac = new AbortController();
    const sub = token.onCancellationRequested(() => ac.abort());
    try {
      const body = core.buildRequest({
        model: core.MODEL,
        messages,
        options,
        reasoningMode: vscode.workspace.getConfiguration("uncensoredllm").get("reasoningMode"),
      });
      line(`request: ${messages.length} message(s), ${body.tools ? body.tools.length : 0} tool(s), from ${options.requestInitiator || "the editor"}`);
      const r = await core.streamChat({
        baseUrl: baseUrl(),
        apiKey,
        body,
        signal: ac.signal,
        report: (part) => progress.report(part),
        deps: {
          makeText: (v) => new vscode.LanguageModelTextPart(v),
          makeToolCall: (id, name, input) => new vscode.LanguageModelToolCallPart(id, name, input),
          log: line,
        },
      });
      if (r.cancelled) line("cancelled");
    } catch (err) {
      line(`error: ${err && err.message}`);
      throw err;
    } finally {
      sub.dispose();
    }
  }

  async provideTokenCount(_model, text) {
    return core.estimateTokens(text);
  }
}

async function promptForKey(context) {
  const value = await vscode.window.showInputBox({
    title: "UncensoredLLM API key",
    prompt: "Paste a key from uncensoredllm.xyz/dashboard/keys. It is kept in VS Code's secret storage.",
    placeHolder: "vk-…",
    password: true,
    ignoreFocusOut: true,
    validateInput: (v) => (core.looksLikeKey(v) ? null : "A key starts with vk-"),
  });
  if (!value) return undefined;
  const key = value.trim();
  await context.secrets.store(SECRET, key);
  line("API key saved to secret storage");
  return key;
}

async function checkConnectionCommand(context) {
  const apiKey = await context.secrets.get(SECRET);
  if (!apiKey) {
    const pick = await vscode.window.showWarningMessage("UncensoredLLM: no API key is set.", "Set API Key", "Get a Key");
    if (pick === "Set API Key") await vscode.commands.executeCommand("uncensoredllm.setApiKey");
    if (pick === "Get a Key") await vscode.env.openExternal(vscode.Uri.parse(core.KEYS_URL));
    return { ok: false, reason: "no-key" };
  }
  try {
    const r = await vscode.window.withProgress(
      { location: vscode.ProgressLocation.Notification, title: "UncensoredLLM: checking the connection…" },
      () => core.checkConnection({ baseUrl: baseUrl(), apiKey }),
    );
    const has = r.models.includes(core.MODEL.id);
    const bal = r.balance && typeof r.balance.balance_usd === "number" ? ` Balance: $${r.balance.balance_usd.toFixed(2)}.` : "";
    const msg = has
      ? `UncensoredLLM: connected. ${core.MODEL.name} is available.${bal}`
      : `UncensoredLLM: connected, but the model list does not include ${core.MODEL.id}.${bal}`;
    line(`check: ok, models=${r.models.join(",")}`);
    vscode.window.showInformationMessage(msg);
    return { ok: true, models: r.models, balance: r.balance ? r.balance.balance_usd : null };
  } catch (err) {
    line(`check: ${err.message}`);
    vscode.window.showErrorMessage(err.message);
    return { ok: false, reason: err.message, status: err.status };
  }
}

async function manageCommand(context) {
  const has = !!(await context.secrets.get(SECRET));
  const items = [
    { label: has ? "$(key) Replace API Key" : "$(key) Set API Key", id: "set" },
    { label: "$(plug) Check Connection", id: "check" },
    { label: "$(link-external) Get a Key on uncensoredllm.xyz", id: "get" },
    { label: "$(output) Show Log", id: "log" },
  ];
  if (has) items.splice(1, 0, { label: "$(trash) Remove API Key", id: "remove" });
  const pick = await vscode.window.showQuickPick(items, { title: "UncensoredLLM", placeHolder: has ? "A key is set" : "No key yet" });
  if (!pick) return;
  if (pick.id === "set") return vscode.commands.executeCommand("uncensoredllm.setApiKey");
  if (pick.id === "remove") return vscode.commands.executeCommand("uncensoredllm.removeApiKey");
  if (pick.id === "check") return vscode.commands.executeCommand("uncensoredllm.checkConnection");
  if (pick.id === "get") return vscode.env.openExternal(vscode.Uri.parse(core.KEYS_URL));
  if (pick.id === "log") return log.show(true);
}

function activate(context) {
  log = vscode.window.createOutputChannel("UncensoredLLM");
  context.subscriptions.push(log);
  const provider = new UncensoredLLMProvider(context);
  context.subscriptions.push(
    vscode.lm.registerLanguageModelChatProvider(VENDOR, provider),
    vscode.commands.registerCommand("uncensoredllm.manage", () => manageCommand(context)),
    vscode.commands.registerCommand("uncensoredllm.setApiKey", async (testKey) => {
      // Only the extension test runner may pass a key as an argument; everyone else gets the input box.
      if (context.extensionMode === vscode.ExtensionMode.Test && core.looksLikeKey(testKey)) {
        await context.secrets.store(SECRET, testKey.trim());
        return true;
      }
      const key = await promptForKey(context);
      if (key) vscode.window.showInformationMessage("UncensoredLLM: key saved. Pick \"UncensoredLLM 1\" in the chat model picker.");
      return !!key;
    }),
    vscode.commands.registerCommand("uncensoredllm.removeApiKey", async () => {
      await context.secrets.delete(SECRET);
      line("API key removed from secret storage");
      vscode.window.showInformationMessage("UncensoredLLM: key removed.");
    }),
    vscode.commands.registerCommand("uncensoredllm.checkConnection", () => checkConnectionCommand(context)),
    vscode.commands.registerCommand("uncensoredllm.getApiKey", () => vscode.env.openExternal(vscode.Uri.parse(core.KEYS_URL))),
  );
  line(`activated (VS Code ${vscode.version})`);
}

function deactivate() {}

module.exports = { activate, deactivate };
