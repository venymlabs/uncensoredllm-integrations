# UncensoredLLM in Zapier

Two routes:

1. **`uncensoredllm-zapier/`**: a Zapier Platform CLI integration (the format Zapier's own developer platform uses). Actions: **Send Prompt** (create) and **Get Balance** (search). The key is a password field of the Zapier connection; the connection test calls `GET /v1/balance`, which costs nothing. It has not been pushed to Zapier yet, so it is not installable from Zapier's directory.
2. **Webhooks by Zapier** (works today, no integration needed): the recipe below.

## Tested

- `zapier-platform-core` 19.3.0 `validate` command (the same schema check `zapier validate` runs locally): no errors.
- Jest with `createAppTester` against the live API: auth test rejects a bad key, accepts a good one, Send Prompt returns the reply.
- Not run: `zapier push`, `zapier validate`'s online style checks, and a real Zap (they need a Zapier account).

## Webhooks by Zapier recipe

Sources, read 2026-11-23: Zapier's operating constraints (https://docs.zapier.com/integrations/build/operating-constraints, 30 seconds for a create or search action) and troubleshooting page (https://docs.zapier.com/platform/build/troubleshoot-action-timeouts). The Custom Request field names are from Zapier's action editor as described in its community answers; the help article itself was not read. Not run in a Zap.

Add an action **Webhooks by Zapier > Custom Request** and set:

| Field | Value |
|---|---|
| Method | `POST` |
| URL | `https://uncensoredllm.xyz/v1/chat/completions` |
| Data | the JSON below |
| Headers | `Authorization` = `Bearer vk-...`; `Content-Type` = `application/json` |

```json
{"model":"uncensoredllm-1","reasoning_mode":"fast","messages":[{"role":"user","content":"Write a two-line poem about the sea."}]}
```

The reply is in `choices[0].message.content` (Zapier shows it as *Choices Message Content*).

Notes:

- A Zapier action has a 30-second limit, and it cannot be raised. `reasoning_mode: "fast"` keeps the model's reasoning short so most replies fit; a long answer can still run out of time.
- Webhooks by Zapier keeps the header value in the Zap, not in a connection. Anyone who can edit the Zap can read the key. The CLI integration keeps it in a connection instead.
- If you set `max_tokens`, use 512 or more.
