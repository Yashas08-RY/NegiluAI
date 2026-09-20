"""Baseline ML service; replace baseline functions only after validated datasets/models exist."""
from typing import Literal

from fastapi import FastAPI
from pydantic import BaseModel, Field

app = FastAPI(title="ನೇಗಿಲುai ML Service", version="0.1.0")


class YieldRequest(BaseModel):
    crop: str = Field(min_length=2, max_length=100)
    area_hectares: float = Field(gt=0, le=100_000)
    previous_yield_t_per_hectare: float | None = Field(default=None, gt=0, le=1_000)
    season: Literal["kharif", "rabi", "zaid"] | None = None


class PriceRequest(BaseModel):
    crop: str = Field(min_length=2, max_length=100)
    location: str = Field(min_length=2, max_length=100)
    season: Literal["kharif", "rabi", "zaid"] | None = None


class PredictionResponse(BaseModel):
    prediction: float
    unit: str
    model_type: Literal["baseline"] = "baseline"
    disclaimer: str


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


@app.get("/model-info")
def model_info() -> dict[str, str]:
    return {"model_type": "baseline", "status": "No trained model or accuracy claim is available until real validated datasets are supplied."}


@app.post("/predict/yield", response_model=PredictionResponse)
def predict_yield(data: YieldRequest) -> PredictionResponse:
    # Transparent placeholder: use supplied historical yield, otherwise 1 t/ha.
    per_hectare = data.previous_yield_t_per_hectare or 1.0
    return PredictionResponse(prediction=round(per_hectare * data.area_hectares, 2), unit="tonnes", disclaimer="Baseline calculation, not a trained prediction. Supply validated crop data before relying on it.")


@app.post("/predict/price", response_model=PredictionResponse)
def predict_price(data: PriceRequest) -> PredictionResponse:
    # Deliberately neutral baseline; no fabricated crop-specific market assumptions.
    return PredictionResponse(prediction=0.0, unit="INR per kg", disclaimer="Baseline placeholder of 0.0, not a market forecast. Supply validated price data before relying on it.")
