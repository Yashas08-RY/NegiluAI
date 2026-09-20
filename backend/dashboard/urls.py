from rest_framework.routers import DefaultRouter
from .views import FarmerDashboardViewSet, ConsumerDashboardViewSet, AdminDashboardViewSet
from .ml_views import PricePredictionView, YieldPredictionView
from django.urls import path

router = DefaultRouter()
router.register("farmer", FarmerDashboardViewSet, basename="farmer-dashboard")
router.register("consumer", ConsumerDashboardViewSet, basename="consumer-dashboard")
router.register("admin", AdminDashboardViewSet, basename="admin-dashboard")

urlpatterns = router.urls + [
    path("predictions/yield/", YieldPredictionView.as_view(), name="prediction-yield"),
    path("predictions/price/", PricePredictionView.as_view(), name="prediction-price"),
]
