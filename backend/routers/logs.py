from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import func, select
from sqlalchemy.orm import Session

import models
import schemas
from database import get_db

router = APIRouter(tags=["logs"])


@router.get("/logs", response_model=schemas.LogListOut)
def list_logs(
    provider: str | None = None,
    model: str | None = None,
    status: str | None = None,
    start_date: datetime | None = None,
    end_date: datetime | None = None,
    limit: int = Query(default=25, ge=1, le=200),
    offset: int = Query(default=0, ge=0),
    db: Session = Depends(get_db),
):
    stmt = select(models.LLMRequest)
    if provider:
        stmt = stmt.where(models.LLMRequest.provider == provider)
    if model:
        stmt = stmt.where(models.LLMRequest.model == model)
    if status:
        stmt = stmt.where(models.LLMRequest.status == status)
    if start_date:
        stmt = stmt.where(models.LLMRequest.created_at >= start_date)
    if end_date:
        stmt = stmt.where(models.LLMRequest.created_at <= end_date)

    total = db.execute(select(func.count()).select_from(stmt.subquery())).scalar_one()

    stmt = stmt.order_by(models.LLMRequest.created_at.desc()).offset(offset).limit(limit)
    items = db.execute(stmt).scalars().all()

    return schemas.LogListOut(items=items, total=total, limit=limit, offset=offset)


@router.get("/logs/{request_id}", response_model=schemas.LLMRequestDetailOut)
def get_log(request_id: int, db: Session = Depends(get_db)):
    record = db.get(models.LLMRequest, request_id)
    if record is None:
        raise HTTPException(status_code=404, detail="Request not found")
    return record
