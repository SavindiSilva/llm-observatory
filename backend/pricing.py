"""Public pricing catalog for supported providers/models.

Prices are USD per 1M tokens, taken from each provider's published pricing
page. We are on free tiers for both providers, but every request is costed
as if it were billed at these public rates so the dashboard reflects
realistic production economics.
"""

from dataclasses import dataclass


@dataclass(frozen=True)
class ModelInfo:
    provider: str
    name: str
    display_name: str
    input_price_per_million: float
    output_price_per_million: float
    context_window: int


MODEL_CATALOG: dict[str, dict[str, ModelInfo]] = {
    "groq": {
        "openai/gpt-oss-20b": ModelInfo(
            provider="groq",
            name="openai/gpt-oss-20b",
            display_name="GPT-OSS 20B",
            input_price_per_million=0.075,
            output_price_per_million=0.30,
            context_window=131072,
        ),
        "openai/gpt-oss-120b": ModelInfo(
            provider="groq",
            name="openai/gpt-oss-120b",
            display_name="GPT-OSS 120B",
            input_price_per_million=0.15,
            output_price_per_million=0.60,
            context_window=131072,
        ),
        "qwen/qwen3.8-27b": ModelInfo(
            provider="groq",
            name="qwen/qwen3.8-27b",
            display_name="Qwen 3.8 27B",
            input_price_per_million=0.80,
            output_price_per_million=4.00,
            context_window=131072,
        ),
    },
    "gemini": {
        "gemini-3.5-flash-lite": ModelInfo(
            provider="gemini",
            name="gemini-3.5-flash-lite",
            display_name="Gemini 3.5 Flash-Lite",
            input_price_per_million=0.30,
            output_price_per_million=2.50,
            context_window=1048576,
        ),
        "gemini-3.5-flash": ModelInfo(
            provider="gemini",
            name="gemini-3.5-flash",
            display_name="Gemini 3.5 Flash",
            input_price_per_million=1.50,
            output_price_per_million=9.00,
            context_window=1048576,
        ),
    },
}


def get_model_info(provider: str, model: str) -> ModelInfo | None:
    return MODEL_CATALOG.get(provider, {}).get(model)


def estimate_cost(provider: str, model: str, input_tokens: int, output_tokens: int) -> float:
    info = get_model_info(provider, model)
    if info is None:
        return 0.0
    cost = (input_tokens / 1_000_000) * info.input_price_per_million
    cost += (output_tokens / 1_000_000) * info.output_price_per_million
    return round(cost, 8)


def all_models() -> list[ModelInfo]:
    return [info for models in MODEL_CATALOG.values() for info in models.values()]
