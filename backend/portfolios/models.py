from django.db import models
from django.conf import settings # To link to the User model

class Portfolio(models.Model):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='portfolios', max_length=255)
    name = models.CharField(max_length=255)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ('user', 'name') # A user can't have two portfolios with the same name
        ordering = ['name']

    def __str__(self):
        return f"{self.name} ({self.user.username})"
    
class Currency(models.Model):
    portfolio = models.ForeignKey('Portfolio', on_delete=models.CASCADE, related_name='currencies')
    name = models.CharField(max_length=255, default='')
    symbol = models.CharField(max_length=10, help_text="e.g., USD, BTC, TSLA", default='') # New field
    price_per = models.DecimalField(max_digits=20, decimal_places=8, help_text="Current price per unit", default=0.00) # New field, increased precision
    current_entry_price = models.DecimalField(max_digits=20, decimal_places=8, null=True, blank=True)
    amount_owned = models.DecimalField(max_digits=20, decimal_places=8, help_text="Amount of this currency owned", default=0.00) # New field, increased precision
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ('portfolio', 'symbol') # Changed to unique by symbol within a portfolio
        ordering = ['symbol']

    def __str__(self):
        return f"{self.name} ({self.symbol}) in {self.portfolio.name}"
    
class Stock(models.Model):
    """
    Represents a stock holding within a portfolio.
    """
    portfolio = models.ForeignKey(Portfolio, on_delete=models.CASCADE, related_name='stocks')
    name = models.CharField(max_length=255)
    symbol = models.CharField(max_length=10) # e.g., TSLA, AAPL, MSFT
    cost_per_share = models.DecimalField(max_digits=10, decimal_places=2) # Price at the time of purchase
    shares_owned = models.DecimalField(max_digits=10, decimal_places=4) # How many shares are owned
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        # Ensure a stock symbol is unique within a specific portfolio
        unique_together = ('portfolio', 'symbol',)
        ordering = ['symbol']

    def __str__(self):
        return f"{self.symbol} in {self.portfolio.name}"