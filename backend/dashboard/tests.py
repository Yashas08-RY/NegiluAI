from unittest.mock import Mock, patch

from rest_framework import status
from rest_framework.test import APITestCase

from users.models import User

class MLPredictionProxyTests(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user(username="predictor", password="SafePass123!", role="farmer")
        self.client.force_authenticate(self.user)

    @patch("dashboard.ml_client.requests.post")
    def test_yield_prediction_uses_configured_service(self, post):
        response_mock = Mock()
        response_mock.json.return_value = {"prediction": 7.0, "unit": "tonnes", "model_type": "baseline", "disclaimer": "baseline"}
        response_mock.raise_for_status.return_value = None
        post.return_value = response_mock
        response = self.client.post("/api/predictions/yield/", {"crop": "rice", "area_hectares": 2, "previous_yield_t_per_hectare": 3.5}, format="json")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["prediction"], 7.0)
        self.assertTrue(post.called)

    @patch("dashboard.ml_client.requests.post")
    def test_unavailable_ml_service_returns_clear_503(self, post):
        import requests
        post.side_effect = requests.Timeout()
        response = self.client.post("/api/predictions/price/", {"crop": "rice", "location": "Nashik"}, format="json")
        self.assertEqual(response.status_code, status.HTTP_503_SERVICE_UNAVAILABLE)
        self.assertIn("unavailable", response.data["detail"])
