import time

from google import genai
from google.genai import types

from config import settings
from providers.base import BaseProvider, ProviderError, ProviderResult


class GeminiProvider(BaseProvider):
    name = "gemini"

    def __init__(self) -> None:
        self._client: genai.Client | None = None

    def _get_client(self) -> genai.Client:
        if not settings.gemini_api_key:
            raise ProviderError("GEMINI_API_KEY is not configured on the server")
        if self._client is None:
            self._client = genai.Client(api_key=settings.gemini_api_key)
        return self._client

    async def generate(self, model: str, prompt: str, temperature: float, max_tokens: int) -> ProviderResult:
        client = self._get_client()
        start = time.perf_counter()
        try:
            response = await client.aio.models.generate_content(
                model=model,
                contents=prompt,
                config=types.GenerateContentConfig(
                    temperature=temperature,
                    max_output_tokens=max_tokens,
                    # Thinking mode adds tens of seconds of latency and hidden
                    # billed tokens on models that support it; budget=0 is
                    # rejected as invalid on models that don't support thinking
                    # at all, so 1 (effectively "off") is the value that works
                    # across the whole catalog.
                    thinking_config=types.ThinkingConfig(thinking_budget=1),
                ),
            )
        except Exception as exc:
            raise ProviderError(str(exc)) from exc
        latency_ms = (time.perf_counter() - start) * 1000

        text = response.text or ""
        usage = response.usage_metadata
        input_tokens = usage.prompt_token_count if usage and usage.prompt_token_count else 0
        # Gemini's "thinking" tokens are billed as output but reported separately
        # from candidates_token_count, so both must be summed for accurate cost.
        candidates_tokens = usage.candidates_token_count if usage and usage.candidates_token_count else 0
        thoughts_tokens = usage.thoughts_token_count if usage and usage.thoughts_token_count else 0
        output_tokens = candidates_tokens + thoughts_tokens

        return ProviderResult(
            response_text=text,
            input_tokens=input_tokens,
            output_tokens=output_tokens,
            latency_ms=latency_ms,
        )
