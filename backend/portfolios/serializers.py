from rest_framework import serializers
from .models import Portfolio, Currency

class PortfolioSerializer(serializers.ModelSerializer):
    class Meta:
        model = Portfolio
        fields = ['id', 'name', 'created_at', 'updated_at', 'user']
        read_only_fields = ['user', 'created_at', 'updated_at'] # User will be set by the view

class CurrencySerializer(serializers.ModelSerializer):
    class Meta:
        model = Currency
        fields = ['id', 'name', 'symbol', 'price_per', 'amount_owned', 'portfolio', 'created_at', 'updated_at'] # Add new fields here
        read_only_fields = ['created_at', 'updated_at']