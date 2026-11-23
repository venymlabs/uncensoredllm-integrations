"""Load the component the ways Langflow does, then call the live API through it.

Offline tests always run. Live tests need RUN_UNCENSOREDLLM_LIVE=1 and UNCENSOREDLLM_API_KEY.
"""

import asyncio
import importlib.util
import os
import sys
from pathlib import Path

import pytest

ROOT = Path(__file__).resolve().parents[1] / "components"
SRC = ROOT / "uncensoredllm" / "uncensoredllm_model.py"

API_KEY = os.getenv("UNCENSOREDLLM_API_KEY", "").strip()
LIVE = os.getenv("RUN_UNCENSOREDLLM_LIVE") == "1" and bool(API_KEY)
live = pytest.mark.skipif(not LIVE, reason="set RUN_UNCENSOREDLLM_LIVE=1 and UNCENSOREDLLM_API_KEY")


def load_class():
    spec = importlib.util.spec_from_file_location("uncensoredllm_model", SRC)
    mod = importlib.util.module_from_spec(spec)
    sys.modules[spec.name] = mod  # Component reads its own source through its module
    spec.loader.exec_module(mod)
    return mod.UncensoredLLMModelComponent


def test_loads_from_components_path():
    # The loader behind LANGFLOW_COMPONENTS_PATH: <path>/<category>/<component>.py
    from lfx.custom.utils import build_custom_components

    found = build_custom_components([str(ROOT)])
    assert "uncensoredllm" in found, found.keys()
    templates = found["uncensoredllm"]
    node = next(iter(templates.values()))
    assert node["display_name"] == "UncensoredLLM"
    outputs = {o["name"] for o in node["outputs"]}
    assert {"text_output", "model_output"} <= outputs
    fields = node["template"]
    assert fields["api_key"]["password"] is True
    assert fields["model_name"]["value"] == "uncensoredllm-1"


def test_loads_as_pasted_custom_component_code():
    # The path the editor's Custom Component takes: code string -> template.
    from lfx.custom.utils import create_component_template

    template, _ = create_component_template({"code": SRC.read_text("utf-8"), "output_types": []})
    assert template["display_name"] == "UncensoredLLM"


def make(**kw):
    cls = load_class()
    comp = cls()
    comp.set(**{"api_key": API_KEY or "vk-x", "reasoning_mode": "fast", "max_tokens": 0, "temperature": 0.2, **kw})
    return comp


def test_build_model_offline_settings():
    model = make(max_tokens=100).build_model()
    assert model.model_name == "uncensoredllm-1"
    assert model.max_tokens == 512
    assert str(model.openai_api_base).rstrip("/") == "https://uncensoredllm.xyz/v1"
    assert model.extra_body == {"reasoning_mode": "fast"}


@live
def test_live_text_response():
    comp = make(input_value="Reply with the single word: ready")
    msg = asyncio.run(comp.text_response())
    assert "ready" in msg.text.lower()


@live
def test_live_tool_call():
    from langchain_core.tools import tool

    @tool
    def get_weather(city: str) -> str:
        """Get the current weather for a city."""
        return "sunny"

    model = make().build_model().bind_tools([get_weather])
    reply = model.invoke("What is the weather in Paris? Use the tool.")
    assert reply.tool_calls and reply.tool_calls[0]["name"] == "get_weather"
    assert "paris" in reply.tool_calls[0]["args"]["city"].lower()
