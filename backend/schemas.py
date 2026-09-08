from datetime import datetime
from enum import Enum

from pydantic import BaseModel, ConfigDict, Field


class Provider(str, Enum):
    groq = "groq"
    gemini = "gemini"


class RequestStatus(str, Enum):
    success = "success"
    error = "error"


class ChatRequest(BaseModel):
    provider: Provider
    model: str
    prompt: str = Field(min_length=1, max_length=32000)
    temperature: float = Field(default=0.7, ge=0.0, le=2.0)
    max_tokens: int = Field(default=1024, ge=1, le=8192)
    comparison_group_id: str | None = Field(default=None, max_length=36)


class LLMRequestOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    provider: str
    model: str
    prompt: str
    response: str | None
    input_tokens: int
    output_tokens: int
    total_tokens: int
    latency_ms: float
    estimated_cost_usd: float
    status: str
    error_message: str | None
    comparison_group_id: str | None
    created_at: datetime


class EvaluationOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    request_id: int
    relevance_score: float
    groundedness_score: float
    completeness_score: float
    overall_score: float
    reasoning: str | None
    judge_provider: str
    judge_model: str
    created_at: datetime


class LLMRequestDetailOut(LLMRequestOut):
    evaluations: list[EvaluationOut] = []


class LogListOut(BaseModel):
    items: list[LLMRequestOut]
    total: int
    limit: int
    offset: int


class ModelOut(BaseModel):
    provider: str
    name: str
    display_name: str
    input_price_per_million: float
    output_price_per_million: float
    context_window: int
    retired: bool


class MetricsSummaryOut(BaseModel):
    total_requests: int
    successful_requests: int
    failed_requests: int
    success_rate: float
    total_tokens: int
    total_input_tokens: int
    total_output_tokens: int
    total_cost_usd: float
    avg_latency_ms: float
    requests_by_provider: dict[str, int]
    requests_by_model: dict[str, int]
    cost_by_provider: dict[str, float]


class CostOverTimePoint(BaseModel):
    date: str
    cost_usd: float
    requests: int
    total_tokens: int


class CostOverTimeOut(BaseModel):
    interval: str
    points: list[CostOverTimePoint]


class ComparisonTarget(BaseModel):
    provider: Provider
    model: str


class CompareRequest(BaseModel):
    prompt: str = Field(min_length=1, max_length=32000)
    targets: list[ComparisonTarget] = Field(min_length=2, max_length=4)
    temperature: float = Field(default=0.7, ge=0.0, le=2.0)
    max_tokens: int = Field(default=1024, ge=1, le=8192)


class CompareResponseOut(BaseModel):
    comparison_group_id: str
    results: list[LLMRequestOut]


class EvaluationRequest(BaseModel):
    judge_provider: Provider | None = None
    judge_model: str | None = None
