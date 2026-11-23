"""LangChain 1.x + LangGraph: the smallest agent with one tool call.

`create_agent` (LangChain 1.x) builds a LangGraph graph under the hood, so this one run covers both.
"""
import os

from langchain.agents import create_agent
from langchain.tools import tool
from langchain_openai import ChatOpenAI

WEATHER = {"lisbon": "21 C, sunny", "oslo": "3 C, sleet"}


@tool
def get_weather(city: str) -> str:
    """Current weather for a city, from the local weather table."""
    out = WEATHER.get(city.lower(), "no data")
    print(f"TOOL CALLED get_weather({city!r}) -> {out!r}")
    return out


llm = ChatOpenAI(
    model="uncensoredllm-1",
    base_url=os.environ.get("UNCENSOREDLLM_BASE_URL", "https://uncensoredllm.xyz/v1"),
    api_key=os.environ["UNCENSOREDLLM_API_KEY"],
)

agent = create_agent(llm, tools=[get_weather], system_prompt="Be concise.")
result = agent.invoke({"messages": [{"role": "user", "content": "What is the weather in Lisbon right now? Use the tool."}]})
for m in result["messages"]:
    print(f"[{m.type}]", (m.content or "")[:200] if isinstance(m.content, str) else m.content,
          getattr(m, "tool_calls", "") or "")
print("FINAL:", result["messages"][-1].content)
