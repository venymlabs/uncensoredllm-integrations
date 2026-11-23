"""AG2 1.x (the community fork of AutoGen, rewritten): Agent with one tool, on OpenAICompletionsConfig."""
import asyncio
import os

from ag2 import Agent, tool
from ag2.config.openai.config import OpenAICompletionsConfig

WEATHER = {"lisbon": "21 C, sunny", "oslo": "3 C, sleet"}


@tool
def get_weather(city: str) -> str:
    """Current weather for a city, from the local weather table."""
    out = WEATHER.get(city.lower(), "no data")
    print(f"TOOL CALLED get_weather({city!r}) -> {out!r}")
    return out


config = OpenAICompletionsConfig(
    model="uncensoredllm-1",
    base_url=os.environ.get("UNCENSOREDLLM_BASE_URL", "https://uncensoredllm.xyz/v1"),
    api_key=os.environ["UNCENSOREDLLM_API_KEY"],
)
agent = Agent("assistant", prompt="Be concise.", config=config, tools=[get_weather])


async def main():
    reply = await agent.ask("What is the weather in Lisbon right now? Use the tool.")
    print("FINAL:", (await reply.content() or "").strip())


asyncio.run(main())
