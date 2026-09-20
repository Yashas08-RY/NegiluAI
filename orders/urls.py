from rest_framework.routers import DefaultRouter

from .views import CartItemViewSet, CartViewSet, OrderViewSet

router = DefaultRouter()
router.register("carts", CartViewSet, basename="cart")
router.register("cart-items", CartItemViewSet, basename="cart-item")
router.register("orders", OrderViewSet, basename="order")

urlpatterns = router.urls