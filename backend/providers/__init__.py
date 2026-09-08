from providers.base import ProviderError, ProviderResult
from providers.gemini_provider import GeminiProvider
from providers.groq_provider import GroqProvider

_PROVIDERS = {
    "groq": GroqProvider(),
    "gemini": GeminiProvider(),
}


def get_provider(name: str):
    provider = _PROVIDERS.get(name)
    if provider is None:
        raise ValueError(f"Unknown provider: {name}")
    return provider


__all__ = ["get_provider", "ProviderError", "ProviderResult"]
