# UncensoredLLM in Python agent frameworks

Every framework below talks to UncensoredLLM through its own OpenAI-compatible client. You need three values:

- Base URL: `https://uncensoredllm.xyz/v1`
- Model: `uncensoredllm-1`
- Key: from https://uncensoredllm.xyz/dashboard/keys, kept in `UNCENSOREDLLM_API_KEY`

The model has a 262,144-token context window and up to 65,536 output tokens. It reasons before answering, so leave `max_tokens` unset or give it at least 512. Very small limits can be spent entirely on reasoning before any answer is written.

"Tested" means the agent in this folder ran against the live API on 2026-11-23 and made one real tool call. The exact package versions are in each folder's `versions.txt`.

```python
import os
BASE = "https://uncensoredllm.xyz/v1"
KEY = os.environ["UNCENSOREDLLM_API_KEY"]
```

## Things that hold everywhere

- **Chat Completions is the safe path.** Tool calls, a named `tool_choice`, `response_format` with `json_schema`, streaming with usage, and `max_completion_tokens` all work.
- **Reasoning comes back as `reasoning_content`.** Pydantic AI, Agno and LiteLLM show it. Most others drop it, which does no harm.
- **`/v1/responses` is stateless.** The endpoint does not store responses and rejects `previous_response_id`. A client that chains turns by id has to send the whole conversation each turn, which usually means `store=False`.
- **Reasoning items carry no `encrypted_content`.** A client that asks for `include=["reasoning.encrypted_content"]` and replays reasoning items will refuse to continue. Microsoft Agent Framework's Responses client does this (see below).
- **Extra `metadata` field.** Responses include a top-level `metadata` object that is not in the OpenAI schema. LiteLLM, ADK and AutoGen log pydantic serializer warnings about it; nothing breaks.

## LangChain and LangGraph (tested)

```python
from langchain.agents import create_agent
from langchain_openai import ChatOpenAI

llm = ChatOpenAI(model="uncensoredllm-1", base_url=BASE, api_key=KEY)
agent = create_agent(llm, tools=[get_weather])
```

## LiteLLM (tested)

Today, through the generic OpenAI route:

```python
import litellm
litellm.completion(model="openai/uncensoredllm-1", api_base=BASE, api_key=KEY, messages=[...], tools=[...])
```

A native `uncensoredllm/` provider is prepared as a patch (`litellm/`). Once it is merged, `UNCENSOREDLLM_API_KEY` is enough:

```python
litellm.completion(model="uncensoredllm/uncensoredllm-1", messages=[...])
```

The generic route does not know the price, so `completion_cost` is unknown there. The native entry adds the price.

## OpenAI Agents SDK (tested on Responses and on Chat Completions)

```python
from openai import AsyncOpenAI
from agents import Agent, Runner, set_default_openai_client, set_tracing_disabled

set_default_openai_client(AsyncOpenAI(base_url=BASE, api_key=KEY), use_for_tracing=False)
set_tracing_disabled(True)
agent = Agent(name="assistant", model="uncensoredllm-1", tools=[get_weather])
```

Turn tracing off. Otherwise the SDK tries to export traces to OpenAI's platform, and an UncensoredLLM key is not valid there. `set_default_openai_api("chat_completions")` also works.

## Strands Agents (tested)

```python
from strands import Agent
from strands.models.openai import OpenAIModel

model = OpenAIModel(client_args={"base_url": BASE, "api_key": KEY}, model_id="uncensoredllm-1")
agent = Agent(model=model, tools=[get_weather])
```

Strands logs a warning that `reasoningContent` is not supported in multi-turn Chat Completions conversations. It drops the reasoning and carries on.

## Google ADK (tested)

```python
from google.adk.agents import LlmAgent
from google.adk.models.lite_llm import LiteLlm

model = LiteLlm(model="openai/uncensoredllm-1", api_base=BASE, api_key=KEY)
agent = LlmAgent(name="assistant", model=model, tools=[get_weather])
```

ADK goes through LiteLLM, so `LiteLlm(model="uncensoredllm/uncensoredllm-1")` will work once the LiteLLM entry ships.

## Pydantic AI (tested)

```python
from pydantic_ai import Agent
from pydantic_ai.models.openai import OpenAIChatModel
from pydantic_ai.providers.openai_compatible import OpenAICompatibleProvider

provider = OpenAICompatibleProvider("uncensoredllm", base_url=BASE, api_key=KEY)
agent = Agent(OpenAIChatModel("uncensoredllm-1", provider=provider), tools=[get_weather])
```

The model's reasoning arrives as a `ThinkingPart`.

## Instructor (tested)

```python
import instructor
from openai import OpenAI

client = instructor.from_openai(OpenAI(base_url=BASE, api_key=KEY), mode=instructor.Mode.TOOLS)
```

## DSPy (tested)

```python
import dspy
dspy.configure(lm=dspy.LM("openai/uncensoredllm-1", model_type="chat", api_base=BASE, api_key=KEY))
react = dspy.ReAct("question -> answer", tools=[get_weather])
```

DSPy's ReAct writes tool calls as JSON in the text, not in the `tools` field. It works, but it is not native function calling.

## LlamaIndex (tested)

```python
from llama_index.core.agent.workflow import FunctionAgent
from llama_index.llms.openai_like import OpenAILike

llm = OpenAILike(model="uncensoredllm-1", api_base=BASE, api_key=KEY,
                 context_window=262144, is_chat_model=True, is_function_calling_model=True)
agent = FunctionAgent(llm=llm, tools=[get_weather])
```

`OpenAILike` assumes a completion model without function calling unless the two `is_*` flags are set.

## CrewAI (tested)

```python
from crewai import LLM, Agent, Crew, Task

llm = LLM(model="openai/uncensoredllm-1", base_url=BASE, api_key=KEY, context_window_size=262144)
crew = Crew(agents=[...], tasks=[...], tracing=False)
```

Without `context_window_size`, CrewAI assumes 8,192 tokens and trims context early. Without `tracing=False`, the first run stops for 20 seconds on a prompt asking whether to share the trace with CrewAI.

## Agno (tested)

```python
from agno.agent import Agent
from agno.models.openai import OpenAILike

agent = Agent(model=OpenAILike(id="uncensoredllm-1", base_url=BASE, api_key=KEY), tools=[get_weather])
```

A native `UncensoredLLM` model class is prepared as a patch (`agno/`). Once it is merged, the model string is `"uncensoredllm:uncensoredllm-1"`.

## Microsoft Agent Framework (tested on Chat Completions; Responses fails)

```python
from agent_framework import Agent
from agent_framework.openai import OpenAIChatCompletionClient

client = OpenAIChatCompletionClient(model="uncensoredllm-1", base_url=BASE, api_key=KEY)
agent = Agent(client=client, tools=[get_weather])
```

Use `OpenAIChatCompletionClient`, not `OpenAIChatClient`. `OpenAIChatClient` speaks the Responses API, which fails in two ways:

- By default it sends `previous_response_id`, which the endpoint rejects with a 400.
- With `default_options={"store": False}` it fails inside the client with "Stateless replay cannot reconstruct reasoning item(s)", because the reasoning items carry no `encrypted_content`.

## smolagents (tested)

```python
from smolagents import OpenAIModel, ToolCallingAgent

model = OpenAIModel(model_id="uncensoredllm-1", api_base=BASE, api_key=KEY)
agent = ToolCallingAgent(tools=[get_weather], model=model)
```

## Haystack (tested)

```python
from haystack.components.agents import Agent
from haystack.components.generators.chat import OpenAIChatGenerator
from haystack.utils import Secret

gen = OpenAIChatGenerator(model="uncensoredllm-1", api_base_url=BASE,
                          api_key=Secret.from_env_var("UNCENSOREDLLM_API_KEY"))
agent = Agent(chat_generator=gen, tools=[get_weather])
```

## AutoGen (tested)

```python
from autogen_agentchat.agents import AssistantAgent
from autogen_ext.models.openai import OpenAIChatCompletionClient

client = OpenAIChatCompletionClient(
    model="uncensoredllm-1", base_url=BASE, api_key=KEY,
    model_info={"vision": False, "function_calling": True, "json_output": True,
                "family": "unknown", "structured_output": True},
)
agent = AssistantAgent("assistant", model_client=client, tools=[get_weather], reflect_on_tool_use=True)
```

AutoGen refuses a model name it does not know unless `model_info` is given. The AutoGen repository is archived, and Microsoft names Agent Framework as its successor.

## AG2 (tested, ag2 1.x API)

```python
from ag2 import Agent
from ag2.config.openai.config import OpenAICompletionsConfig

config = OpenAICompletionsConfig(model="uncensoredllm-1", base_url=BASE, api_key=KEY)
agent = Agent("assistant", prompt="Be concise.", config=config, tools=[get_weather])
reply = await agent.ask("What is the weather in Lisbon?")
```

## Not run here

These follow the same wire path as the tested clients above, but were not run.

- **browser-use**: `from browser_use.llm import ChatOpenAI`, then `ChatOpenAI(model="uncensoredllm-1", base_url=BASE, api_key=KEY)` passed as `llm=` to `Agent`. Not run because it starts a Chromium browser.
- **Semantic Kernel**: `OpenAIChatCompletion(ai_model_id="uncensoredllm-1", async_client=AsyncOpenAI(base_url=BASE, api_key=KEY))`. Installed but not run. Microsoft is moving Semantic Kernel's agent role to Agent Framework.
- **OpenHands**: it routes models through LiteLLM. In Settings > LLM > Advanced, set the model to `openai/uncensoredllm-1`, the base URL to `https://uncensoredllm.xyz/v1`, and your key. Once the LiteLLM entry ships, `uncensoredllm/uncensoredllm-1` works as well.
