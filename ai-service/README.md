# Nowaste AI Service Stub

This FastAPI microservice provides a placeholder endpoint for food prediction. It mirrors the architecture planned for Phase 2 where a trained model will replace the current rule-based logic.

## Quickstart

```bash
python -m venv .venv
source .venv/bin/activate  # or .venv\Scripts\activate on Windows
pip install -r requirements.txt
uvicorn app:app --reload --port 5055
```

Once running, you can send a sample request:

```bash
curl -X POST http://localhost:5055/predict \
  -H "Content-Type: application/json" \
  -d '{
    "adults": 80,
    "kids": 20,
    "menu": [
      {"id": "rice", "name": "Veg Biryani", "perAdultKg": 0.25, "perKidKg": 0.12},
      {"id": "dessert", "name": "Gulab Jamun", "perAdultKg": 0.08, "perKidKg": 0.05}
    ]
  }'
```







