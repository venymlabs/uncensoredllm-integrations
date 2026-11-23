# UncensoredLLM in Make

Make has no plugin a user can install from a file. What works today:

1. **The HTTP app's "Make a request" module** (HTTP version 4, the current one), set up by hand from the table below. Shortest path.
2. **Import the blueprint** `uncensoredllm-chat.blueprint.json`. It holds one module of the **HTTP (legacy)** app, version 3 (`http:ActionSendDataAPIKeyAuth`), the format real Make exports use. Make still runs version 3 modules.

A custom Make app (Make Apps SDK) is the native route; it is not built here because it can only be created and tested inside a Make account.

Sources, read 2026-11-23: the HTTP app page https://apps.make.com/http ("Make a request" fields, Authentication type options, timeout 1 to 300 seconds, HTTP legacy = version 3) and the API key keychain page https://apps.make.com/api-key-authentication-type (Key includes any prefix such as `Bearer`, placement, parameter name, "Restrict requests to service URLs"). The version 3 module's fields come from blueprints exported by Make and published on GitHub. **Neither route was run in a Make account.** The request body itself was sent to the live API and answered 200.

## 1. "Make a request" (HTTP v4)

Add **HTTP > Make a request** and set:

| Field | Value |
|---|---|
| Authentication type | API key |
| Credentials | Add a keychain: **Key** `Bearer vk-...` (the word Bearer, a space, your whole key); **API key placement** In the header; **API key parameter name** `Authorization`; **Restrict requests to service URLs** on, **Allowed service origins** `https://uncensoredllm.xyz` |
| URL | `https://uncensoredllm.xyz/v1/chat/completions` |
| Method | POST |
| Body content type | application/JSON |
| Body input method | JSON string |
| Body content | the JSON below |
| Parse response | Yes |
| Timeout (advanced) | 300 |

```json
{"model":"uncensoredllm-1","reasoning_mode":"fast","messages":[{"role":"user","content":"Write a two-line poem about the sea."}]}
```

Click **Run once**. The reply is at `data.choices[1].message.content` (Make counts array items from 1).

To map text from an earlier module into the prompt, choose **Body input method: Data structure** instead, so Make escapes quotes and new lines for you.

## 2. Import the blueprint

1. Create a scenario. In the editor, open the **...** menu and choose **Import Blueprint**, then pick `uncensoredllm-chat.blueprint.json`.
2. Open the HTTP module and add the keychain under **Credentials** exactly as in the table above.
3. Edit **Request content** and click **Run once**.

The key lives in Make's keychain, never in the scenario, so an exported blueprint does not carry it.

## Notes

- `reasoning_mode: "fast"` keeps the model's reasoning short. Drop it for harder prompts; the 300-second limit still applies.
- If you add `max_tokens`, use 512 or more: the model reasons before it answers, and a smaller budget can be spent on the reasoning alone, and the answer then comes back empty.
- To check a keychain without spending anything, send `GET https://uncensoredllm.xyz/v1/balance` with it.
