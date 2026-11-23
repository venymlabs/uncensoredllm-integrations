"""LlamaIndex: FunctionAgent with one tool, on OpenAILike."""
import asyncio
import os

from llama_index.core.agent.workflow import FunctionAgent
from llama_index.llms.openai_like import OpenAILike

WEATHER = {"lisbon": "21 C, sunny", "oslo": "3 C, sleet"}


def get_weather(city: str) -> str:
    """Current weather for a city, from the local weather table."""
    out = WEATHER.get(city.lower(), "no data")
    print(f"TOOL CALLED get_weather({city!r}) -> {out!r}")
    return out


llm = OpenAILike(
    model="uncensoredllm-1",
    api_base=os.environ.get("UNCENSOREDLLM_BASE_URL", "https://uncensoredllm.xyz/v1"),
    api_key=os.environ["UNCENSOREDLLM_API_KEY"],
    context_window=262144,
    is_chat_model=True,
    is_function_calling_model=True,  # default is False, and FunctionAgent refuses a model without it
)

agent = FunctionAgent(tools=[get_weather], llm=llm, system_prompt="Be concise.")


async def main():
    resp = await agent.run("What is the weather in Lisbon right now? Use the tool.")
    print("FINAL:", str(resp).strip())


asyncio.run(main())
