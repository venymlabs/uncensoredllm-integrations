"""UncensoredLLM language model component for Langflow.

Drop this file into a folder named after a category inside LANGFLOW_COMPONENTS_PATH
(for example ~/langflow_components/uncensoredllm/uncensoredllm_model.py), or paste it into
a Custom Component in the editor. It outputs a Language Model (for Agent and other nodes)
and a Message, like Langflow's own model components.

The key goes only to the base URL below, as a Bearer header. Nothing else is sent anywhere.
"""

from langchain_openai import ChatOpenAI
from lfx.base.models.model import LCModelComponent
from lfx.field_typing import LanguageModel
from lfx.field_typing.range_spec import RangeSpec
from lfx.inputs.inputs import BoolInput, DropdownInput, IntInput, SecretStrInput, SliderInput, StrInput
from pydantic.v1 import SecretStr

DEFAULT_BASE_URL = "https://uncensoredllm.xyz/v1"
MODEL_ID = "uncensoredllm-1"
# The model reasons before it answers; a budget under about 400 tokens can be spent on the
# reasoning alone (502 empty_completion), so a smaller value is raised to this.
MIN_MAX_TOKENS = 512


class UncensoredLLMModelComponent(LCModelComponent):
    display_name = "UncensoredLLM"
    description = "One uncensored LLM, served from our own GPUs, through an OpenAI-compatible API."
    documentation = "https://uncensoredllm.xyz/docs"
    icon = "Bot"
    name = "UncensoredLLMModel"

    inputs = [
        *LCModelComponent.get_base_inputs(),
        SecretStrInput(
            name="api_key",
            display_name="UncensoredLLM API Key",
            info="Your key, starting with vk-. Store it as a Langflow global variable.",
            required=True,
            value="UNCENSOREDLLM_API_KEY",
        ),
        DropdownInput(
            name="model_name",
            display_name="Model Name",
            options=[MODEL_ID],
            value=MODEL_ID,
            info="UncensoredLLM 1: 262,144-token context, tool calls, JSON mode.",
        ),
        DropdownInput(
            name="reasoning_mode",
            display_name="Reasoning",
            options=["extended", "fast"],
            value="extended",
            info="How much the model reasons before it answers. 'fast' keeps it short.",
            advanced=True,
        ),
        IntInput(
            name="max_tokens",
            display_name="Max Tokens",
            info="Upper limit on the reply, reasoning included. 0 leaves it to the server; otherwise at least 512.",
            range_spec=RangeSpec(min=0, max=65536),
            value=0,
            advanced=True,
        ),
        SliderInput(
            name="temperature",
            display_name="Temperature",
            value=0.7,
            range_spec=RangeSpec(min=0, max=2, step=0.01),
            advanced=True,
        ),
        BoolInput(
            name="json_mode",
            display_name="JSON Mode",
            info="The reply is a JSON object. Ask for JSON in the prompt too.",
            advanced=True,
        ),
        StrInput(
            name="base_url",
            display_name="Base URL",
            value=DEFAULT_BASE_URL,
            advanced=True,
        ),
        IntInput(
            name="timeout",
            display_name="Timeout (seconds)",
            value=600,
            advanced=True,
        ),
    ]

    def build_model(self) -> LanguageModel:  # type: ignore[type-var]
        api_key = SecretStr(self.api_key).get_secret_value() if self.api_key else None
        max_tokens = self.max_tokens or None
        if max_tokens is not None:
            max_tokens = max(MIN_MAX_TOKENS, max_tokens)
        model = ChatOpenAI(
            model=self.model_name or MODEL_ID,
            base_url=(self.base_url or DEFAULT_BASE_URL).rstrip("/"),
            api_key=api_key,
            temperature=self.temperature if self.temperature is not None else 0.7,
            max_tokens=max_tokens,
            streaming=bool(getattr(self, "stream", False)),
            timeout=self.timeout or 600,
            extra_body={"reasoning_mode": self.reasoning_mode or "extended"},
        )
        if self.json_mode:
            return model.bind(response_format={"type": "json_object"})  # type: ignore[return-value]
        return model

    def _get_exception_message(self, e: Exception):
        try:
            from openai import APIStatusError

            if isinstance(e, APIStatusError):
                body = e.body if isinstance(e.body, dict) else {}
                err = body.get("error", body)
                if isinstance(err, dict) and err.get("message"):
                    return f"UncensoredLLM {e.status_code}: {err['message']}"
        except ImportError:
            pass
        return None
