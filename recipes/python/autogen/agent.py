"""AutoGen (autogen-agentchat 0.7, repository archived, maintenance only): AssistantAgent with one tool.

AutoGen refuses a model name it does not know unless model_info is given, so it is spelled out here.
"""
import asyncio
import os

from autogen_agentchat.agents import AssistantAgent
from autogen_ext.models.openai import OpenAIChatCompletionClient

WEATHER = {"lisbon": "21 C, sunny", "oslo": "3 C, sleet"}


def get_weather(city: str) -> str:
    """Current weather for a city, from the local weather table."""
    out = WEATHER.get(city.lower(), "no data")
    print(f"TOOL CALLED get_weather({city!r}) -> {out!r}")
    return out


client = OpenAIChatCompletionClient(
    model="uncensoredllm-1",
    base_url=os.environ.get("UNCENSOREDLLM_BASE_URL", "https://uncensoredllm.xyz/v1"),
    api_key=os.environ["UNCENSOREDLLM_API_KEY"],
    model_info={"vision": False, "function_calling": True, "json_output": True, "family": "unknown",
                "structured_output": True},
)


async def main():
    agent = AssistantAgent("assistant", model_client=client, tools=[get_weather],
                           system_message="Be concise.", reflect_on_tool_use=True)
    result = await agent.run(task="What is the weather in Lisbon right now? Use the tool.")
    for m in result.messages:
        print(f"[{type(m).__name__}]", str(getattr(m, "content", ""))[:200])
    print("FINAL:", result.messages[-1].content)
    await client.close()


asyncio.run(main())
