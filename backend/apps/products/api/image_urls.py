from rest_framework.routers import DefaultRouter

from .viewset import ProductImageViewSet

router = DefaultRouter()
router.register(r'', ProductImageViewSet, basename='product-image')

urlpatterns = router.urls
