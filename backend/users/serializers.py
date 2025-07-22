from rest_framework import serializers
from django.contrib.auth.models import User
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from djoser.serializers import UserCreateSerializer as DjoserUserCreateSerializer # For Djoser's base registration
from djoser.serializers import UserSerializer as DjoserUserSerializer # For Djoser's user representation

class RegisterSerializer(DjoserUserCreateSerializer):
    
    password = serializers.CharField(write_only=True, required=True)
    re_password = serializers.CharField(write_only=True, required=True) # Explicitly define re_password

    # Add other User model fields you want to include in registration form.
    # For instance, if you want to require email:
    email = serializers.EmailField(required=True)
    first_name = serializers.CharField(required=False, max_length=150)
    last_name = serializers.CharField(required=False, max_length=150)

    class Meta(DjoserUserCreateSerializer.Meta):
        model = User
        fields = ('username', 'email', 'first_name', 'last_name', 'password', 're_password') # Add other fields as needed

    def validate(self, attrs):
        if attrs['password'] != attrs['re_password']:
            raise serializers.ValidationError({"re_password": "Passwords do not match."})
        return attrs
    
    def create(self, validated_data):
        # CRITICAL CHANGE: Manually pop 're_password' before creating the user.
        # This field is for validation only and is not part of the User model.
        # Also pop 'password' because create_user expects it as a positional arg, not a keyword arg in **validated_data.
        username = validated_data.pop('username')
        password = validated_data.pop('password')
        re_password = validated_data.pop('re_password') # Ensure re_password is popped

        if 'first_name' in validated_data and not validated_data['first_name']:
            validated_data.pop('first_name')
        if 'last_name' in validated_data and not validated_data['last_name']:
            validated_data.pop('last_name')
        if 'email' in validated_data and not validated_data['email']:
            validated_data.pop('email')

        user = User.objects.create_user(
            username=username,
            password=password,
            **validated_data # This will pass email, first_name, last_name etc.
        )
        return user



class MyTokenObtainPairSerializer(TokenObtainPairSerializer):
    @classmethod
    def get_token(cls, user):
        token = super().get_token(user)
        token['username'] = user.username
        token['email'] = user.email
        # ...
        return token

    def validate(self, attrs):
        data = super().validate(attrs)
        data['username'] = self.user.username
        data['email'] = self.user.email
        return data
    
class PasswordChangeSerializer(serializers.Serializer):
    old_password = serializers.CharField(required=True, write_only=True)
    new_password = serializers.CharField(required=True, write_only=True, min_length=8) # Example: minimum length 8
    confirm_new_password = serializers.CharField(required=True, write_only=True)

    def validate(self, data):
        if data['new_password'] != data['confirm_new_password']:
            raise serializers.ValidationError({"new_password": "New passwords must match."})
        return data
    
# New: Basic User Serializer for Djoser to represent a user
class MyUserSerializer(DjoserUserSerializer):
    class Meta(DjoserUserSerializer.Meta):
        fields = ('id', 'username', 'email', 'first_name', 'last_name')