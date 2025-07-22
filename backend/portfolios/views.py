# backend/portfolios/views.py

from rest_framework import viewsets, permissions, serializers # Ensure serializers is imported
from django.shortcuts import get_object_or_404
from django.db import IntegrityError # Ensure this is imported

from .models import Portfolio, Currency
from .serializers import PortfolioSerializer, CurrencySerializer

class PortfolioViewSet(viewsets.ModelViewSet):
    queryset = Portfolio.objects.all()
    serializer_class = PortfolioSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        # Ensure users can only see/manage their own portfolios
        return self.queryset.filter(user=self.request.user)

    def perform_create(self, serializer):
        # When creating a portfolio, automatically set the owner to the current user
        serializer.save(user=self.request.user)

class CurrencyViewSet(viewsets.ModelViewSet):
    queryset = Currency.objects.all()
    serializer_class = CurrencySerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        # --- CRITICAL FIX HERE ---
        portfolio_pk = self.kwargs.get('portfolio_pk')
        if portfolio_pk:
            # If portfolio_pk is present in the URL (nested route),
            # filter currencies for that specific portfolio AND the current user.
            return self.queryset.filter(portfolio__id=portfolio_pk, portfolio__user=self.request.user)
        else:
            # If no portfolio_pk is in the URL (top-level /api/currencies/ route),
            # return all currencies belonging to the current user.
            return self.queryset.filter(portfolio__user=self.request.user)
    # --- END CRITICAL FIX ---


    def perform_create(self, serializer):
        portfolio_pk_from_url = self.kwargs.get('portfolio_pk')

        if portfolio_pk_from_url:
            # Case 1: Currency is created via a nested URL (e.g., POST /portfolios/1/currencies/)
            # The portfolio is directly from the URL.
            portfolio = get_object_or_404(Portfolio, id=portfolio_pk_from_url, user=self.request.user)
            serializer.save(portfolio=portfolio)
        else:
            # Case 2: Currency is created via a top-level URL (e.g., POST /currencies/)
            # The portfolio ID must be provided in the request body.
            portfolio_id_from_data = self.request.data.get('portfolio')

            if not portfolio_id_from_data:
                raise serializers.ValidationError({"portfolio": "Portfolio ID is required in the request body."})

            try:
                # Retrieve the Portfolio instance.
                # Crucially: Ensure the portfolio belongs to the *current authenticated user*.
                portfolio = Portfolio.objects.get(id=portfolio_id_from_data, user=self.request.user)
                serializer.save(portfolio=portfolio)
            except Portfolio.DoesNotExist:
                raise serializers.ValidationError({"portfolio": "Portfolio not found or does not belong to you."})
            except IntegrityError:
                raise serializers.ValidationError({"detail": "A currency with this name/symbol already exists in this portfolio."})
            except Exception as e:
                raise serializers.ValidationError({"detail": f"Error creating currency: {e}"})