from rest_framework import serializers
from .models import Portfolio, Currency, Stock

class PortfolioSerializer(serializers.ModelSerializer):
    class Meta:
        model = Portfolio
        fields = ['id', 'name', 'created_at', 'updated_at', 'user']
        read_only_fields = ['user', 'created_at', 'updated_at'] # User will be set by the view

class CurrencySerializer(serializers.ModelSerializer):
    class Meta:
        model = Currency
        fields = ['id', 'name', 'symbol', 'price_per', 'current_entry_price', 'amount_owned', 'portfolio', 'created_at', 'updated_at'] # Add new fields here
        read_only_fields = ['created_at', 'updated_at']

class StockSerializer(serializers.ModelSerializer):
    portfolio = serializers.SerializerMethodField()
    class Meta:
        model = Stock
        fields = ['id', 'name', 'symbol', 'cost_per_share', 'shares_owned', 'portfolio', 'created_at', 'updated_at']
        read_only_fields = ['created_at', 'updated_at']
    
    def get_portfolio(self, obj):
        # This method will return the ID of the related portfolio
        return obj.portfolio.id