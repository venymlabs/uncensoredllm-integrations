# UncensoredLLM component for Langflow

`components/uncensoredllm/uncensoredllm_model.py` is a Langflow model component. It has the same two outputs as Langflow's own model components: **Model Response** (a message) and **Language Model** (connect it to an **Agent** or any node that takes a model). Tool calls work.

## Install (either way)

- **Paste.** In the flow editor add **Custom Component**, open its code, replace it with the file's contents, and save.
- **Load from a folder.** Copy the `uncensoredllm` folder into a directory and start Langflow with `LANGFLOW_COMPONENTS_PATH=<that directory>`. The component shows up under the **uncensoredllm** category.

Then set **UncensoredLLM API Key**. By default the field points at a Langflow global variable named `UNCENSOREDLLM_API_KEY`: create it under **Settings > Global Variables** as a Credential, and the key never sits in the flow.

Advanced inputs: **Reasoning** (`extended` or `fast`), **Max Tokens** (0 leaves it to the server; otherwise at least 512), **Temperature**, **JSON Mode**, **Base URL**, **Timeout**.

## Native listing

Langflow now ships third-party providers in its `lfx-bundles` distribution (`src/bundles/lfx-bundles/src/lfx_bundles/<provider>/`, see `deepseek/deepseek.py`). This component follows that file's structure, so it can be offered there as a pull request. Not prepared as a patch here: the bundle code uses Langflow-internal SSRF helpers (`lfx.base.models.provider_ssrf`, `lfx.utils.ssrf_httpx`) that a maintainer would expect, and the repository's own tests and docs page would need to be added in a clone.

## Tested

With `lfx` 1.13.3 (Langflow's executor package, same version as Langflow 1.13.3), `langchain-openai` 1.8.5, `langchain-core` 1.8.4 in a sandbox venv, `tests/test_component.py`:

- `build_custom_components([path])`, the loader behind `LANGFLOW_COMPONENTS_PATH`, finds it with both outputs and a password key field;
- `create_component_template({"code": ...})`, the path the editor's Custom Component takes, builds it;
- live: `text_response()` returns the reply; the built model with a bound tool returns a `get_weather` call with `city` Paris.

The Langflow server and its UI were not run.
