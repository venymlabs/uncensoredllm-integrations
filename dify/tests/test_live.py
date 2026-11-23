"""Live tests against the UncensoredLLM API.

Opt in with RUN_UNCENSOREDLLM_LIVE=1 and UNCENSOREDLLM_API_KEY. Each test makes
at most one short request; they run one after another.
"""

import json
import os
import sys
from pathlib import Path

import pytest
import yaml
from dify_plugin.entities.model import AIModelEntity
from dify_plugin.entities.model.llm import LLMResultChunk
from dify_plugin.entities.model.message import PromptMessageTool, UserPromptMessage
from dify_plugin.errors.model import CredentialsValidateFailedError

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

from models.llm.llm import UncensoredLLMLargeLanguageModel  # noqa: E402

API_KEY = os.getenv("UNCENSOREDLLM_API_KEY", "").strip()
LIVE = os.getenv("RUN_UNCENSOREDLLM_LIVE") == "1"
pytestmark = pytest.mark.skipif(not (API_KEY and LIVE), reason="set RUN_UNCENSOREDLLM_LIVE=1 and UNCENSOREDLLM_API_KEY")

MODEL = "uncensoredllm-1"
schema = AIModelEntity.model_validate(yaml.safe_load((ROOT / "models" / "llm" / f"{MODEL}.yaml").read_text("utf-8")))
llm = UncensoredLLMLargeLanguageModel(model_schemas=[schema])


class _Creds(dict):
    def __repr__(self) -> str:  # never print the key
        return "UncensoredLLM test credentials"

    __str__ = __repr__


def creds(**extra) -> dict:
    return _Creds(api_key=API_KEY, **extra)


def test_validate_good_key() -> None:
    llm.validate_credentials(MODEL, creds())


def test_validate_bad_key() -> None:
    with pytest.raises(CredentialsValidateFailedError):
        llm.validate_credentials(MODEL, _Creds(api_key="vk-not-a-real-key"))


def test_blocking_call() -> None:
    # The plugin SDK hands even a blocking result back as chunks.
    chunks = list(
        llm.invoke(
            model=MODEL,
            credentials=creds(),
            prompt_messages=[UserPromptMessage(content="Reply with the single word: ready")],
            model_parameters={"max_tokens": 1024, "reasoning_mode": "fast"},
            stream=False,
        )
    )
    text = "".join(c.delta.message.content or "" for c in chunks if isinstance(c.delta.message.content, str))
    assert "ready" in text.lower()
    assert any(c.delta.usage and c.delta.usage.completion_tokens > 0 for c in chunks)


def test_streaming_tool_call() -> None:
    tool = PromptMessageTool(
        name="get_weather",
        description="Get the current weather for a city",
        parameters={"type": "object", "properties": {"city": {"type": "string"}}, "required": ["city"]},
    )
    chunks = list(
        llm.invoke(
            model=MODEL,
            credentials=creds(),
            prompt_messages=[UserPromptMessage(content="What is the weather in Paris? Use the tool.")],
            model_parameters={"max_tokens": 2048, "reasoning_mode": "fast"},
            tools=[tool],
            stream=True,
        )
    )
    assert all(isinstance(c, LLMResultChunk) for c in chunks)
    calls = [tc for c in chunks for tc in (c.delta.message.tool_calls or [])]
    assert calls, "expected a tool call"
    name = next(tc.function.name for tc in calls if tc.function.name)
    args = "".join(tc.function.arguments or "" for tc in calls)
    assert name == "get_weather"
    assert "paris" in json.loads(args)["city"].lower()
