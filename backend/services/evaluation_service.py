import json
import re

from sqlalchemy.orm import Session

import models
import pricing
from providers import ProviderError, get_provider

# Judging with the *other* provider than the one being judged avoids the
# well-documented self-preference bias LLM judges show toward their own
# family's outputs.
DEFAULT_JUDGE_MODEL = {
    "groq": "openai/gpt-oss-120b",
    "gemini": "gemini-3.5-flash",
}

JUDGE_PROMPT_TEMPLATE = """You are an impartial evaluator for LLM responses. Score the response to the user \
prompt below on three criteria, each a float from 0.0 (very poor) to 1.0 (excellent):

- relevance: does the response directly address what the user asked?
- groundedness: are the claims in the response plausible and factually sound, without fabricated or \
unsupported information?
- completeness: does the response fully cover what the prompt asked for, without leaving out important parts?

User prompt:
\"\"\"
{prompt}
\"\"\"

Model response:
\"\"\"
{response}
\"\"\"

Respond with ONLY a JSON object in exactly this shape, no other text, no markdown code fences:
{{"relevance": <float>, "groundedness": <float>, "completeness": <float>, "reasoning": "<1-3 sentence \
explanation>"}}
"""

_JSON_BLOCK = re.compile(r"\{.*\}", re.DOTALL)


class EvaluationError(Exception):
    """Raised when the judge call fails or its output can't be parsed."""


def pick_default_judge(request_provider: str) -> tuple[str, str]:
    judge_provider = "gemini" if request_provider == "groq" else "groq"
    return judge_provider, DEFAULT_JUDGE_MODEL[judge_provider]


def _clamp(value: float) -> float:
    return max(0.0, min(1.0, value))


def _parse_judge_response(text: str) -> tuple[float, float, float, str | None]:
    match = _JSON_BLOCK.search(text)
    if not match:
        raise EvaluationError(f"Judge did not return parseable JSON: {text[:200]!r}")
    try:
        payload = json.loads(match.group(0))
    except json.JSONDecodeError as exc:
        raise EvaluationError(f"Judge returned invalid JSON: {exc}") from exc

    try:
        relevance = _clamp(float(payload["relevance"]))
        groundedness = _clamp(float(payload["groundedness"]))
        completeness = _clamp(float(payload["completeness"]))
    except (KeyError, TypeError, ValueError) as exc:
        raise EvaluationError(f"Judge JSON missing/invalid score fields: {payload!r}") from exc

    reasoning = payload.get("reasoning")
    reasoning = str(reasoning) if reasoning is not None else None
    return relevance, groundedness, completeness, reasoning


async def run_evaluation(
    db: Session,
    request: models.LLMRequest,
    judge_provider: str | None,
    judge_model: str | None,
) -> models.Evaluation:
    if request.status != "success" or not request.response:
        raise ValueError("Only successfully completed requests with a response can be evaluated")

    if judge_provider is None or judge_model is None:
        judge_provider, judge_model = pick_default_judge(request.provider)

    if pricing.get_model_info(judge_provider, judge_model) is None:
        raise ValueError(f"Judge model '{judge_model}' is not supported for provider '{judge_provider}'")

    prompt = JUDGE_PROMPT_TEMPLATE.format(prompt=request.prompt, response=request.response)

    client = get_provider(judge_provider)
    try:
        result = await client.generate(model=judge_model, prompt=prompt, temperature=0.0, max_tokens=400)
    except ProviderError as exc:
        raise EvaluationError(f"Judge call failed: {exc}") from exc

    relevance, groundedness, completeness, reasoning = _parse_judge_response(result.response_text)
    overall = round((relevance + groundedness + completeness) / 3, 4)

    evaluation = models.Evaluation(
        request_id=request.id,
        relevance_score=relevance,
        groundedness_score=groundedness,
        completeness_score=completeness,
        overall_score=overall,
        reasoning=reasoning,
        judge_provider=judge_provider,
        judge_model=judge_model,
    )
    db.add(evaluation)
    db.commit()
    db.refresh(evaluation)
    return evaluation
