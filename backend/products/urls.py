from django.urls import path
from .views import product_list_create

urlpatterns = [
    path('products/', product_list_create),
]