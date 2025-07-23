import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

// Define a list of known cryptocurrency symbols
const KNOWN_CRYPTOS = ['BTC', 'ETH', 'LTC', 'XRP', 'ADA', 'DOT', 'LINK', 'BNB', 'SOL', 'DOGE', 'SHIB', 'AVAX'];
// Import COMMON_STOCK_SYMBOLS to prevent searching for stocks in this component
const COMMON_STOCK_SYMBOLS = [
    'TSLA', 'AAPL', 'MSFT', 'GOOG', 'AMZN', 'NVDA', 'JPM', 'V', 'MA', 'HD', 'PG', 'KO', 'PEP',
    'DIS', 'NFLX', 'SBUX', 'NKE', 'INTC', 'CSCO', 'ADBE', 'CRM', 'PYPL', 'CMG', 'MCD', 'COST',
    'WMT', 'XOM', 'CVX', 'UNH', 'JNJ', 'PFE', 'MRK', 'ABBV', 'LLY', 'AMGN', 'BA', 'GE', 'F',
    'GM', 'BAC', 'WFC', 'C', 'GS', 'MS', 'SPG', 'PLD', 'O', 'EQIX', 'AMT', 'CCI', 'PSA'
];


function CryptoSearch({ apiBaseUrl }) {
    const [symbol, setSymbol] = useState('');
    const [searchResult, setSearchResult] = useState(null);
    const [message, setMessage] = useState('');
    const [loading, setLoading] = useState(false);
    const [topCryptos, setTopCryptos] = useState([]);
    const navigate = useNavigate();

    // Fetch top cryptos on component mount
    useEffect(() => {
        const fetchTopCryptos = async () => {
            const accessToken = localStorage.getItem('accessToken');
            if (!accessToken) {
                return;
            }

            try {
                const cryptoResponse = await axios.get(`${apiBaseUrl}/top-cryptocurrencies/`, {
                    headers: { 'Authorization': `Bearer ${accessToken}` }
                });
                setTopCryptos(cryptoResponse.data);
                console.log("Fetched Top Cryptos:", cryptoResponse.data);
            } catch (error) {
                console.error("Error fetching top cryptocurrencies:", error.response?.data || error);
            }
        };
        fetchTopCryptos();
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
            setMessage('You need to be logged in to search for cryptocurrencies.');
            navigate('/login');
            setLoading(false);
            return;
        }

        const upperSymbol = symbol.toUpperCase();

        // --- NEW LOGIC: Prevent searching for known stock symbols in CryptoSearch ---
        if (COMMON_STOCK_SYMBOLS.includes(upperSymbol)) {
            setMessage(`"${upperSymbol}" is a stock symbol. Please use the Stock Search feature for this asset.`);
            setLoading(false);
            return;
        }
        // --- END NEW LOGIC ---

        let tempSearchResult = null;

        try {
            // Attempt to fetch as a cryptocurrency
            const currencyResponse = await axios.get(`${apiBaseUrl}/currencies/?symbol=${upperSymbol}`, {
                headers: { 'Authorization': `Bearer ${accessToken}` }
            });
            if (currencyResponse.data && currencyResponse.data.length > 0) {
                const currencyData = currencyResponse.data[0];
                if (currencyData.name || currencyData.current_price !== null || currencyData.amount_owned !== null) {
                    tempSearchResult = {
                        name: currencyData.name,
                        symbol: currencyData.symbol,
                        price: currencyData.current_price,
                        type: 'Cryptocurrency',
                        rank: currencyData.rank,
                        percent_change_1h: currencyData.percent_change_1h,
                        percent_change_24h: currencyData.percent_change_24h,
                        percent_change_7d: currencyData.percent_change_7d,
                        price_per: currencyData.price_per, // Purchase price
                        current_entry_price: currencyData.current_entry_price, // Market price at entry
                        amount_owned: currencyData.amount_owned,
                        total_paid: currencyData.total_paid,
                        profits_losses: currencyData.profits_losses,
                        total_value: currencyData.total_value,
                        market_cap: currencyData.market_cap,
                        volume_24h: currencyData.volume_24h,
                    };

                    // Perform calculations on the frontend if amount is owned
                    const parsedAmountOwned = parseFloat(tempSearchResult.amount_owned);
                    if (!isNaN(parsedAmountOwned) && parsedAmountOwned > 0) {
                        const parsedPricePer = parseFloat(tempSearchResult.price_per);
                        const parsedCurrentEntryPrice = parseFloat(tempSearchResult.current_entry_price);
                        const parsedCurrentPrice = parseFloat(tempSearchResult.price);

                        if (!isNaN(parsedPricePer)) {
                            tempSearchResult.total_paid = parsedPricePer * parsedAmountOwned;
                        } else {
                            tempSearchResult.total_paid = null;
                        }
                        if (!isNaN(parsedCurrentPrice)) {
                            tempSearchResult.total_value = parsedCurrentPrice * parsedAmountOwned;
                        } else {
                            tempSearchResult.total_value = null;
                        }
                        // For cryptocurrencies, profits/losses are based on current price vs. purchase price
                        if (!isNaN(parsedCurrentPrice) && !isNaN(parsedPricePer)) {
                            tempSearchResult.profits_losses = (parsedCurrentPrice - parsedPricePer) * parsedAmountOwned;
                        } else {
                            tempSearchResult.profits_losses = null;
                        }
                    }
                }
            }

            if (tempSearchResult) {
                console.log("Final search result data:", tempSearchResult);
                setSearchResult(tempSearchResult);
                setMessage('');
            } else {
                setMessage('No information found for that cryptocurrency symbol.');
            }

        } catch (overallError) {
            console.error("Overall error during crypto search:", overallError.response?.data || overallError);
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
        const owned = asset.amount_owned !== null && asset.amount_owned !== undefined && parseFloat(asset.amount_owned) > 0;
        return owned;
    };

    const handleBack = () => {
        navigate('/');
    };

    return (
        <div className="App">
            <h1>Search for Cryptocurrency</h1>
            {message && (
                <p className={message.includes('Error') || message.includes('No information') || message.includes('stock symbol') ? 'error-message' : 'success-message'}>
                    {message}
                </p>
            )}

            <form onSubmit={handleSearch}>
                <input
                    type="text"
                    placeholder="Enter Crypto Symbol (e.g., BTC)"
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
                    
                    <p><strong>Current Price:</strong> {formatCurrency(searchResult.price)}</p>

                    {isOwned(searchResult) && (
                        <div className="portfolio-section">
                            <h4>📊 Your Portfolio Holdings</h4>
                            <p><strong>Amount Owned:</strong> {formatNumber(searchResult.amount_owned, 8)}</p>
                            <p><strong>Price per (at entry):</strong> ${formatNumber(searchResult.current_entry_price || searchResult.price_per, 8)}</p>
                            <p><strong>Price Paid (purchase price):</strong> {formatCurrency(searchResult.price_per)}</p>
                            <p><strong>Total Paid:</strong> {formatCurrency(searchResult.total_paid)}</p>
                            <p><strong>Total Value:</strong> {formatCurrency(searchResult.total_value)}</p>
                            <p className={getPercentageClass(searchResult.profits_losses)}>
                                <strong>Profits/Losses:</strong> {formatCurrency(searchResult.profits_losses)}
                            </p>
                        </div>
                    )}

                    <div className="market-info-section">
                        <h4>📈 Market Information</h4>
                        <p><strong>Rank:</strong> #{searchResult.rank || 'N/A'}</p>
                        <p className={getPercentageClass(searchResult.percent_change_1h)}>
                            <strong>1HR Change:</strong> {formatPercentage(searchResult.percent_change_1h)}
                        </p>
                        <p className={getPercentageClass(searchResult.percent_change_24h)}>
                            <strong>24HR Change:</strong> {formatPercentage(searchResult.percent_change_24h)}
                        </p>
                        <p className={getPercentageClass(searchResult.percent_change_7d)}>
                            <strong>7D Change:</strong> {formatPercentage(searchResult.percent_change_7d)}
                        </p>
                        {searchResult.market_cap && (
                            <p><strong>Market Cap:</strong> {formatLargeCurrency(searchResult.market_cap)}</p>
                        )}
                        {searchResult.volume_24h && (
                            <p><strong>24H Volume:</strong> {formatLargeCurrency(searchResult.volume_24h)}</p>
                        )}
                    </div>
                </div>
            )}

            <hr />

            <div className="legend-section">
                <h2>Common Cryptocurrencies to Search</h2>
                <div className="legend-tables-container">
                    <div className="legend-table">
                        <h3>Top 10 Cryptocurrencies</h3>
                        {topCryptos.length === 0 ? (
                            <p>Loading...</p>
                        ) : (
                            <table>
                                <thead>
                                    <tr>
                                        <th>Rank</th>
                                                                                <th>Name</th>
                                        <th>Symbol</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {topCryptos.map((crypto, index) => (
                                        <tr 
                                            key={index}
                                            onClick={() => setSymbol(crypto.symbol)}
                                            style={{ cursor: 'pointer' }}
                                            title="Click to search"
                                        >
                                            <td>{crypto.rank}</td>
                                            <td>{crypto.name}</td>
                                            <td>{crypto.symbol}</td>
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

export default CryptoSearch;
