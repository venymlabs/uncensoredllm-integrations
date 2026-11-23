"""Microsoft Agent Framework (the successor of AutoGen and Semantic Kernel's agents): one tool call.

Runs twice: on OpenAIChatCompletionClient (Chat Completions) and on OpenAIChatClient (Responses API).
"""
import asyncio
import os

from agent_framework import Agent
from agent_framework.openai import OpenAIChatClient, OpenAIChatCompletionClient

WEATHER = {"lisbon": "21 C, sunny", "oslo": "3 C, sleet"}


def get_weather(city: str) -> str:
    """Current weather for a city, from the local weather table."""
    out = WEATHER.get(city.lower(), "no data")
    print(f"TOOL CALLED get_weather({city!r}) -> {out!r}")
    return out


BASE = os.environ.get("UNCENSOREDLLM_BASE_URL", "https://uncensoredllm.xyz/v1")
KEY = os.environ["UNCENSOREDLLM_API_KEY"]


RUNS = (
    ("chat_completions", OpenAIChatCompletionClient, None),
    # The Responses client chains turns with previous_response_id unless store is False. UncensoredLLM keeps
    # no responses, so it answers that with a 400; store=False makes the client resend the whole history.
    ("responses_store_false", OpenAIChatClient, {"store": False}),
)
if os.environ.get("MSAF_SHOW_DEFAULT_RESPONSES_FAILURE"):
    RUNS = (("responses_default", OpenAIChatClient, None),)


async def main():
    for label, cls, options in RUNS:
        try:
            client = cls(model="uncensoredllm-1", base_url=BASE, api_key=KEY)
            agent = Agent(client=client, instructions="Be concise.", tools=[get_weather], default_options=options)
            result = await agent.run("What is the weather in Lisbon right now? Use the tool.")
            print(f"[{label}] FINAL:", result.text.strip())
        except Exception as e:
            print(f"[{label}] FAILED: {type(e).__name__}: {e}")


asyncio.run(main())
