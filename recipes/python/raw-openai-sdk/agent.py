"""Baseline: one tool round trip with the plain OpenAI Python SDK, non-streamed then streamed.

Every framework below sits on top of this. If this works and a framework does not, the problem is in the framework.
"""
import json
import os

from openai import OpenAI

client = OpenAI(
    base_url=os.environ.get("UNCENSOREDLLM_BASE_URL", "https://uncensoredllm.xyz/v1"),
    api_key=os.environ["UNCENSOREDLLM_API_KEY"],
)
MODEL = "uncensoredllm-1"

WEATHER = {"lisbon": "21 C, sunny", "oslo": "3 C, sleet"}


def get_weather(city: str) -> str:
    out = WEATHER.get(city.lower(), "no data")
    print(f"TOOL CALLED get_weather({city!r}) -> {out!r}")
    return out


tools = [{
    "type": "function",
    "function": {
        "name": "get_weather",
        "description": "Current weather for a city, from the local weather table.",
        "parameters": {"type": "object", "properties": {"city": {"type": "string"}}, "required": ["city"]},
    },
}]
messages = [{"role": "user", "content": "What is the weather in Lisbon right now? Use the tool."}]

r = client.chat.completions.create(model=MODEL, messages=messages, tools=tools)
msg = r.choices[0].message
print("finish_reason:", r.choices[0].finish_reason)
print("extra fields on message:", sorted((msg.model_extra or {}).keys()))
call = msg.tool_calls[0]
messages.append(msg.model_dump(exclude_none=True))
messages.append({"role": "tool", "tool_call_id": call.id, "content": get_weather(**json.loads(call.function.arguments))})

stream = client.chat.completions.create(model=MODEL, messages=messages, tools=tools, stream=True,
                                        stream_options={"include_usage": True})
text = []
for chunk in stream:
    if chunk.choices and chunk.choices[0].delta.content:
        text.append(chunk.choices[0].delta.content)
print("FINAL:", "".join(text).strip())
