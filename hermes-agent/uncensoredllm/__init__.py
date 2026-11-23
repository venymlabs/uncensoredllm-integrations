"""UncensoredLLM provider profile.

One uncensored LLM behind an OpenAI-compatible chat-completions API
(https://uncensoredllm.xyz/v1), so the generic chat_completions transport
handles requests, streaming and tool calls. The model streams its reasoning
as ``delta.reasoning_content``; Hermes' transport already reads that field.

Install as a user plugin: copy this folder to
``$HERMES_HOME/plugins/model-providers/uncensoredllm/`` (``~/.hermes`` on
macOS/Linux, ``%LOCALAPPDATA%\\hermes`` on Windows when HERMES_HOME is unset).
"""

from providers import register_provider
from providers.base import ProviderProfile


uncensoredllm = ProviderProfile(
    name="uncensoredllm",
    aliases=("uncensored-llm",),
    display_name="UncensoredLLM",
    description="UncensoredLLM: one uncensored LLM, OpenAI-compatible API",
    signup_url="https://uncensoredllm.xyz/?src=hermes-agent",
    env_vars=("UNCENSOREDLLM_API_KEY", "UNCENSOREDLLM_BASE_URL"),
    base_url="https://uncensoredllm.xyz/v1",
    auth_type="api_key",
    # The model thinks before it answers; a small cap can be spent entirely on
    # reasoning, so leave the output cap to the server (65,536 max, 32,768 default).
    default_max_tokens=None,
    # There is one model; aux tasks (titles, compression) use it too.
    default_aux_model="uncensoredllm-1",
    fallback_models=("uncensoredllm-1",),
)

register_provider(uncensoredllm)
