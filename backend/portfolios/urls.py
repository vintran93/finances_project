from django.urls import path, include
from rest_framework_nested import routers
from .views import PortfolioViewSet, CurrencyViewSet, StockViewSet, TopCryptocurrenciesView, TopStocksView

# Main router for top-level resources
router = routers.DefaultRouter()
router.register(r'portfolios', PortfolioViewSet, basename='portfolio')
router.register(r'currencies', CurrencyViewSet, basename='currency') # <--- ADD THIS LINE!
router.register(r'stocks', StockViewSet, basename='stock')

# Nested router for currencies within portfolios
# This creates routes like /portfolios/{portfolio_pk}/currencies/
portfolios_router = routers.NestedDefaultRouter(router, r'portfolios', lookup='portfolio')
portfolios_router.register(r'currencies', CurrencyViewSet, basename='portfolio-currencies')
portfolios_router.register(r'stocks', StockViewSet, basename='portfolio-stocks')

urlpatterns = [
    path('', include(router.urls)), # Includes /api/portfolios/
    path('', include(portfolios_router.urls)), # Includes /api/portfolios/{id}/currencies/
    path('top-cryptocurrencies/', TopCryptocurrenciesView.as_view(), name='top-cryptocurrencies'),
    path('top-stocks/', TopStocksView.as_view(), name='top-stocks'),
]