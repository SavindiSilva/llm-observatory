from dataclasses import dataclass


@dataclass
class ProviderResult:
    response_text: str
    input_tokens: int
    output_tokens: int
    latency_ms: float


class ProviderError(Exception):
    """Raised when an upstream provider call fails."""


class BaseProvider:
    name: str

    async def generate(self, model: str, prompt: str, temperature: float, max_tokens: int) -> ProviderResult:
        raise NotImplementedError
