"""Strands Agents (AWS): the smallest agent with one tool call, through its OpenAI model provider."""
import os

from strands import Agent, tool
from strands.models.openai import OpenAIModel

WEATHER = {"lisbon": "21 C, sunny", "oslo": "3 C, sleet"}


@tool
def get_weather(city: str) -> str:
    """Current weather for a city, from the local weather table.

    Args:
        city: The city name.
    """
    out = WEATHER.get(city.lower(), "no data")
    print(f"TOOL CALLED get_weather({city!r}) -> {out!r}")
    return out


model = OpenAIModel(
    client_args={
        "base_url": os.environ.get("UNCENSOREDLLM_BASE_URL", "https://uncensoredllm.xyz/v1"),
        "api_key": os.environ["UNCENSOREDLLM_API_KEY"],
    },
    model_id="uncensoredllm-1",
)

agent = Agent(model=model, tools=[get_weather], system_prompt="Be concise.", callback_handler=None)
result = agent("What is the weather in Lisbon right now? Use the tool.")
print("FINAL:", str(result).strip())
