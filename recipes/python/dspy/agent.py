"""DSPy: dspy.ReAct with one tool, on UncensoredLLM through the OpenAI-compatible route."""
import os

import dspy

WEATHER = {"lisbon": "21 C, sunny", "oslo": "3 C, sleet"}


def get_weather(city: str) -> str:
    """Current weather for a city, from the local weather table."""
    out = WEATHER.get(city.lower(), "no data")
    print(f"TOOL CALLED get_weather({city!r}) -> {out!r}")
    return out


lm = dspy.LM(
    "openai/uncensoredllm-1",
    model_type="chat",
    api_base=os.environ.get("UNCENSOREDLLM_BASE_URL", "https://uncensoredllm.xyz/v1"),
    api_key=os.environ["UNCENSOREDLLM_API_KEY"],
    cache=False,
)
dspy.configure(lm=lm)

react = dspy.ReAct("question -> answer", tools=[get_weather], max_iters=4)
pred = react(question="What is the weather in Lisbon right now? Use the tool.")
print("TRAJECTORY:", {k: str(v)[:160] for k, v in pred.trajectory.items()} if hasattr(pred, "trajectory") else "")
print("FINAL:", pred.answer)
