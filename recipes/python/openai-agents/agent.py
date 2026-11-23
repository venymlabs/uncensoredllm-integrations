"""OpenAI Agents SDK: the smallest agent with one tool call.

Runs twice: once on the SDK's default Responses API, once on Chat Completions. UncensoredLLM serves both.
"""
import os

from openai import AsyncOpenAI
from agents import (Agent, Runner, function_tool, set_default_openai_api, set_default_openai_client,
                    set_tracing_disabled)

WEATHER = {"lisbon": "21 C, sunny", "oslo": "3 C, sleet"}


@function_tool
def get_weather(city: str) -> str:
    """Current weather for a city, from the local weather table."""
    out = WEATHER.get(city.lower(), "no data")
    print(f"TOOL CALLED get_weather({city!r}) -> {out!r}")
    return out


client = AsyncOpenAI(
    base_url=os.environ.get("UNCENSOREDLLM_BASE_URL", "https://uncensoredllm.xyz/v1"),
    api_key=os.environ["UNCENSOREDLLM_API_KEY"],
)
set_default_openai_client(client, use_for_tracing=False)
set_tracing_disabled(True)

agent = Agent(name="Assistant", instructions="Be concise.", model="uncensoredllm-1", tools=[get_weather])

for api in ("responses", "chat_completions"):
    set_default_openai_api(api)
    try:
        result = Runner.run_sync(agent, "What is the weather in Lisbon right now? Use the tool.")
        print(f"[{api}] FINAL:", result.final_output)
    except Exception as e:  # record, do not hide
        print(f"[{api}] FAILED: {type(e).__name__}: {e}")
