"""smolagents (Hugging Face): ToolCallingAgent with one tool, on OpenAIModel (alias OpenAIServerModel)."""
import os

from smolagents import OpenAIModel, ToolCallingAgent, tool

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
    model_id="uncensoredllm-1",
    api_base=os.environ.get("UNCENSOREDLLM_BASE_URL", "https://uncensoredllm.xyz/v1"),
    api_key=os.environ["UNCENSOREDLLM_API_KEY"],
)
agent = ToolCallingAgent(tools=[get_weather], model=model, max_steps=4, verbosity_level=0)
answer = agent.run("What is the weather in Lisbon right now? Use the tool.")
print("FINAL:", str(answer).strip())
