from rest_framework.routers import DefaultRouter
from .views import ProductViewSet, WishlistViewSet

router = DefaultRouter()
router.register("wishlist", WishlistViewSet, basename="wishlist")
router.register("", ProductViewSet, basename="product")

urlpatterns = router.urls