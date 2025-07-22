from django.urls import path
from .views import LoginView, ProtectedView, home_view, PasswordChangeView # Import PasswordChangeView
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from rest_framework_simplejwt.views import (
    TokenObtainPairView,
    TokenRefreshView,
    TokenVerifyView,
)

urlpatterns = [
    path('', home_view, name='home'), # <--- ADD THIS LINE!
    path('login/', LoginView.as_view(), name='token_obtain_pair'), # Default Simple JWT login
    path('login/refresh/', TokenRefreshView.as_view(), name='token_refresh'), # For refreshing tokens
    path('protected/', ProtectedView.as_view(), name='protected_data'),
    path('password-change/', PasswordChangeView.as_view(), name='password_change'), # <--- ADD THIS LINE
]