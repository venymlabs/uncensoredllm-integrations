"""Offline checks of the plugin's YAML against the SDK's own entities."""

from pathlib import Path

import yaml
from dify_plugin.entities.model import AIModelEntity, ModelPropertyKey
from dify_plugin.entities.model.provider import ProviderEntity

ROOT = Path(__file__).resolve().parents[1]


def _yaml(rel: str):
    return yaml.safe_load((ROOT / rel).read_text("utf-8"))


def test_model_yaml_is_a_valid_entity() -> None:
    entity = AIModelEntity.model_validate(_yaml("models/llm/uncensoredllm-1.yaml"))
    assert entity.model == "uncensoredllm-1"
    assert entity.model_properties[ModelPropertyKey.CONTEXT_SIZE] == 262144
    rules = {r.name: r for r in entity.parameter_rules}
    assert rules["max_tokens"].min == 512
    assert rules["max_tokens"].max == 65536


def test_provider_yaml_is_a_valid_entity() -> None:
    data = _yaml("provider/uncensoredllm.yaml")
    data = {k: v for k, v in data.items() if k not in ("models", "extra")}
    entity = ProviderEntity.model_validate(data)
    assert entity.provider == "uncensoredllm"
    creds = {c.variable: c for c in entity.provider_credential_schema.credential_form_schemas}
    assert creds["api_key"].type.value == "secret-input"
    assert creds["api_key"].required is True
    assert creds["endpoint_url"].default == "https://uncensoredllm.xyz/v1"


def test_position_lists_the_model() -> None:
    assert _yaml("models/llm/_position.yaml") == ["uncensoredllm-1"]
