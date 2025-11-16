from fastapi import FastAPI
from pydantic import BaseModel, Field


class PredictionRequest(BaseModel):
    adults: int = Field(ge=0, description="Number of adult guests")
    kids: int = Field(ge=0, description="Number of kid guests")
    menu: list[dict] = Field(default_factory=list)


class PredictionResponse(BaseModel):
    total_kg: float
    breakdown: list[dict]
    model_version: str = "v0.0.1"


app = FastAPI(
    title="Nowaste AI Service",
    description="Placeholder service for future ML-powered food estimation.",
    version="0.0.1",
)


@app.post("/predict", response_model=PredictionResponse)
def predict(payload: PredictionRequest):
    """Simple proportional estimator to unblock integration."""
    breakdown = []
    total = 0.0
    for item in payload.menu:
        per_adult = float(item.get("perAdultKg", 0.25))
        per_kid = float(item.get("perKidKg", 0.12))
        quantity = payload.adults * per_adult + payload.kids * per_kid
        breakdown.append(
            {
                "id": item.get("id"),
                "name": item.get("name"),
                "quantityKg": round(quantity, 2),
            }
        )
        total += quantity

    return PredictionResponse(
        total_kg=round(total, 2),
        breakdown=breakdown,
    )







