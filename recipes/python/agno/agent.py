"""Agno: the smallest agent with one tool call, on agno.models.openai.OpenAILike."""
import os

from agno.agent import Agent
from agno.models.openai import OpenAILike

WEATHER = {"lisbon": "21 C, sunny", "oslo": "3 C, sleet"}


def get_weather(city: str) -> str:
    """Current weather for a city, from the local weather table.

    Args:
        city: The city name.
    """
    out = WEATHER.get(city.lower(), "no data")
    print(f"TOOL CALLED get_weather({city!r}) -> {out!r}")
    return out


model = OpenAILike(
    id="uncensoredllm-1",
    base_url=os.environ.get("UNCENSOREDLLM_BASE_URL", "https://uncensoredllm.xyz/v1"),
    api_key=os.environ["UNCENSOREDLLM_API_KEY"],
)
agent = Agent(model=model, tools=[get_weather], instructions="Be concise.", telemetry=False)
run = agent.run("What is the weather in Lisbon right now? Use the tool.")
for t in run.tools or []:
    print("[tool]", t.tool_name, t.tool_args, "->", t.result)
print("FINAL:", (run.content or "").strip())
