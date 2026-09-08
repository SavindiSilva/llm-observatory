import asyncio
import uuid

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

import schemas
from database import get_db
from providers import ProviderError
from services.chat_service import call_provider, persist_chat_result, run_chat, validate_model

router = APIRouter(tags=["chat"])


@router.post("/chat", response_model=schemas.LLMRequestOut)
async def chat(payload: schemas.ChatRequest, db: Session = Depends(get_db)):
    try:
        record = await run_chat(
            db=db,
            provider=payload.provider.value,
            model=payload.model,
            prompt=payload.prompt,
            temperature=payload.temperature,
            max_tokens=payload.max_tokens,
            comparison_group_id=payload.comparison_group_id,
        )
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    return record


@router.post("/compare", response_model=schemas.CompareResponseOut)
async def compare(payload: schemas.CompareRequest, db: Session = Depends(get_db)):
    for target in payload.targets:
        try:
            validate_model(target.provider.value, target.model)
        except ValueError as exc:
            raise HTTPException(status_code=422, detail=str(exc)) from exc

    group_id = str(uuid.uuid4())

    async def call(target: schemas.ComparisonTarget):
        try:
            result = await call_provider(
                target.provider.value, target.model, payload.prompt, payload.temperature, payload.max_tokens
            )
            return result, None
        except ProviderError as exc:
            return None, str(exc)

    outcomes = await asyncio.gather(*(call(target) for target in payload.targets))

    results = [
        persist_chat_result(
            db,
            target.provider.value,
            target.model,
            payload.prompt,
            result=result,
            error=error,
            comparison_group_id=group_id,
        )
        for target, (result, error) in zip(payload.targets, outcomes)
    ]

    return schemas.CompareResponseOut(comparison_group_id=group_id, results=results)
