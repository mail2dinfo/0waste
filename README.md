# Nowaste Platform Skeleton

This repository bootstraps the Nowaste platform by mirroring the `investo` project's client-server structure while extending the data model for food waste reduction use cases.

## Project Layout

```
.
├─ client/         # React + Vite + Tailwind frontend
├─ server/         # Node.js + Express + Sequelize API
└─ ai-service/     # FastAPI microservice placeholder for future ML model
```

## Phase 1 — Foundation & Validation

- **Core MVP**: Event planning dashboard, RSVP collection, and rule-based food estimation.
- **Data Model**: `nw_users`, `nw_events`, `nw_guests`, `nw_food_items`, `nw_predictions`.
- **Communication**: Future integration points for WhatsApp / email invite automation.
- **AI Stub**: Rule-based estimator in both Node (API) and Python (microservice) to be swapped with ML in Phase 2.

## Using the Client

```bash
cd client
npm install
npm run dev
```

The UI follows Investo's layout conventions with a dashboard, events list, event planner, guest manager, and prediction view.

## Using the Server

```bash
cd server
npm install
copy ..\docs\server.env.sample .env   # adjust values to reuse Investo database with nw_* tables
npm run dev
```

Key endpoints:

- `GET /api/health` — service status
- `POST /api/events` — create event (requires `x-user-id` header)
- `POST /api/predictions/:eventId` — generate rule-based recommendation snapshot

Refer to `src/models` for Sequelize definitions that extend the shared Investo database.

## AI Stub

```bash
cd ai-service
python -m venv .venv
pip install -r requirements.txt
uvicorn app:app --reload --port 5055
```

Phase 2 will replace the stub with an ML model trained on collected event telemetry.

## Next Steps

1. Wire authentication to share Investo's user system or migrate accounts.
2. Implement migrations to create `nw_*` tables alongside existing schema.
3. Connect messaging integrations (WhatsApp, email) for invite automation.
4. Instrument usage analytics for AI training data pipeline.


