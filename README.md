# LLM Observatory

An **AI engineering / LLM observability** project: a full-stack app that logs every
LLM request an application makes, then turns that log into a real-time dashboard —
cost, latency, token usage, success rate, and side-by-side model comparisons —
the same category of tooling teams build around production LLM calls (in the
spirit of LangSmith, Helicone, or an internal eval harness), scoped down to a
single portfolio-sized app.

Every number in the UI comes from a real logged request against Groq's and
Google's live APIs. Nothing is mocked or seeded with fake data.

## What it does

- **`POST /chat`** — sends a prompt to a chosen provider/model, logs the full
  request: prompt, response, input/output/total tokens, latency, an estimated
  cost, status, and timestamp.
- **Request history** — every logged request, filterable by provider, model,
  and status, paginated, with a detail view per request.
- **Metrics dashboard** — summary cards (requests, success rate, cost, avg
  latency, tokens), a cost-over-time chart, and a requests-by-model chart.
- **Model comparison** — send the same prompt to two models side by side,
  each panel loading and erroring independently, with a computed "X% cheaper
  / Y% faster" takeaway.
- **LLM-as-judge evaluation** — a third model scores a request's response on
  relevance, groundedness, and completeness, with written reasoning.

## Stack

| Layer | Tech |
|---|---|
| Frontend | React + TypeScript + Vite + Tailwind CSS v4 + Recharts + React Router |
| Backend | FastAPI + SQLAlchemy + Pydantic |
| Database | SQLite |
| LLM providers | Groq, Google Gemini (both free-tier) |

No PostgreSQL, Redis, Kafka, Kubernetes, nginx, or microservices — this is
intentionally a single backend service and a single frontend app talking
directly to it.

## Why Groq and Gemini

Both offer genuinely usable free tiers with no payment method required,
which matters for a project run without a budget. Every request is still
**costed as if it were a paid call**, using each provider's published public
pricing (see `backend/pricing.py`) — so the dashboard reflects realistic
production economics even though the calls themselves are free. Neither
OpenAI nor Anthropic is used; no paid API keys exist for this project.

Model availability on both providers changes often. The active catalog
(`backend/pricing.py`) was checked against each provider's live model-list
API during development — several models originally planned (e.g.
`llama-3.1-8b-instant`, `gemini-2.5-flash`) had already been retired or
restricted by the time of testing and were swapped for their current
equivalents.

## How cost estimation works

Each provider/model pair has a fixed `input_price_per_million` and
`output_price_per_million` in `backend/pricing.py`, sourced from the
provider's public pricing page. On every request, the backend multiplies
real (not estimated) input and output token counts from the provider's API
response by those rates. There is no fallback or synthetic pricing — a
model not in the catalog is rejected before the call is made, rather than
silently costed at zero.

## Notable engineering decisions

**Reasoning tokens can produce a "successful" request with no visible
answer.** Groq's `gpt-oss` models and Gemini's newer Flash models spend part
of their output-token budget on hidden reasoning before writing a visible
answer. With a low `max_tokens`, that budget can be exhausted entirely by
reasoning, leaving `status: success` but an empty response — real tokens
billed, real latency, nothing to show. This surfaced live while seeding
demo data (several `gpt-oss-20b` calls ended with `output_tokens: 128,
response: ""`). Both the request detail page and the comparison panels
detect this and explain it instead of rendering a blank card.

**Gemini's `thinking_budget` doesn't behave uniformly across models.**
`thinking_budget=0` ("disable thinking") is rejected as invalid on models
that don't support thinking at all (`gemini-3.5-flash-lite`), while
`gemini-3.6-flash` accepted every budget value tried — including `1` — but
kept taking ~29 seconds regardless, making the field effectively
non-functional for that model. Rather than ship a model with unpredictable
30-second latency, `gemini-3.6-flash` was dropped from the catalog; the
remaining Gemini models don't do hidden thinking and are fast and
consistent. `thinking_budget=1` (the value that worked everywhere it was
tested) is still set on every Gemini call as a safety margin.

**The model comparison view fires two independent requests, not one grouped
call.** A `/compare` endpoint that runs both providers concurrently
server-side and returns a single combined response was built first — but a
single HTTP response means both comparison panels can only transition from
loading to done at the same instant, which doesn't hold up if one provider
is meaningfully slower than the other. The frontend instead calls `/chat`
twice concurrently, updating each panel's state independently as its own
request resolves — verified live by killing the backend, then restarting
and retrying only one panel: it recovered to a full success view while the
other stayed in its own error state until retried separately. A
client-generated `comparison_group_id` is threaded through both calls so
the two requests stay linked in the database without coupling their
network timing.

## Project structure

```
backend/
  main.py              FastAPI app, CORS, router registration
  config.py             Settings (.env)
  database.py            SQLAlchemy engine/session
  models.py               ORM models: LLMRequest, Evaluation, Model
  schemas.py               Pydantic request/response schemas
  pricing.py                Model catalog + public pricing + cost estimation
  providers/                  Groq and Gemini clients behind a shared interface
  services/                    Shared request-execution + persistence logic
  routers/                      chat, logs, metrics, models, evaluations

frontend/src/
  lib/                    API client, types, formatting helpers
  hooks/useAsync.ts        Shared loading/error/data fetch hook
  components/               Reusable UI: badges, states, charts, pickers
  pages/                      Dashboard, History, RequestDetail, Compare
```

## Setup

### Backend

```bash
cd backend
python -m venv .venv
.venv\Scripts\activate        # Windows
# source .venv/bin/activate   # macOS/Linux
pip install -r requirements.txt
cp .env.example .env
```

Edit `backend/.env` and add your free-tier API keys:

```
GROQ_API_KEY=your-groq-key
GEMINI_API_KEY=your-gemini-key
```

- Groq keys: [console.groq.com](https://console.groq.com)
- Gemini keys: [aistudio.google.com](https://aistudio.google.com)

Run the API:

```bash
uvicorn main:app --reload --port 8000
```

API docs at `http://localhost:8000/docs`.

### Frontend

```bash
cd frontend
npm install
cp .env.example .env
npm run dev
```

Open `http://localhost:5173`. The frontend expects the backend at
`http://127.0.0.1:8000` by default (`VITE_API_BASE_URL` in `frontend/.env`).

## API reference

| Method | Path | Purpose |
|---|---|---|
| POST | `/chat` | Send a prompt to one provider/model, log the result |
| POST | `/compare` | Send a prompt to 2–4 targets concurrently, server-side |
| GET | `/logs` | Paginated request history, filterable by provider/model/status |
| GET | `/logs/{id}` | Full detail for one request, including evaluations |
| GET | `/metrics` | Aggregate summary: totals, success rate, cost/requests by provider and model |
| GET | `/metrics/cost` | Cost and request volume grouped by day |
| GET | `/models` | The active model catalog with pricing and context window |
| POST | `/evaluations/{request_id}` | Run an LLM-as-judge evaluation against a logged request |
