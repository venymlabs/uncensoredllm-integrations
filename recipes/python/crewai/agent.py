"""CrewAI: one agent, one task, one tool, on CrewAI's native OpenAI provider with a custom base_url."""
import os

from crewai import LLM, Agent, Crew, Task
from crewai.tools import tool

WEATHER = {"lisbon": "21 C, sunny", "oslo": "3 C, sleet"}


@tool("get_weather")
def get_weather(city: str) -> str:
    """Current weather for a city, from the local weather table."""
    out = WEATHER.get(city.lower(), "no data")
    print(f"TOOL CALLED get_weather({city!r}) -> {out!r}")
    return out


llm = LLM(
    model="openai/uncensoredllm-1",
    base_url=os.environ.get("UNCENSOREDLLM_BASE_URL", "https://uncensoredllm.xyz/v1"),
    api_key=os.environ["UNCENSOREDLLM_API_KEY"],
    context_window_size=262144,  # otherwise CrewAI assumes 8,192 for a model it does not know
)

agent = Agent(role="Weather reporter", goal="Report the weather from the weather table.",
              backstory="You look things up before you answer.", tools=[get_weather], llm=llm, verbose=False)
task = Task(description="What is the weather in Lisbon right now? Use the get_weather tool.",
            expected_output="One short sentence with the weather.", agent=agent)
# tracing=False: without it CrewAI 1.15 stops after the run to ask "Share this execution trace with CrewAI?"
result = Crew(agents=[agent], tasks=[task], verbose=False, tracing=False).kickoff()
print("FINAL:", str(result).strip())
