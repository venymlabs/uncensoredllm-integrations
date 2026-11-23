"""
title: UncensoredLLM
author: UncensoredLLM
author_url: https://uncensoredllm.xyz
funding_url: https://uncensoredllm.xyz
version: 0.1.0
license: MIT
description: Adds UncensoredLLM 1 (uncensoredllm.xyz) as a model. One uncensored LLM, served from our own GPUs, through an OpenAI-compatible API. The admin can set one key for everyone, or each user can bring their own.
"""

# Open WebUI pipe function. Install: Admin Panel > Functions > New Function (paste this file)
# or Import Functions; then set the API key under the function's Valves.
#
# What it sends, and where: the chat messages and settings of a request go to the base URL in
# the valves (https://uncensoredllm.xyz/v1 by default) with the key as a Bearer header. Nothing
# else is sent anywhere, nothing is logged, and the key is never printed.

import json
from typing import AsyncGenerator, Literal, Optional, Union

import httpx
from pydantic import BaseModel, Field

DEFAULT_BASE_URL = "https://uncensoredllm.xyz/v1"
MODEL_ID = "uncensoredllm-1"
MODEL_NAME = "UncensoredLLM 1"
# The model reasons before it answers. A budget under about 400 tokens can be spent on the
# reasoning alone (the API answers 502 empty_completion), so a smaller max_tokens is raised.
MIN_MAX_TOKENS = 512

# Request fields the API understands. Everything else Open WebUI puts in the body stays here.
FORWARD = (
    "messages",
    "stream",
    "temperature",
    "top_p",
    "max_tokens",
    "max_completion_tokens",
    "stop",
    "seed",
    "presence_penalty",
    "frequency_penalty",
    "tools",
    "tool_choice",
    "response_format",
    "reasoning_mode",
    "n",
)


class Pipe:
    class Valves(BaseModel):
        API_KEY: str = Field(
            default="",
            description="UncensoredLLM API key (starts with vk-). Used for every user who has not set their own.",
            json_schema_extra={"input": {"type": "password"}},
        )
        BASE_URL: str = Field(default=DEFAULT_BASE_URL, description="Leave as it is unless you were given another address.")
        REASONING_MODE: Literal["extended", "fast"] = Field(
            default="extended",
            description="How much the model reasons before it answers. 'fast' keeps the reasoning short.",
        )
        TIMEOUT_SECONDS: int = Field(default=600, description="How long to wait for a reply.")

    class UserValves(BaseModel):
        API_KEY: str = Field(
            default="",
            description="Your own UncensoredLLM key. Leave empty to use the one the admin set.",
            json_schema_extra={"input": {"type": "password"}},
        )

    def __init__(self):
        self.type = "manifold"
        self.valves = self.Valves()

    def pipes(self):
        return [{"id": MODEL_ID, "name": MODEL_NAME}]

    def _key(self, user: Optional[dict]) -> str:
        user_valves = (user or {}).get("valves")
        own = getattr(user_valves, "API_KEY", "") if user_valves is not None else ""
        return (own or self.valves.API_KEY or "").strip()

    def _payload(self, body: dict) -> dict:
        payload = {k: body[k] for k in FORWARD if k in body and body[k] is not None}
        payload["model"] = MODEL_ID
        payload.setdefault("reasoning_mode", self.valves.REASONING_MODE)
        for field in ("max_tokens", "max_completion_tokens"):
            value = payload.get(field)
            if isinstance(value, int) and value < MIN_MAX_TOKENS:
                payload[field] = MIN_MAX_TOKENS
        return payload

    async def pipe(self, body: dict, __user__: Optional[dict] = None) -> Union[str, dict, AsyncGenerator[str, None]]:
        key = self._key(__user__)
        if not key:
            return "UncensoredLLM: no API key. An admin can set one in this function's Valves, or set your own under Controls > Valves."

        url = f"{self.valves.BASE_URL.rstrip('/')}/chat/completions"
        headers = {"Authorization": f"Bearer {key}", "Content-Type": "application/json"}
        payload = self._payload(body)
        timeout = httpx.Timeout(self.valves.TIMEOUT_SECONDS, connect=15)

        if payload.get("stream"):

            async def stream() -> AsyncGenerator[str, None]:
                async with httpx.AsyncClient(timeout=timeout) as client:
                    async with client.stream("POST", url, json=payload, headers=headers) as r:
                        if r.status_code != 200:
                            text = (await r.aread()).decode("utf-8", "replace")
                            yield f"UncensoredLLM error {r.status_code}: {_error_text(text)}"
                            return
                        # Pass the server-sent events through untouched: Open WebUI reads
                        # delta.content, delta.reasoning_content and delta.tool_calls itself.
                        async for line in r.aiter_lines():
                            if line:
                                yield line + "\n"

            return stream()

        try:
            async with httpx.AsyncClient(timeout=timeout) as client:
                r = await client.post(url, json=payload, headers=headers)
        except httpx.HTTPError as e:
            return f"UncensoredLLM: could not reach {self.valves.BASE_URL}: {type(e).__name__}"
        if r.status_code != 200:
            return f"UncensoredLLM error {r.status_code}: {_error_text(r.text)}"
        return r.json()


def _error_text(text: str) -> str:
    try:
        err = json.loads(text).get("error", {})
        if isinstance(err, dict):
            return str(err.get("message") or err.get("code") or text[:300])
        return str(err)
    except Exception:
        return text[:300]
