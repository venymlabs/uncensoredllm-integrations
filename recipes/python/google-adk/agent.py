"""Google ADK: the smallest agent with one tool call, through ADK's LiteLlm model wrapper.

ADK only talks to non-Google models through LiteLLM. Until LiteLLM ships the `uncensoredllm/` provider, the
model id is LiteLLM's generic OpenAI-compatible route `openai/uncensoredllm-1` with api_base and api_key.
After it ships: LiteLlm(model="uncensoredllm/uncensoredllm-1") with UNCENSOREDLLM_API_KEY set.
"""
import asyncio
import os

from google.adk.agents import LlmAgent
from google.adk.models.lite_llm import LiteLlm
from google.adk.runners import InMemoryRunner

WEATHER = {"lisbon": "21 C, sunny", "oslo": "3 C, sleet"}


def get_weather(city: str) -> str:
    """Current weather for a city, from the local weather table."""
    out = WEATHER.get(city.lower(), "no data")
    print(f"TOOL CALLED get_weather({city!r}) -> {out!r}")
    return out


model = LiteLlm(
    model="openai/uncensoredllm-1",
    api_base=os.environ.get("UNCENSOREDLLM_BASE_URL", "https://uncensoredllm.xyz/v1"),
    api_key=os.environ["UNCENSOREDLLM_API_KEY"],
)
agent = LlmAgent(name="assistant", model=model, instruction="Be concise.", tools=[get_weather])


async def main():
    runner = InMemoryRunner(agent=agent, app_name="demo")
    events = await runner.run_debug("What is the weather in Lisbon right now? Use the tool.", quiet=True)
    final = ""
    for ev in events:
        for part in (ev.content.parts if ev.content and ev.content.parts else []):
            if part.function_call:
                print("[function_call]", part.function_call.name, part.function_call.args)
            if part.function_response:
                print("[function_response]", part.function_response.response)
            if part.text and not getattr(part, "thought", False):
                final = part.text
    print("FINAL:", final.strip())


asyncio.run(main())
