"""Exercise the pipe the way Open WebUI calls it: instantiate, set valves, call pipe().

Offline tests always run. Live tests need RUN_UNCENSOREDLLM_LIVE=1 and UNCENSOREDLLM_API_KEY,
and make one short request each, one after another.
"""

import asyncio
import importlib.util
import json
import os
import re
from pathlib import Path

import pytest

HERE = Path(__file__).resolve().parents[1]
SRC = HERE / "uncensoredllm_pipe.py"
spec = importlib.util.spec_from_file_location("uncensoredllm_pipe", SRC)
mod = importlib.util.module_from_spec(spec)
spec.loader.exec_module(mod)

API_KEY = os.getenv("UNCENSOREDLLM_API_KEY", "").strip()
LIVE = os.getenv("RUN_UNCENSOREDLLM_LIVE") == "1" and bool(API_KEY)
live = pytest.mark.skipif(not LIVE, reason="set RUN_UNCENSOREDLLM_LIVE=1 and UNCENSOREDLLM_API_KEY")


def run(coro):
    return asyncio.run(coro)


def test_frontmatter_is_first_and_parses():
    # Open WebUI reads the frontmatter from a docstring that must open the file
    # (backend/open_webui/utils/plugin.py, extract_frontmatter).
    text = SRC.read_text("utf-8")
    assert text.startswith('"""\n')
    block = text.split('"""')[1]
    fields = dict(re.findall(r"^\s*([a-z_]+):\s*(.*)$", block, re.M))
    for field in ("title", "author", "version", "license", "description"):
        assert fields.get(field), field
    assert "requirements" not in fields  # only httpx and pydantic, which Open WebUI already ships


def test_manifold_lists_one_model():
    p = mod.Pipe()
    assert p.pipes() == [{"id": "uncensoredllm-1", "name": "UncensoredLLM 1"}]


def test_key_valves_are_password_inputs():
    for cls in (mod.Pipe.Valves, mod.Pipe.UserValves):
        extra = cls.model_fields["API_KEY"].json_schema_extra
        assert extra == {"input": {"type": "password"}}


def test_payload_filters_and_floors_max_tokens():
    p = mod.Pipe()
    body = {
        "model": "uncensoredllm_pipe.uncensoredllm-1",
        "messages": [{"role": "user", "content": "hi"}],
        "stream": False,
        "max_tokens": 64,
        "metadata": {"chat_id": "x"},
        "user": {"id": "u"},
    }
    out = p._payload(body)
    assert out["model"] == "uncensoredllm-1"
    assert out["max_tokens"] == 512
    assert "metadata" not in out and "user" not in out
    assert out["reasoning_mode"] == "extended"


def test_user_key_overrides_admin_key():
    p = mod.Pipe()
    p.valves.API_KEY = "vk-admin"
    assert p._key({"valves": mod.Pipe.UserValves(API_KEY="vk-mine")}) == "vk-mine"
    assert p._key({"valves": mod.Pipe.UserValves()}) == "vk-admin"
    assert p._key(None) == "vk-admin"


def test_no_key_returns_a_message_without_a_request():
    out = run(mod.Pipe().pipe({"messages": [{"role": "user", "content": "hi"}]}, None))
    assert isinstance(out, str) and "no API key" in out


@live
def test_live_bad_key_is_reported():
    p = mod.Pipe()
    p.valves.API_KEY = "vk-not-a-real-key"
    out = run(p.pipe({"messages": [{"role": "user", "content": "hi"}], "stream": False}, None))
    assert isinstance(out, str) and "401" in out


@live
def test_live_blocking():
    p = mod.Pipe()
    p.valves.API_KEY = API_KEY
    p.valves.REASONING_MODE = "fast"
    out = run(p.pipe({"messages": [{"role": "user", "content": "Reply with the single word: ready"}], "stream": False}, None))
    assert isinstance(out, dict), out
    assert "ready" in out["choices"][0]["message"]["content"].lower()


@live
def test_live_streaming_via_user_valves():
    p = mod.Pipe()
    p.valves.REASONING_MODE = "fast"
    user = {"id": "u1", "valves": mod.Pipe.UserValves(API_KEY=API_KEY)}

    async def collect():
        gen = await p.pipe({"messages": [{"role": "user", "content": "Count from 1 to 5, digits only."}], "stream": True}, user)
        assert not isinstance(gen, str), gen
        return [line async for line in gen]

    lines = run(collect())
    data = [json.loads(l[5:]) for l in lines if l.startswith("data:") and "[DONE]" not in l]
    content = "".join((c["choices"][0]["delta"].get("content") or "") for c in data if c.get("choices"))
    reasoning = "".join((c["choices"][0]["delta"].get("reasoning_content") or "") for c in data if c.get("choices"))
    assert "5" in content
    assert lines[-1].strip() == "data: [DONE]"
    print(f"stream: {len(data)} chunks, {len(content)} content chars, {len(reasoning)} reasoning chars")
