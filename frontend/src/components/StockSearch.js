import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

// Define a list of common stock symbols for client-side override
const COMMON_STOCK_SYMBOLS = [
    'TSLA', 'AAPL', 'MSFT', 'GOOG', 'AMZN', 'NVDA', 'JPM', 'V', 'MA', 'HD', 'PG', 'KO', 'PEP',
    'DIS', 'NFLX', 'SBUX', 'NKE', 'INTC', 'CSCO', 'ADBE', 'CRM', 'PYPL', 'CMG', 'MCD', 'COST',
    'WMT', 'XOM', 'CVX', 'UNH', 'JNJ', 'PFE', 'MRK', 'ABBV', 'LLY', 'AMGN', 'BA', 'GE', 'F',
    'GM', 'BAC', 'WFC', 'C', 'GS', 'MS', 'SPG', 'PLD', 'O', 'EQIX', 'AMT', 'CCI', 'PSA'
];

function StockSearch({ apiBaseUrl }) {
    const [symbol, setSymbol] = useState('');
    const [searchResult, setSearchResult] = useState(null);
    const [message, setMessage] = useState('');
    const [loading, setLoading] = useState(false);
    const [topStocks, setTopStocks] = useState([]);
    const navigate = useNavigate();

    // Fetch top stocks on component mount
    useEffect(() => {
        const fetchTopStocks = async () => {
            const accessToken = localStorage.getItem('accessToken');
            if (!accessToken) {
                return;
            }

            try {
                const stockResponse = await axios.get(`${apiBaseUrl}/top-stocks/`, {
                    headers: { 'Authorization': `Bearer ${accessToken}` }
                });
                setTopStocks(stockResponse.data);
                console.log("Fetched Top Stocks:", stockResponse.data);
            } catch (error) {
                console.error("Error fetching top stocks:", error.response?.data || error);
            }
        };
        fetchTopStocks();
    }, [apiBaseUrl]);

    const handleSearch = async (e) => {
        e.preventDefault();
        setMessage('');
        setSearchResult(null);
        setLoading(true);

        if (!symbol.trim()) {
            setMessage('Please enter a symbol.');
            setLoading(false);
            return;
        }

        const accessToken = localStorage.getItem('accessToken');
        if (!accessToken) {
            setMessage('You need to be logged in to search for assets.');
            navigate('/login');
            setLoading(false);
            return;
        }

        const upperSymbol = symbol.toUpperCase();
        let tempSearchResult = null;
        let stockApiReturnedData = false; // Flag to check if stock API returned any data

        try {
            // Priority 1: Try stock API first
            try {
                const stockResponse = await axios.get(`${apiBaseUrl}/stocks/?symbol=${upperSymbol}`, {
                    headers: { 'Authorization': `Bearer ${accessToken}` }
                });
                if (stockResponse.data && stockResponse.data.length > 0) {
                    const stockData = stockResponse.data[0];
                    stockApiReturnedData = true; // Mark that stock API returned data

                    // Only set tempSearchResult if it has a name or a non-null price/shares_owned
                    // This prevents empty responses from setting tempSearchResult prematurely
                    if (stockData.name || stockData.current_price !== null || stockData.shares_owned !== null) {
                        tempSearchResult = {
                            name: stockData.name,
                            symbol: stockData.symbol,
                            price: stockData.current_price,
                            type: 'Stock',
                            cost_per_share: stockData.cost_per_share,
                            shares_owned: stockData.shares_owned,
                            percent_change_24h: stockData.percent_change_24h || null,
                            current_entry_price: stockData.current_entry_price || stockData.cost_per_share,
                            market_cap: stockData.market_cap,
                            volume: stockData.volume,
                            pe_ratio: stockData.pe_ratio,
                        };
                        // Perform calculations on the frontend if shares are owned
                        const parsedSharesOwned = parseFloat(tempSearchResult.shares_owned);
                        if (!isNaN(parsedSharesOwned) && parsedSharesOwned > 0) {
                            const parsedCostPerShare = parseFloat(tempSearchResult.cost_per_share);
                            const parsedCurrentEntryPrice = parseFloat(tempSearchResult.current_entry_price);
                            const parsedCurrentPrice = parseFloat(tempSearchResult.price);

                            if (!isNaN(parsedCostPerShare)) {
                                tempSearchResult.amount_paid = parsedCostPerShare * parsedSharesOwned;
                            } else {
                                tempSearchResult.amount_paid = null;
                            }
                            if (!isNaN(parsedCurrentPrice)) {
                                tempSearchResult.total_value = parsedCurrentPrice * parsedSharesOwned;
                            } else {
                                tempSearchResult.total_value = null;
                            }
                            // Manual calculation for Profits/Losses for stocks
                            if (!isNaN(parsedCurrentEntryPrice) && !isNaN(parsedCostPerShare)) {
                                tempSearchResult.profits_losses = (parsedCurrentEntryPrice * parsedSharesOwned) - (parsedCostPerShare * parsedSharesOwned);
                            } else {
                                tempSearchResult.profits_losses = null;
                            }
                        }
                    }
                }
            } catch (stockError) {
                console.log("Error fetching as stock (primary attempt):", stockError.response?.data || stockError);
                // stockApiReturnedData remains false if an error occurred or no data
            }

            // Fallback to currency API if:
            // 1. Stock API returned no meaningful data (tempSearchResult is null)
            // 2. OR Stock API returned data, but shares_owned is null/0 (meaning no portfolio data was found via stock API)
            // AND it's a common stock symbol (like TSLA being stored as currency)
            if ((!tempSearchResult || (stockApiReturnedData && (tempSearchResult.shares_owned === null || parseFloat(tempSearchResult.shares_owned) === 0))) && COMMON_STOCK_SYMBOLS.includes(upperSymbol)) {
                try {
                    const currencyResponse = await axios.get(`${apiBaseUrl}/currencies/?symbol=${upperSymbol}`, {
                        headers: { 'Authorization': `Bearer ${accessToken}` }
                    });
                    if (currencyResponse.data && currencyResponse.data.length > 0) {
                        const currencyData = currencyResponse.data[0];
                        // Only consider it a success if it has a name or a non-null price/amount_owned
                        if (currencyData.name || currencyData.current_price !== null || currencyData.amount_owned !== null) {
                            tempSearchResult = {
                                name: currencyData.name,
                                symbol: currencyData.symbol,
                                price: currencyData.current_price,
                                type: 'Stock', // Force type to Stock if found here
                                // Map currency fields to stock equivalents for display
                                cost_per_share: currencyData.price_per, // Purchase price
                                shares_owned: currencyData.amount_owned, // Shares owned
                                current_entry_price: currencyData.current_entry_price, // Market price at entry
                                // Other fields from currency API, potentially not directly applicable to stocks
                                rank: currencyData.rank,
                                percent_change_1h: currencyData.percent_change_1h,
                                percent_change_24h: currencyData.percent_change_24h,
                                percent_change_7d: currencyData.percent_change_7d,
                                market_cap: currencyData.market_cap,
                                volume_24h: currencyData.volume_24h,
                                // P/E Ratio and Volume (stock-specific) might still be N/A if only currency data is found
                                pe_ratio: null, // Set to null as it's not from currency API
                                volume: null, // Set to null as it's not from currency API
                            };
                            
                            // Perform calculations on the frontend if shares are owned (for currency-stored stocks)
                            const parsedSharesOwned = parseFloat(tempSearchResult.shares_owned);
                            if (!isNaN(parsedSharesOwned) && parsedSharesOwned > 0) {
                                const parsedCostPerShare = parseFloat(tempSearchResult.cost_per_share);
                                const parsedCurrentEntryPrice = parseFloat(tempSearchResult.current_entry_price);
                                const parsedCurrentPrice = parseFloat(tempSearchResult.price);

                                if (!isNaN(parsedCostPerShare)) {
                                    tempSearchResult.amount_paid = parsedCostPerShare * parsedSharesOwned;
                                } else {
                                    tempSearchResult.amount_paid = null;
                                }
                                if (!isNaN(parsedCurrentPrice)) {
                                    tempSearchResult.total_value = parsedCurrentPrice * parsedSharesOwned;
                                } else {
                                    tempSearchResult.total_value = null;
                                }
                                // Manual calculation for Profits/Losses for stocks
                                if (!isNaN(parsedCurrentEntryPrice) && !isNaN(parsedCostPerShare)) {
                                    tempSearchResult.profits_losses = (parsedCurrentEntryPrice * parsedSharesOwned) - (parsedCostPerShare * parsedSharesOwned);
                                } else {
                                    tempSearchResult.profits_losses = null;
                                }
                            }
                        }
                    }
                } catch (currencyError) {
                    console.log("Error fetching as currency (fallback for stock):", currencyError.response?.data || currencyError);
                }
            }


            if (tempSearchResult) {
                console.log("Final search result data:", tempSearchResult);
                setSearchResult(tempSearchResult);
                setMessage('');
            } else {
                setMessage('No information found for that stock symbol.');
            }

        } catch (overallError) {
            console.error("Overall error during stock search:", overallError.response?.data || overallError);
            setMessage('An unexpected error occurred during search. Please try again.');
            if (overallError.response?.status === 401) {
                navigate('/login');
            }
        } finally {
            setLoading(false);
        }
    };

    const formatCurrency = (amount) => {
        if (amount === null || amount === undefined) {
            return 'N/A';
        }
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD',
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        }).format(amount);
    };

    const formatLargeCurrency = (amount) => {
        if (amount === null || amount === undefined) {
            return 'N/A';
        }
        if (amount >= 1e12) {
            return `$${(amount / 1e12).toFixed(2)}T`;
        } else if (amount >= 1e9) {
            return `$${(amount / 1e9).toFixed(2)}B`;
        } else if (amount >= 1e6) {
            return `$${(amount / 1e6).toFixed(2)}M`;
        } else if (amount >= 1e3) {
            return `$${(amount / 1e3).toFixed(2)}K`;
        }
        return formatCurrency(amount);
    };

    const formatNumber = (value, decimals = 8) => {
        if (value === null || value === undefined) {
            return 'N/A';
        }
        return parseFloat(value).toFixed(decimals);
    };

    const formatPercentage = (value) => {
        if (value === null || value === undefined) {
            return 'N/A';
        }
        const formatted = parseFloat(value).toFixed(2);
        return `${formatted >= 0 ? '+' : ''}${formatted}%`;
    };

    const getPercentageClass = (value) => {
        if (value === null || value === undefined) return '';
        return value >= 0 ? 'profit' : 'loss';
    };

    const isOwned = (asset) => {
        const owned = asset.shares_owned !== null && asset.shares_owned !== undefined && parseFloat(asset.shares_owned) > 0;
        return owned;
    };

    const handleBack = () => {
        navigate('/');
    };

    return (
        <div className="App">
            <h1>Search for Stock</h1>
            {message && (
                <p className={message.includes('Error') || message.includes('No information') ? 'error-message' : 'success-message'}>
                    {message}
                </p>
            )}

            <form onSubmit={handleSearch}>
                <input
                    type="text"
                    placeholder="Enter Stock Symbol (e.g., TSLA)"
                    value={symbol}
                    onChange={(e) => setSymbol(e.target.value)}
                    required
                />
                <button type="submit" disabled={loading}>
                    {loading ? 'Searching...' : 'Search'}
                </button>
            </form>

            {searchResult && (
                <div className="search-result-card">
                    <h3>{searchResult.name} ({searchResult.symbol})</h3>
                    <p><strong>Type:</strong> {searchResult.type}</p>
                    
                    <p>
                        <strong>Current Price:</strong> {formatCurrency(searchResult.price)}
                        {/* Updated condition to check for 0 as well */}
                        {(searchResult.price === null || searchResult.price === 0) && (
                            <span className="api-limit-message"> (Your API limit has been reached for the day. Try again when it has reset.)</span>
                        )}
                    </p>

                    {isOwned(searchResult) && (
                        <div className="portfolio-section">
                            <h4>📊 Your Portfolio Holdings</h4>
                            <p><strong>Shares Owned:</strong> {formatNumber(searchResult.shares_owned, 4)}</p>
                            <p><strong>Cost per Share (at entry):</strong> {formatCurrency(searchResult.current_entry_price || searchResult.cost_per_share)}</p>
                            <p><strong>Price Paid (purchase price):</strong> {formatCurrency(searchResult.cost_per_share)}</p>
                            <p><strong>Total Paid:</strong> {formatCurrency(searchResult.amount_paid)}</p>
                            <p><strong>Total Value:</strong> {formatCurrency(searchResult.total_value)}</p>
                            <p className={getPercentageClass(searchResult.profits_losses)}>
                                <strong>Profits/Losses:</strong> {formatCurrency(searchResult.profits_losses)}
                            </p>
                        </div>
                    )}

                    <div className="market-info-section">
                        <h4>📈 Market Information</h4>
                        {/* Always display 24HR Change if available */}
                        <p className={getPercentageClass(searchResult.percent_change_24h)}>
                            <strong>24HR Change:</strong> {formatPercentage(searchResult.percent_change_24h)}
                        </p>

                        {/* Display crypto-specific market info if available (comes from currency API) */}
                        {searchResult.rank && (
                            <p><strong>Rank:</strong> #{searchResult.rank}</p>
                        )}
                        {searchResult.percent_change_1h && (
                            <p className={getPercentageClass(searchResult.percent_change_1h)}>
                                <strong>1HR Change:</strong> {formatPercentage(searchResult.percent_change_1h)}
                            </p>
                        )}
                        {searchResult.percent_change_7d && (
                            <p className={getPercentageClass(searchResult.percent_change_7d)}>
                                <strong>7D Change:</strong> {formatPercentage(searchResult.percent_change_7d)}
                            </p>
                        )}
                        {searchResult.market_cap && (
                            <p><strong>Market Cap:</strong> {formatLargeCurrency(searchResult.market_cap)}</p>
                        )}
                        {searchResult.volume_24h && (
                            <p><strong>24H Volume:</strong> {formatLargeCurrency(searchResult.volume_24h)}</p>
                        )}

                        {/* Display stock-specific market info if available (comes from stock API) */}
                        {searchResult.volume && searchResult.volume !== null && (
                            <p><strong>Volume:</strong> {formatLargeCurrency(searchResult.volume)}</p>
                        )}
                        {searchResult.pe_ratio && searchResult.pe_ratio !== 'N/A' && searchResult.pe_ratio !== null && (
                            <p><strong>P/E Ratio:</strong> {searchResult.pe_ratio}</p>
                        )}
                    </div>
                </div>
            )}

            <hr />

            <div className="legend-section">
                <h2>Common Stocks to Search</h2>
                <div className="legend-tables-container">
                    <div className="legend-table">
                        <h3>Top 10 Stocks</h3>
                        {topStocks.length === 0 ? (
                            <p>Loading...</p>
                        ) : (
                            <table>
                                <thead>
                                    <tr>
                                        <th>Symbol</th>
                                        <th>Name</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {topStocks.map((stock, index) => (
                                        <tr 
                                            key={index}
                                            onClick={() => setSymbol(stock.symbol)}
                                            style={{ cursor: 'pointer' }}
                                            title="Click to search"
                                        >
                                            <td>{stock.symbol}</td>
                                            <td>{stock.name}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        )}
                    </div>
                </div>
            </div>

            <hr />
            <button onClick={handleBack} className="back-button">Back to Portal</button>
        </div>
    );
}

export default StockSearch;