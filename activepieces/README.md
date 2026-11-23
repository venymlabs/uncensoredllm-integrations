# UncensoredLLM piece for Activepieces

`piece-uncensoredllm/` is an Activepieces piece (TypeScript, `@activepieces/pieces-framework`). Actions:

- **Ask UncensoredLLM**: prompt, optional system message, Reasoning (`extended`/`fast`), Maximum Tokens (raised to 512 if lower), Temperature, JSON Output, Include Reasoning. Returns `text`, `finish_reason`, `usage`.
- **Get Balance**: the account's credit, plan and this key's spend.

Auth is a **Secret Text** connection (Activepieces stores it encrypted). The connection check calls `GET /v1/balance`, which costs nothing.

Requests use Node's `fetch`, not the `httpClient` from `@activepieces/pieces-common`: in version 0.12.5 that client sets `process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0'` on every request (see `src/lib/http/axios/axios-http-client.js`), which would send the key without checking the server certificate. For the same reason the piece has no generic "Custom API Call" action. A test asserts that TLS checks stay on after the piece's requests.

## Install

Activepieces' docs (`docs/build-pieces/sharing-pieces/` in its repository, read 2026-11-23) give three ways:

- **Contribute (everyone gets it):** a pull request adding `packages/pieces/community/uncensoredllm`; after merge Activepieces' own action publishes `@activepieces/piece-uncensoredllm` to npm and the piece appears for all users.
- **Community npm:** publish under our own scope (for example `@uncensoredllm/piece-uncensoredllm`); any user installs it from **Settings > My Pieces > Install Piece** by typing the package name.
- **Private tarball (an enterprise feature):** **Platform Admin > Pieces**, upload a packed archive such as `dist/activepieces-piece-uncensoredllm-0.0.1.tgz`. The docs build that archive with the monorepo's `npm run pieces -- build`; this one was packed with `npm pack` from a standalone build and was not uploaded anywhere.

Built against the framework versions on npm (`@activepieces/pieces-framework` 0.32.0, `@activepieces/shared` 0.95.1). The repository's `main` has moved on (framework 0.44.0: `PieceCategory` is exported from the framework, and actions take an optional `classification`); a pull request there needs those two small edits.

## Tested

`npm run build` (tsc, strict) and `npm test` (`node --test`, live): metadata, bad key rejected (401), good key accepted, Get Balance, Ask (reply "ready", finish `stop`), TLS still on. Activepieces itself was not run: a local instance needs the monorepo or Docker with Postgres and Redis, and the archive upload screen was not exercised.
