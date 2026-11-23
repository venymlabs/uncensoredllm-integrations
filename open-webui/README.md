# UncensoredLLM pipe for Open WebUI

`uncensoredllm_pipe.py` is an Open WebUI **Pipe function** (a "manifold" with one model). It adds **UncensoredLLM 1** to the model list.

Open WebUI can also reach the API with no function at all, as an OpenAI connection (Admin Settings > Connections, URL `https://uncensoredllm.xyz/v1`). The pipe adds what a connection cannot:

- **Per-user keys.** The admin can set one key for everyone, or leave it empty and let each user set their own under **Controls > Valves**. Both are password fields.
- **Safe defaults.** `max_tokens` below 512 is raised to 512 (the model reasons first; a smaller budget can end in `502 empty_completion`), and a **Reasoning** valve (`extended` or `fast`).
- **Clean requests.** Only the chat completion fields the API understands are forwarded; Open WebUI's own metadata stays local.

Streaming, reasoning (shown as Open WebUI's thinking block) and tool calls pass through untouched.

## Install

1. **Admin Panel > Functions > +** (New Function). Paste the file, or use **Import** with the file.
2. Save, then switch the function on.
3. Click the gear (Valves) and paste an `API_KEY`, or tell users to set their own.
4. Pick **UncensoredLLM 1** in a new chat.

Requirements: none beyond what Open WebUI ships (`httpx`, `pydantic`). Docs followed: https://docs.openwebui.com (Pipe function and Valves pages, `docs/features/extensibility/plugin/` in the open-webui/docs repository, read 2026-11-23).

## Tested

`tests/test_pipe.py` loads the file the way Open WebUI does (module from source, `Pipe()`, valves set, `await pipe(body, __user__)`), with `httpx` and `pydantic` in a sandbox venv:

- offline: frontmatter first and complete, one model listed, key valves are password inputs, payload filtering and the 512 floor, user key overrides admin key, no key gives a message without a request;
- live: bad key reported as 401, a blocking reply, and a stream through a user's own key (56 chunks, reasoning and content, ending in `data: [DONE]`).

Open WebUI itself was not run (its pip install pulls several GB of machine-learning packages), so the rendering inside a real chat is not verified.
