from django.urls import path

from .views import ClientErrorLogView

urlpatterns = [
    path('client/', ClientErrorLogView.as_view(), name='client-error-log'),
]
