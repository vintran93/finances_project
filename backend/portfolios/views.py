import requests
import os
import json
from rest_framework import viewsets, permissions, serializers, status
from rest_framework.response import Response
from rest_framework.views import APIView
from django.shortcuts import get_object_or_404
from django.db import IntegrityError

from .models import Portfolio, Currency, Stock
from .serializers import PortfolioSerializer, CurrencySerializer, StockSerializer

COINMARKETCAP_API_KEY = os.environ.get("COINMARKETCAP_API_KEY", "f1153e73-309b-41d8-836c-55b9dd21eb3a")
FINANCIALMODELINGPREP_API_KEY = os.environ.get("FINANCIALMODELINGPREP_API_KEY", "EIWo0vj3nb6txaJo6bWUZ2ahAk0g18vv")

def _fetch_coinmarketcap_prices(symbols):
    """
    Fetches real-time cryptocurrency prices from CoinMarketCap.
    Returns a dictionary of {symbol: {price: ..., percent_change_1h: ...}}
    """
    valid_symbols = [s for s in symbols if s and s.upper() != 'N/A']
    if not valid_symbols:
        print("No valid symbols to fetch from CoinMarketCap.")
        return {}

    url = "https://pro-api.coinmarketcap.com/v1/cryptocurrency/quotes/latest"
    headers = {
        'Accepts': 'application/json',
        'X-CMC_PRO_API_KEY': COINMARKETCAP_API_KEY,
    }
    parameters = {
        'symbol': ','.join(valid_symbols),
        'convert': 'USD'
    }

    print(f"Attempting to fetch CoinMarketCap data for symbols: {valid_symbols}")
    try:
        response = requests.get(url, headers=headers, params=parameters)
        response.raise_for_status()
        data = response.json()

        print(f"CoinMarketCap API Response Status: {response.status_code}")
        print(f"CoinMarketCap API Raw Data: {data}")

        prices = {}
        for symbol, info in data.get('data', {}).items():
            quote = info.get('quote', {}).get('USD', {})
            prices[symbol] = {
                'price': quote.get('price'),
                'percent_change_1h': quote.get('percent_change_1h'),
                'percent_change_24h': quote.get('percent_change_24h'),
                'percent_change_7d': quote.get('percent_change_7d'),
                'cmc_rank': info.get('cmc_rank')
            }
        return prices
    except requests.exceptions.RequestException as e:
        print(f"Error fetching CoinMarketCap data: {e}")
        print(f"Response content: {response.text if 'response' in locals() else 'No response'}")
        return {}
    except Exception as e:
        print(f"An unexpected error occurred with CoinMarketCap data: {e}")
        return {}

def _fetch_financialmodelingprep_prices(symbols):
    """
    Fetches real-time stock and commodity prices from Financial Modeling Prep.
    Returns a dictionary of {symbol: price}.
    """
    valid_symbols = [s for s in symbols if s and s.upper() != 'N/A']
    if not valid_symbols:
        print("No valid symbols to fetch from Financial Modeling Prep.")
        return {}

    prices = {}

    stock_url = "https://financialmodelingprep.com/api/v3/quote/" + ','.join(valid_symbols)
    stock_params = {'apikey': FINANCIALMODELINGPREP_API_KEY}
    print(f"Attempting to fetch FMP data for symbols: {valid_symbols}")
    try:
        stock_response = requests.get(stock_url, params=stock_params)
        stock_response.raise_for_status() 
        stock_data = stock_response.json()
        print(f"FMP API Response Status for {valid_symbols}: {stock_response.status_code}")
        print(f"FMP API Raw Data for {valid_symbols}: {stock_data}") 
        
        if not stock_data:
            print(f"FMP API returned empty data for symbols: {valid_symbols}. This might indicate invalid symbols or API limits.")

        for item in stock_data:
            symbol = item.get('symbol')
            price = item.get('price')
            if symbol and price is not None:
                prices[symbol] = price
        print(f"FMP Prices extracted: {prices}") # NEW DEBUG
        return prices
    except requests.exceptions.RequestException as e:
        print(f"Error fetching FMP data: {e}")
        print(f"Response URL: {stock_url}")
        print(f"Response content: {stock_response.text if 'stock_response' in locals() else 'No response'}")
    except Exception as e:
        print(f"An unexpected error occurred with FMP data: {e}")
        return {} # Ensure an empty dict is returned on error

    return prices


class PortfolioViewSet(viewsets.ModelViewSet):
    queryset = Portfolio.objects.all()
    serializer_class = PortfolioSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return self.queryset.filter(user=self.request.user)

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)

class CurrencyViewSet(viewsets.ModelViewSet):
    queryset = Currency.objects.all()
    serializer_class = CurrencySerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        portfolio_pk = self.kwargs.get('portfolio_pk')
        if portfolio_pk:
            return self.queryset.filter(portfolio__id=portfolio_pk, portfolio__user=self.request.user)
        else:
            # For general list, no symbol filter here. Symbol filter is handled in list method.
            return self.queryset.filter(portfolio__user=self.request.user)

    def perform_create(self, serializer):
        portfolio_pk_from_url = self.kwargs.get('portfolio_pk')

        if portfolio_pk_from_url:
            portfolio = get_object_or_404(Portfolio, id=portfolio_pk_from_url, user=self.request.user)
            serializer.save(portfolio=portfolio)
        else:
            portfolio_id_from_data = self.request.data.get('portfolio')

            if not portfolio_id_from_data:
                raise serializers.ValidationError({"portfolio": "Portfolio ID is required in the request body."})

            try:
                portfolio = Portfolio.objects.get(id=portfolio_id_from_data, user=self.request.user)
                serializer.save(portfolio=portfolio)
            except Portfolio.DoesNotExist:
                raise serializers.ValidationError({"portfolio": "Portfolio not found or does not belong to you."})
            except IntegrityError:
                raise serializers.ValidationError({"detail": "A currency with this symbol already exists in this portfolio."})
            except Exception as e:
                raise serializers.ValidationError({"detail": f"Error creating currency: {e}"})

    def perform_update(self, serializer):
        print(f"CurrencyViewSet - perform_update: Initial instance data: {serializer.instance.__dict__}")
        print(f"CurrencyViewSet - perform_update: Validated data: {serializer.validated_data}")
        serializer.save()
        print(f"CurrencyViewSet - perform_update: Instance after save: {serializer.instance.__dict__}")


    def list(self, request, *args, **kwargs):
        symbol_param = request.query_params.get('symbol', None)

        if symbol_param:
            # Logic for single symbol search (e.g., from CryptoStockSearch component)
            crypto_info = _fetch_coinmarketcap_prices([symbol_param]).get(symbol_param.upper())
            
            response_data = {
                'name': symbol_param.upper(), # Default name
                'symbol': symbol_param.upper(),
                'current_price': None, # Default to None
                'rank': None,
                'percent_change_1h': None,
                'percent_change_24h': None,
                'percent_change_7d': None,
                'price_per': None,
                'amount_owned': None,
                'total_paid': None,
                'profits_losses': None,
            }

            if crypto_info:
                response_data.update({
                    'name': crypto_info.get('name', symbol_param.upper()),
                    'current_price': crypto_info.get('price'),
                    'rank': crypto_info.get('cmc_rank'),
                    'percent_change_1h': crypto_info.get('percent_change_1h'),
                    'percent_change_24h': crypto_info.get('percent_change_24h'),
                    'percent_change_7d': crypto_info.get('percent_change_7d'),
                })
            
            # Check if the symbol exists in the user's portfolio to merge owned data
            user_currency_in_portfolio = Currency.objects.filter(symbol__iexact=symbol_param, portfolio__user=request.user).first()
            if user_currency_in_portfolio:
                response_data['price_per'] = float(user_currency_in_portfolio.price_per)
                response_data['amount_owned'] = float(user_currency_in_portfolio.amount_owned)
                # Calculate total_paid and profits_losses using stored data if current_price is not available
                purchase_price_per = float(user_currency_in_portfolio.price_per)
                amount_owned = float(user_currency_in_portfolio.amount_owned)
                response_data['total_paid'] = purchase_price_per * amount_owned
                
                current_price = response_data['current_price']
                if current_price is not None:
                    response_data['profits_losses'] = (current_price - purchase_price_per) * amount_owned
                else:
                    # If current price is not available, profits/losses cannot be accurately calculated from market
                    response_data['profits_losses'] = None 

            return Response([response_data]) # Always return a list for consistency with frontend expectation
        
        # ORIGINAL LOGIC for fetching all currencies for the dashboard/portfolio view
        queryset = self.get_queryset()
        serializer = self.get_serializer(queryset, many=True)
        currencies_data = serializer.data

        all_portfolios = Portfolio.objects.filter(user=self.request.user)
        portfolio_type_map = {p.id: p.name.lower() for p in all_portfolios}

        crypto_symbols = []
        fmp_currency_symbols = []

        for currency in currencies_data:
            portfolio_type = portfolio_type_map.get(currency['portfolio'])
            if portfolio_type == 'cryptocurrency':
                crypto_symbols.append(currency['symbol'])
            elif portfolio_type in ['precious metals', 'stocks']:
                fmp_currency_symbols.append(currency['symbol'])
        
        real_time_crypto_prices = _fetch_coinmarketcap_prices(crypto_symbols)
        real_time_fmp_prices_currencies = _fetch_financialmodelingprep_prices(fmp_currency_symbols)

        for currency in currencies_data:
            symbol = currency['symbol']
            portfolio_type = portfolio_type_map.get(currency['portfolio'])
            
            current_price_info = {}
            current_price = None
            percent_change_1h = None
            percent_change_24h = None
            percent_change_7d = None
            rank = None

            if portfolio_type == 'cryptocurrency':
                current_price_info = real_time_crypto_prices.get(symbol, {})
                current_price = current_price_info.get('price')
                percent_change_1h = current_price_info.get('percent_change_1h')
                percent_change_24h = current_price_info.get('percent_change_24h')
                percent_change_7d = current_price_info.get('percent_change_7d')
                rank = current_price_info.get('cmc_rank')
            elif portfolio_type in ['precious metals', 'stocks']:
                current_price = real_time_fmp_prices_currencies.get(symbol)

            purchase_price_per = float(currency['price_per'])
            amount_owned = float(currency['amount_owned'])

            currency['current_price'] = current_price
            currency['total_value'] = (current_price * amount_owned) if current_price is not None else None
            currency['total_paid'] = purchase_price_per * amount_owned
            currency['profits_losses'] = ((current_price - purchase_price_per) * amount_owned) if current_price is not None else None
            currency['percent_change_1h'] = percent_change_1h
            currency['percent_change_24h'] = percent_change_24h
            currency['percent_change_7d'] = percent_change_7d
            currency['rank'] = rank

        return Response(currencies_data)


class StockViewSet(viewsets.ModelViewSet):
    queryset = Stock.objects.all()
    serializer_class = StockSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        portfolio_pk = self.kwargs.get('portfolio_pk')
        if portfolio_pk:
            return self.queryset.filter(portfolio__id=portfolio_pk, portfolio__user=self.request.user)
        else:
            # For general list, no symbol filter here. Symbol filter is handled in list method.
            return self.queryset.filter(portfolio__user=self.request.user)


    def perform_create(self, serializer):
        portfolio_pk_from_url = self.kwargs.get('portfolio_pk')

        if portfolio_pk_from_url:
            portfolio = get_object_or_404(Portfolio, id=portfolio_pk_from_url, user=self.request.user)
            serializer.save(portfolio=portfolio)
        else:
            portfolio_id_from_data = self.request.data.get('portfolio')

            if not portfolio_id_from_data:
                raise serializers.ValidationError({"portfolio": "Portfolio ID is required in the request body."})

            try:
                portfolio = Portfolio.objects.get(id=portfolio_id_from_data, user=self.request.user)
                serializer.save(portfolio=portfolio)
            except Portfolio.DoesNotExist:
                raise serializers.ValidationError({"portfolio": "Portfolio not found or does not belong to you."})
            except IntegrityError:
                raise serializers.ValidationError({"detail": "A stock with this symbol already exists in this portfolio."})
            except Exception as e:
                raise serializers.ValidationError({"detail": f"Error creating stock: {e}"})

    def list(self, request, *args, **kwargs):
        symbol_param = request.query_params.get('symbol', None)

        if symbol_param:
            # Logic for single symbol search (e.g., from CryptoStockSearch component)
            stock_price_info = _fetch_financialmodelingprep_prices([symbol_param]).get(symbol_param.upper())
            
            response_data = {
                'name': symbol_param.upper(), # Default name
                'symbol': symbol_param.upper(),
                'current_price': None, # Default to None
                'cost_per_share': None,
                'shares_owned': None,
                'amount_paid': None,
                'profits_losses': None,
            }

            if stock_price_info is not None: # Check for None explicitly as price can be 0
                response_data['current_price'] = stock_price_info
                # FMP quote endpoint doesn't always return full name, so we'll try to get it
                # from the original FMP raw data if available.
                # For now, we'll keep the name as symbol.upper() or try to get it from portfolio.
            
            # Check if the symbol exists in the user's portfolio to merge owned data
            user_stock_in_portfolio = Stock.objects.filter(symbol__iexact=symbol_param, portfolio__user=request.user).first()
            if user_stock_in_portfolio:
                response_data['name'] = user_stock_in_portfolio.name # Use name from portfolio if available
                response_data['cost_per_share'] = float(user_stock_in_portfolio.cost_per_share)
                response_data['shares_owned'] = float(user_stock_in_portfolio.shares_owned)
                
                # Calculate amount_paid and profits_losses using stored data if current_price is not available
                cost_per_share = float(user_stock_in_portfolio.cost_per_share)
                shares_owned = float(user_stock_in_portfolio.shares_owned)
                response_data['amount_paid'] = cost_per_share * shares_owned

                current_price = response_data['current_price']
                if current_price is not None:
                    response_data['profits_losses'] = (current_price - cost_per_share) * shares_owned
                else:
                    # If current price is not available, profits/losses cannot be accurately calculated from market
                    response_data['profits_losses'] = None

            return Response([response_data]) # Always return a list for consistency with frontend expectation
        
        # ORIGINAL LOGIC for fetching all stocks for the dashboard/portfolio view
        queryset = self.get_queryset()
        serializer = self.get_serializer(queryset, many=True)
        stocks_data = serializer.data

        symbols = [stock['symbol'] for stock in stocks_data]
        real_time_prices = _fetch_financialmodelingprep_prices(symbols)

        for stock in stocks_data:
            symbol = stock['symbol']
            current_price = real_time_prices.get(symbol)

            cost_per_share = float(stock['cost_per_share']) if stock['cost_per_share'] is not None else 0.0
            shares_owned = float(stock['shares_owned']) if stock['shares_owned'] is not None else 0.0

            stock['current_price'] = current_price
            stock['total_value'] = (current_price * shares_owned) if current_price is not None else None
            stock['amount_paid'] = cost_per_share * shares_owned
            stock['profits_losses'] = ((current_price - cost_per_share) * shares_owned) if current_price is not None else None

        return Response(stocks_data)


# APIView to fetch top cryptocurrencies
class TopCryptocurrenciesView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, format=None):
        url = "https://pro-api.coinmarketcap.com/v1/cryptocurrency/listings/latest"
        headers = {
            'Accepts': 'application/json',
            'X-CMC_PRO_API_KEY': COINMARKETCAP_API_KEY,
        }
        parameters = {
            'start': '1',
            'limit': '10', # Get top 10
            'convert': 'USD'
        }
        
        try:
            response = requests.get(url, headers=headers, params=parameters)
            response.raise_for_status()
            data = response.json()
            
            top_cryptos = []
            for item in data.get('data', []):
                top_cryptos.append({
                    'name': item.get('name'),
                    'symbol': item.get('symbol'),
                    'price': item.get('quote', {}).get('USD', {}).get('price'),
                    'rank': item.get('cmc_rank')
                })
            return Response(top_cryptos)
        except requests.exceptions.RequestException as e:
            print(f"Error fetching top cryptocurrencies from CoinMarketCap: {e}")
            return Response({"detail": "Failed to fetch top cryptocurrencies."}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        except Exception as e:
            print(f"An unexpected error occurred while fetching top cryptocurrencies: {e}")
            return Response({"detail": "An unexpected error occurred."}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

# APIView to fetch top stocks (using a predefined list for simplicity)
class TopStocksView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, format=None):
        top_stock_symbols = [
            'AAPL', 'MSFT', 'GOOGL', 'AMZN', 'NVDA',
            'TSLA', 'JPM', 'V', 'UNH', 'JNJ'
        ]
        
        prices = _fetch_financialmodelingprep_prices(top_stock_symbols)
        
        top_stocks_data = []
        for symbol in top_stock_symbols:
            name_map = {
                'AAPL': 'Apple Inc.', 'MSFT': 'Microsoft Corp.', 'GOOGL': 'Alphabet Inc. (Class A)',
                'AMZN': 'Amazon.com Inc.', 'NVDA': 'NVIDIA Corp.', 'TSLA': 'Tesla, Inc.',
                'JPM': 'JPMorgan Chase & Co.', 'V': 'Visa Inc.', 'UNH': 'UnitedHealth Group Inc.',
                'JNJ': 'Johnson & Johnson'
            }
            top_stocks_data.append({
                'name': name_map.get(symbol, f"{symbol} Company"),
                'symbol': symbol,
                'price': prices.get(symbol)
            })
        
        return Response(top_stocks_data)
