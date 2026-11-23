"""Instructor: structured output through a tool call (Mode.TOOLS) on the OpenAI client.

Not an agent framework, but the most downloaded structured-output library, and it works by forcing a tool call.
"""
import os

import instructor
from openai import OpenAI
from pydantic import BaseModel


class Weather(BaseModel):
    city: str
    temperature_c: int
    sky: str


client = instructor.from_openai(
    OpenAI(base_url=os.environ.get("UNCENSOREDLLM_BASE_URL", "https://uncensoredllm.xyz/v1"),
           api_key=os.environ["UNCENSOREDLLM_API_KEY"]),
    mode=instructor.Mode.TOOLS,
)
w = client.chat.completions.create(
    model="uncensoredllm-1",
    response_model=Weather,
    messages=[{"role": "user", "content": "Weather table says: Lisbon, 21 C, sunny. Extract it."}],
)
print("FINAL:", w.model_dump())
