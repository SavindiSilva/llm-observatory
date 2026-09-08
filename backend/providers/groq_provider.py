import time

from groq import AsyncGroq

from config import settings
from providers.base import BaseProvider, ProviderError, ProviderResult


class GroqProvider(BaseProvider):
    name = "groq"

    def __init__(self) -> None:
        self._client: AsyncGroq | None = None

    def _get_client(self) -> AsyncGroq:
        if not settings.groq_api_key:
            raise ProviderError("GROQ_API_KEY is not configured on the server")
        if self._client is None:
            self._client = AsyncGroq(api_key=settings.groq_api_key)
        return self._client

    async def generate(self, model: str, prompt: str, temperature: float, max_tokens: int) -> ProviderResult:
        client = self._get_client()
        start = time.perf_counter()
        try:
            completion = await client.chat.completions.create(
                model=model,
                messages=[{"role": "user", "content": prompt}],
                temperature=temperature,
                max_tokens=max_tokens,
            )
        except Exception as exc:  # groq raises various APIError subclasses
            raise ProviderError(str(exc)) from exc
        latency_ms = (time.perf_counter() - start) * 1000

        choice = completion.choices[0] if completion.choices else None
        text = choice.message.content if choice and choice.message else ""
        usage = completion.usage
        input_tokens = usage.prompt_tokens if usage else 0
        output_tokens = usage.completion_tokens if usage else 0

        return ProviderResult(
            response_text=text or "",
            input_tokens=input_tokens,
            output_tokens=output_tokens,
            latency_ms=latency_ms,
        )
