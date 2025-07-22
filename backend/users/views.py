from rest_framework import generics, status
from rest_framework.response import Response
from django.http import JsonResponse
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework_simplejwt.views import TokenObtainPairView
from django.contrib.auth.models import User # Django's built-in User model
from rest_framework.decorators import api_view, permission_classes
from django.contrib.auth.hashers import make_password # Import for hashing
from rest_framework.views import APIView # For password change
from .serializers import MyTokenObtainPairSerializer, PasswordChangeSerializer # Import new serializer

from .serializers import MyTokenObtainPairSerializer # Will create these

# Register API
# class RegisterView(generics.CreateAPIView):
#     queryset = User.objects.all()
#     permission_classes = (AllowAny,) # Anyone can register
#     serializer_class = RegisterSerializer

# Login API (uses djangorestframework-simplejwt's default token view)
class LoginView(TokenObtainPairView):
    permission_classes = (AllowAny,) # Anyone can login
    serializer_class = MyTokenObtainPairSerializer # Custom serializer to include username

# Example Protected View
from rest_framework.views import APIView
class ProtectedView(APIView):
    permission_classes = (IsAuthenticated,) # Only authenticated users can access

    def get(self, request):
        return Response({"message": f"Hello, {request.user.username}! This is protected data."})
    
@api_view(['GET'])
@permission_classes([AllowAny])
def home_view(request):
    return JsonResponse({"message": "Welcome to the API!"})

class PasswordChangeView(APIView):
    permission_classes = (IsAuthenticated,) # Only authenticated users can change password
    serializer_class = PasswordChangeSerializer # Use the new serializer

    def post(self, request, *args, **kwargs):
        serializer = self.serializer_class(data=request.data, context={'request': request})
        serializer.is_valid(raise_exception=True)

        user = request.user
        old_password = serializer.validated_data.get('old_password')
        new_password = serializer.validated_data.get('new_password')

        # Check if the old password is correct
        if not user.check_password(old_password):
            return Response({"old_password": ["Wrong password."]}, status=status.HTTP_400_BAD_REQUEST)

        # Set the new password and save the user
        user.set_password(new_password)
        user.save()

        # Optionally re-issue token or invalidate old token (more complex, for now user will be logged out or token will expire)
        # For simplicity, we'll just return a success message and let the client handle re-login if desired.

        return Response({"message": "Password updated successfully."}, status=status.HTTP_200_OK)