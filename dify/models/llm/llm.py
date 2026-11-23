from collections.abc import Generator
from typing import Optional, Union

import requests
from dify_plugin import OAICompatLargeLanguageModel
from dify_plugin.entities.model.llm import LLMMode, LLMResult
from dify_plugin.entities.model.message import PromptMessage, PromptMessageTool
from dify_plugin.errors.model import CredentialsValidateFailedError
from yarl import URL

DEFAULT_BASE_URL = "https://uncensoredllm.xyz/v1"


class UncensoredLLMLargeLanguageModel(OAICompatLargeLanguageModel):
    """UncensoredLLM speaks the OpenAI chat completions format, so the SDK's
    OpenAI-compatible model does the work. This class only fills in the base URL
    and the capabilities of the one model, and keeps max_tokens out of the range
    where the model's thinking can use the whole budget."""

    def _invoke(
        self,
        model: str,
        credentials: dict,
        prompt_messages: list[PromptMessage],
        model_parameters: dict,
        tools: Optional[list[PromptMessageTool]] = None,
        stop: Optional[list[str]] = None,
        stream: bool = True,
        user: Optional[str] = None,
    ) -> Union[LLMResult, Generator]:
        self._add_custom_parameters(credentials)
        max_tokens = model_parameters.get("max_tokens")
        if isinstance(max_tokens, int) and max_tokens < 512:
            model_parameters["max_tokens"] = 512
        return super()._invoke(model, credentials, prompt_messages, model_parameters, tools, stop, stream, user)

    def validate_credentials(self, model: str, credentials: dict) -> None:
        """Check the key without spending tokens.

        The SDK's default check sends a chat request with max_tokens=5. This model
        thinks before it answers, so a budget that small ends in
        502 empty_completion even with a good key. GET /balance needs a valid key
        and costs nothing; GET /models confirms the model id is served."""
        self._add_custom_parameters(credentials)
        base = credentials["endpoint_url"].rstrip("/")
        headers = {"Authorization": f"Bearer {credentials.get('api_key', '')}"}
        try:
            balance = requests.get(f"{base}/balance", headers=headers, timeout=(10, 30))
        except requests.RequestException as ex:
            raise CredentialsValidateFailedError(f"Could not reach {base}: {ex!s}") from ex
        if balance.status_code in (401, 403):
            raise CredentialsValidateFailedError("The API key was not accepted. Paste the whole vk- key.")
        if balance.status_code != 200:
            raise CredentialsValidateFailedError(
                f"GET {base}/balance returned HTTP {balance.status_code}: {balance.text[:300]}"
            )
        try:
            models = requests.get(f"{base}/models", headers=headers, timeout=(10, 30))
            ids = [m.get("id") for m in models.json().get("data", [])]
        except Exception as ex:
            raise CredentialsValidateFailedError(f"GET {base}/models failed: {ex!s}") from ex
        if model not in ids:
            raise CredentialsValidateFailedError(f"The model {model} is not listed at {base}/models.")

    @staticmethod
    def _add_custom_parameters(credentials: dict) -> None:
        credentials["endpoint_url"] = str(URL(credentials.get("endpoint_url") or DEFAULT_BASE_URL))
        credentials["mode"] = LLMMode.CHAT.value
        credentials["function_calling_type"] = "tool_call"
        credentials["stream_function_calling"] = "supported"
        credentials["context_size"] = 262144
        credentials["max_tokens_to_sample"] = 65536
