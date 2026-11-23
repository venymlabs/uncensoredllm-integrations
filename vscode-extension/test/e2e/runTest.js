// Runs the extension inside a downloaded copy of VS Code with a throwaway profile.
// Everything lands in .vscode-test/ next to the extension: the VS Code download, the user-data dir and
// the extensions dir. No real editor profile is read or written.
//   node test/e2e/runTest.js [version]      (default "stable"; e.g. 1.104.0 for the oldest supported)
"use strict";
const path = require("node:path");
const fs = require("node:fs");
const { runTests } = require("@vscode/test-electron");

async function main() {
  const version = process.argv[2] || "stable";
  const ext = path.resolve(__dirname, "../..");
  const sandbox = path.resolve(ext, ".vscode-test");
  const run = path.join(sandbox, `run-${version}-${Date.now()}`);
  fs.mkdirSync(path.join(run, "workspace"), { recursive: true });
  const resultFile = path.join(run, "result.json");
  // ULLM_E2E_EXE runs another VS Code build instead (for example VSCodium unpacked in the sandbox).
  const exe = process.env.ULLM_E2E_EXE;
  const code = await runTests({
    ...(exe ? { vscodeExecutablePath: exe } : { version }),
    cachePath: path.join(sandbox, "vscode-cache"),
    extensionDevelopmentPath: ext,
    extensionTestsPath: path.join(__dirname, "suite", "index.js"),
    extensionTestsEnv: { ULLM_E2E_RESULT: resultFile, ULLM_E2E_USERDATA: path.join(run, "user-data"), ULLM_E2E_LIVE_KEYFILE: process.env.ULLM_E2E_LIVE_KEYFILE || "" },
    launchArgs: [
      "--user-data-dir", path.join(run, "user-data"),
      "--extensions-dir", path.join(run, "extensions"),
      "--disable-workspace-trust",
      "--skip-welcome",
      "--skip-release-notes",
      "--disable-gpu",
      path.join(run, "workspace"),
    ],
  });
  console.log(`exit ${code}; results in ${resultFile}`);
  if (fs.existsSync(resultFile)) console.log(fs.readFileSync(resultFile, "utf8"));
  process.exit(code);
}

main().catch((err) => {
  console.error("e2e failed:", err && err.message);
  process.exit(1);
});
