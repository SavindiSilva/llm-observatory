from sqlalchemy.orm import Session

import models
import pricing
from providers import ProviderError, ProviderResult, get_provider


def validate_model(provider: str, model: str) -> None:
    info = pricing.get_model_info(provider, model)
    if info is None:
        raise ValueError(f"Model '{model}' is not supported for provider '{provider}'")
    if info.retired:
        raise ValueError(f"Model '{model}' has been retired and can no longer be used for new requests")


async def call_provider(provider: str, model: str, prompt: str, temperature: float, max_tokens: int) -> ProviderResult:
    validate_model(provider, model)
    client = get_provider(provider)
    return await client.generate(model=model, prompt=prompt, temperature=temperature, max_tokens=max_tokens)


def persist_chat_result(
    db: Session,
    provider: str,
    model: str,
    prompt: str,
    result: ProviderResult | None = None,
    error: str | None = None,
    comparison_group_id: str | None = None,
) -> models.LLMRequest:
    if result is not None:
        total_tokens = result.input_tokens + result.output_tokens
        cost = pricing.estimate_cost(provider, model, result.input_tokens, result.output_tokens)
        record = models.LLMRequest(
            provider=provider,
            model=model,
            prompt=prompt,
            response=result.response_text,
            input_tokens=result.input_tokens,
            output_tokens=result.output_tokens,
            total_tokens=total_tokens,
            latency_ms=result.latency_ms,
            estimated_cost_usd=cost,
            status="success",
            error_message=None,
            comparison_group_id=comparison_group_id,
        )
    else:
        record = models.LLMRequest(
            provider=provider,
            model=model,
            prompt=prompt,
            response=None,
            input_tokens=0,
            output_tokens=0,
            total_tokens=0,
            latency_ms=0.0,
            estimated_cost_usd=0.0,
            status="error",
            error_message=error or "Unknown error",
            comparison_group_id=comparison_group_id,
        )

    db.add(record)
    db.commit()
    db.refresh(record)
    return record


async def run_chat(
    db: Session,
    provider: str,
    model: str,
    prompt: str,
    temperature: float,
    max_tokens: int,
    comparison_group_id: str | None = None,
) -> models.LLMRequest:
    validate_model(provider, model)
    try:
        result = await call_provider(provider, model, prompt, temperature, max_tokens)
        return persist_chat_result(db, provider, model, prompt, result=result, comparison_group_id=comparison_group_id)
    except ProviderError as exc:
        return persist_chat_result(db, provider, model, prompt, error=str(exc), comparison_group_id=comparison_group_id)
