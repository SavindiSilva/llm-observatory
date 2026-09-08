from datetime import datetime

from fastapi import APIRouter, Depends, Query
from sqlalchemy import case, func, select
from sqlalchemy.orm import Session

import models
import schemas
from database import get_db

router = APIRouter(tags=["metrics"])


@router.get("/metrics", response_model=schemas.MetricsSummaryOut)
def get_metrics(
    start_date: datetime | None = None,
    end_date: datetime | None = None,
    db: Session = Depends(get_db),
):
    base = select(models.LLMRequest)
    if start_date:
        base = base.where(models.LLMRequest.created_at >= start_date)
    if end_date:
        base = base.where(models.LLMRequest.created_at <= end_date)
    sub = base.subquery()

    totals = db.execute(
        select(
            func.count(sub.c.id),
            func.coalesce(func.sum(case((sub.c.status == "success", 1), else_=0)), 0),
            func.coalesce(func.sum(sub.c.total_tokens), 0),
            func.coalesce(func.sum(sub.c.input_tokens), 0),
            func.coalesce(func.sum(sub.c.output_tokens), 0),
            func.coalesce(func.sum(sub.c.estimated_cost_usd), 0.0),
            func.coalesce(func.avg(sub.c.latency_ms), 0.0),
        )
    ).one()
    (
        total_requests,
        successful_requests,
        total_tokens,
        total_input_tokens,
        total_output_tokens,
        total_cost_usd,
        avg_latency_ms,
    ) = totals
    failed_requests = total_requests - successful_requests
    success_rate = (successful_requests / total_requests) if total_requests else 0.0

    by_provider = db.execute(
        select(sub.c.provider, func.count(sub.c.id)).group_by(sub.c.provider)
    ).all()
    by_model = db.execute(
        select(sub.c.model, func.count(sub.c.id)).group_by(sub.c.model)
    ).all()
    cost_by_provider = db.execute(
        select(sub.c.provider, func.coalesce(func.sum(sub.c.estimated_cost_usd), 0.0)).group_by(sub.c.provider)
    ).all()

    return schemas.MetricsSummaryOut(
        total_requests=total_requests,
        successful_requests=successful_requests,
        failed_requests=failed_requests,
        success_rate=round(success_rate, 4),
        total_tokens=total_tokens,
        total_input_tokens=total_input_tokens,
        total_output_tokens=total_output_tokens,
        total_cost_usd=round(total_cost_usd, 6),
        avg_latency_ms=round(avg_latency_ms, 2),
        requests_by_provider={p: c for p, c in by_provider},
        requests_by_model={m: c for m, c in by_model},
        cost_by_provider={p: round(c, 6) for p, c in cost_by_provider},
    )


@router.get("/metrics/cost", response_model=schemas.CostOverTimeOut)
def get_cost_over_time(
    days: int = Query(default=14, ge=1, le=90),
    db: Session = Depends(get_db),
):
    day_expr = func.strftime("%Y-%m-%d", models.LLMRequest.created_at)
    cutoff = func.datetime("now", f"-{days} days")

    rows = db.execute(
        select(
            day_expr.label("day"),
            func.coalesce(func.sum(models.LLMRequest.estimated_cost_usd), 0.0),
            func.count(models.LLMRequest.id),
            func.coalesce(func.sum(models.LLMRequest.total_tokens), 0),
        )
        .where(models.LLMRequest.created_at >= cutoff)
        .group_by(day_expr)
        .order_by(day_expr)
    ).all()

    points = [
        schemas.CostOverTimePoint(date=day, cost_usd=round(cost, 6), requests=requests, total_tokens=tokens)
        for day, cost, requests, tokens in rows
    ]

    return schemas.CostOverTimeOut(interval="day", points=points)
