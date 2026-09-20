# ನೇಗಿಲುai ML service

This is an intentionally transparent baseline service, not a trained or validated ML model. It makes no accuracy claims and must be replaced or calibrated only with real, documented datasets.

## Run locally

Create a Python virtual environment, install `pip install -r requirements.txt`, then run:

```bash
uvicorn main:app --host 127.0.0.1 --port 8001 --reload
```

`GET /health` checks availability and `GET /model-info` describes the current baseline. Django calls this service via `ML_SERVICE_URL` (default `http://127.0.0.1:8001`); browsers must call Django's `/api/predictions/*/` endpoints instead.

## Sample requests

```bash
curl http://127.0.0.1:8001/health
curl -X POST http://127.0.0.1:8001/predict/yield -H "Content-Type: application/json" -d '{"crop":"rice","area_hectares":2,"previous_yield_t_per_hectare":3.5,"season":"kharif"}'
curl -X POST http://127.0.0.1:8001/predict/price -H "Content-Type: application/json" -d '{"crop":"rice","location":"Nashik","season":"kharif"}'
```
