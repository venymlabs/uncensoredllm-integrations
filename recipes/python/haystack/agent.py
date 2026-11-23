"""Haystack (deepset): Agent with one tool, on OpenAIChatGenerator with api_base_url."""
import os

from haystack.components.agents import Agent
from haystack.components.generators.chat import OpenAIChatGenerator
from haystack.dataclasses import ChatMessage
from haystack.tools import tool
from haystack.utils import Secret

WEATHER = {"lisbon": "21 C, sunny", "oslo": "3 C, sleet"}


@tool
def get_weather(city: str) -> str:
    """Current weather for a city, from the local weather table."""
    out = WEATHER.get(city.lower(), "no data")
    print(f"TOOL CALLED get_weather({city!r}) -> {out!r}")
    return out


generator = OpenAIChatGenerator(
    model="uncensoredllm-1",
    api_base_url=os.environ.get("UNCENSOREDLLM_BASE_URL", "https://uncensoredllm.xyz/v1"),
    api_key=Secret.from_env_var("UNCENSOREDLLM_API_KEY"),
)
agent = Agent(chat_generator=generator, tools=[get_weather], system_prompt="Be concise.")
result = agent.run(messages=[ChatMessage.from_user("What is the weather in Lisbon right now? Use the tool.")])
print("FINAL:", result["messages"][-1].text.strip())
