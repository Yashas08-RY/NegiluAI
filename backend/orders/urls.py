from rest_framework.routers import DefaultRouter

from .views import CartItemViewSet, CartViewSet, FarmerOrderItemViewSet, FarmerOrderViewSet, OrderViewSet

router = DefaultRouter()
router.register("carts", CartViewSet, basename="cart")
router.register("cart-items", CartItemViewSet, basename="cart-item")
router.register("orders", OrderViewSet, basename="order")
router.register("farmer/order-items", FarmerOrderItemViewSet, basename="farmer-order-item")
router.register("farmer/orders", FarmerOrderViewSet, basename="farmer-order")

urlpatterns = router.urls
