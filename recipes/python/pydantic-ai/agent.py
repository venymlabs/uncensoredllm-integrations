"""Pydantic AI: the smallest agent with one tool call, through OpenAICompatibleProvider + OpenAIChatModel."""
import os

from pydantic_ai import Agent
from pydantic_ai.models.openai import OpenAIChatModel
from pydantic_ai.providers.openai_compatible import OpenAICompatibleProvider

provider = OpenAICompatibleProvider(
    "uncensoredllm",
    base_url=os.environ.get("UNCENSOREDLLM_BASE_URL", "https://uncensoredllm.xyz/v1"),
    api_key=os.environ["UNCENSOREDLLM_API_KEY"],
)
agent = Agent(OpenAIChatModel("uncensoredllm-1", provider=provider), instructions="Be concise.")

WEATHER = {"lisbon": "21 C, sunny", "oslo": "3 C, sleet"}


@agent.tool_plain
def get_weather(city: str) -> str:
    """Current weather for a city, from the local weather table."""
    out = WEATHER.get(city.lower(), "no data")
    print(f"TOOL CALLED get_weather({city!r}) -> {out!r}")
    return out


result = agent.run_sync("What is the weather in Lisbon right now? Use the tool.")
for m in result.all_messages():
    for p in m.parts:
        print(f"[{type(p).__name__}]", str(getattr(p, "content", "") or getattr(p, "args", ""))[:160])
print("FINAL:", result.output)
