import requests

from django.conf import settings


class MLServiceUnavailable(Exception):
    pass


class MLServiceResponseError(Exception):
    pass


def predict(*, path, payload):
    base_url = settings.ML_SERVICE_URL.rstrip("/")
    try:
        response = requests.post(
            f"{base_url}{path}", json=payload, timeout=settings.ML_SERVICE_TIMEOUT_SECONDS,
        )
        response.raise_for_status()
        data = response.json()
    except requests.RequestException as error:
        raise MLServiceUnavailable from error
    except ValueError as error:
        raise MLServiceResponseError from error
    if not isinstance(data, dict) or "prediction" not in data:
        raise MLServiceResponseError
    return data
