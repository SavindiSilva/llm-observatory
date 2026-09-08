from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

import models
import schemas
from database import get_db
from services.evaluation_service import EvaluationError, run_evaluation

router = APIRouter(tags=["evaluations"])


@router.post("/evaluations/{request_id}", response_model=schemas.EvaluationOut)
async def create_evaluation(
    request_id: int,
    payload: schemas.EvaluationRequest = schemas.EvaluationRequest(),
    db: Session = Depends(get_db),
):
    request = db.get(models.LLMRequest, request_id)
    if request is None:
        raise HTTPException(status_code=404, detail="Request not found")

    judge_provider = payload.judge_provider.value if payload.judge_provider else None
    try:
        evaluation = await run_evaluation(db, request, judge_provider, payload.judge_model)
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    except EvaluationError as exc:
        raise HTTPException(status_code=502, detail=str(exc)) from exc

    return evaluation
