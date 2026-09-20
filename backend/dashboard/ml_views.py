from rest_framework import serializers, status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from .ml_client import MLServiceResponseError, MLServiceUnavailable, predict


class YieldPredictionSerializer(serializers.Serializer):
    crop = serializers.CharField(min_length=2, max_length=100)
    area_hectares = serializers.FloatField(min_value=0.0001, max_value=100_000)
    previous_yield_t_per_hectare = serializers.FloatField(min_value=0.0001, max_value=1_000, required=False)
    season = serializers.ChoiceField(("kharif", "rabi", "zaid"), required=False)


class PricePredictionSerializer(serializers.Serializer):
    crop = serializers.CharField(min_length=2, max_length=100)
    location = serializers.CharField(min_length=2, max_length=100)
    season = serializers.ChoiceField(("kharif", "rabi", "zaid"), required=False)


class PredictionView(APIView):
    permission_classes = [IsAuthenticated]
    serializer_class = None
    service_path = ""

    def post(self, request):
        serializer = self.serializer_class(data=request.data)
        serializer.is_valid(raise_exception=True)
        try:
            return Response(predict(path=self.service_path, payload=serializer.validated_data))
        except MLServiceUnavailable:
            return Response({"detail": "The prediction service is currently unavailable. Please try again later."}, status=status.HTTP_503_SERVICE_UNAVAILABLE)
        except MLServiceResponseError:
            return Response({"detail": "The prediction service returned an invalid response."}, status=status.HTTP_502_BAD_GATEWAY)


class YieldPredictionView(PredictionView):
    serializer_class = YieldPredictionSerializer
    service_path = "/predict/yield"


class PricePredictionView(PredictionView):
    serializer_class = PricePredictionSerializer
    service_path = "/predict/price"
