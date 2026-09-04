from rest_framework.routers import DefaultRouter

from .viewset import ReviewViewSet

router = DefaultRouter()
router.register(r'', ReviewViewSet, basename='review')

urlpatterns = router.urls
