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

function CryptoStockSearch({ apiBaseUrl }) {
    const [symbol, setSymbol] = useState('');
    const [searchResult, setSearchResult] = useState(null);
    const [message, setMessage] = useState('');
    const [loading, setLoading] = useState(false);
    const [topCryptos, setTopCryptos] = useState([]); // State for top cryptocurrencies
    const [topStocks, setTopStocks] = useState([]);     // State for top stocks
    const navigate = useNavigate();

    // Fetch top cryptos and stocks on component mount
    useEffect(() => {
        const fetchTopLists = async () => {
            const accessToken = localStorage.getItem('accessToken');
            if (!accessToken) {
                // Don't set message or navigate here, as it's handled by handleSearch
                return;
            }

            try {
                // Fetch top cryptocurrencies
                const cryptoResponse = await axios.get(`${apiBaseUrl}/top-cryptocurrencies/`, {
                    headers: { 'Authorization': `Bearer ${accessToken}` }
                });
                setTopCryptos(cryptoResponse.data);
                console.log("Fetched Top Cryptos:", cryptoResponse.data);

                // Fetch top stocks
                const stockResponse = await axios.get(`${apiBaseUrl}/top-stocks/`, {
                    headers: { 'Authorization': `Bearer ${accessToken}` }
                });
                setTopStocks(stockResponse.data);
                console.log("Fetched Top Stocks:", stockResponse.data);

            } catch (error) {
                console.error("Error fetching top lists:", error.response?.data || error);
                // Optionally set a message for the user if these lists fail to load
            }
        };
        fetchTopLists();
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
        let found = false;
        let tempSearchResult = null;

        try {
            // 1. Attempt to fetch as a stock first
            try {
                const stockResponse = await axios.get(`${apiBaseUrl}/stocks/?symbol=${upperSymbol}`, {
                    headers: { 'Authorization': `Bearer ${accessToken}` }
                });
                if (stockResponse.data && stockResponse.data.length > 0) {
                    const stockData = stockResponse.data[0];
                    tempSearchResult = {
                        name: stockData.name,
                        symbol: stockData.symbol,
                        price: stockData.current_price,
                        type: 'Stock',
                        cost_per_share: stockData.cost_per_share,
                        shares_owned: stockData.shares_owned,
                        amount_paid: stockData.amount_paid,
                        profits_losses: stockData.profits_losses,
                        total_value: stockData.total_value, // Ensure total_value is captured
                    };
                    found = true;
                }
            } catch (stockError) {
                console.log("Error fetching as stock (might not exist in portfolio or API issue):", stockError.response?.data || stockError);
            }

            // 2. If not found as a stock, attempt to fetch as a cryptocurrency
            if (!found) {
                try {
                    const currencyResponse = await axios.get(`${apiBaseUrl}/currencies/?symbol=${upperSymbol}`, {
                        headers: { 'Authorization': `Bearer ${accessToken}` }
                    });
                    if (currencyResponse.data && currencyResponse.data.length > 0) {
                        const currencyData = currencyResponse.data[0];
                        tempSearchResult = {
                            name: currencyData.name,
                            symbol: currencyData.symbol,
                            price: currencyData.current_price,
                            type: 'Cryptocurrency',
                            rank: currencyData.rank,
                            percent_change_1h: currencyData.percent_change_1h,
                            percent_change_24h: currencyData.percent_change_24h,
                            percent_change_7d: currencyData.percent_change_7d,
                            price_per: currencyData.price_per,
                            amount_owned: currencyData.amount_owned,
                            total_paid: currencyData.total_paid,
                            profits_losses: currencyData.profits_losses,
                            total_value: currencyData.total_value, // Ensure total_value is captured
                        };
                        found = true;
                    }
                } catch (currencyError) {
                    console.log("Error fetching as cryptocurrency (might not exist in portfolio or API issue):", currencyError.response?.data || currencyError);
                }
            }

            // Client-side override for type if it's a known stock symbol
            if (found && tempSearchResult && tempSearchResult.type === 'Cryptocurrency' && COMMON_STOCK_SYMBOLS.includes(upperSymbol)) {
                console.log(`Overriding type for ${upperSymbol} from Cryptocurrency to Stock.`);
                tempSearchResult.type = 'Stock';
            }

            if (found) {
                setSearchResult(tempSearchResult);
                setMessage('');
            } else {
                setMessage('No information found for that symbol.');
            }

        } catch (overallError) {
            console.error("Overall error during search:", overallError.response?.data || overallError);
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

    const formatPercentage = (value) => {
        if (value === null || value === undefined) {
            return 'N/A';
        }
        return `${parseFloat(value).toFixed(2)}%`;
    };

    const handleBack = () => {
        navigate('/'); // Go back to the main portal page
    };

    return (
        <div className="App">
            <h1>Search for Crypto or Stock</h1>
            {message && <p className={message.includes('Error') || message.includes('No information') ? 'error-message' : 'success-message'}>{message}</p>}

            <form onSubmit={handleSearch}>
                <input
                    type="text"
                    placeholder="Enter Symbol (e.g., TSLA, BTC)"
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
                    <p>Type: {searchResult.type}</p>
                    {/* Display Current Price with API limit message if applicable */}
                    <p>
                        Current Price: {formatCurrency(searchResult.price)}
                        {searchResult.price === null && searchResult.type === 'Stock' && (
                            <span className="api-limit-message"> (Your Daily API Limit has been reached)</span>
                        )}
                    </p>

                    {/* Conditional rendering for more details */}
                    {searchResult.type === 'Cryptocurrency' && (
                        <div className="details">
                            <p>Rank: {searchResult.rank !== null && searchResult.rank !== undefined ? searchResult.rank : 'N/A'}</p>
                            <p className={searchResult.percent_change_1h >= 0 ? 'profit' : 'loss'}>1HR Change: {formatPercentage(searchResult.percent_change_1h)}</p>
                            <p className={searchResult.percent_change_24h >= 0 ? 'profit' : 'loss'}>24HR Change: {formatPercentage(searchResult.percent_change_24h)}</p>
                            <p className={searchResult.percent_change_7d >= 0 ? 'profit' : 'loss'}>7D Change: {formatPercentage(searchResult.percent_change_7d)}</p>
                            {/* Display owned info if available (meaning it's in user's portfolio) */}
                            {searchResult.amount_owned !== null && searchResult.amount_owned !== undefined && (
                                <>
                                    <p>Amount Owned: {parseFloat(searchResult.amount_owned).toFixed(8)}</p>
                                    <p>Price per (at entry): {parseFloat(searchResult.price_per).toFixed(8)}</p>
                                    <p>Total Paid: {formatCurrency(searchResult.total_paid)}</p>
                                    <p>Total Value: {formatCurrency(searchResult.total_value)}</p>
                                    <p className={searchResult.profits_losses >= 0 ? 'profit' : 'loss'}>Profits/Losses: {formatCurrency(searchResult.profits_losses)}</p>
                                </>
                            )}
                        </div>
                    )}

                    {searchResult.type === 'Stock' && (
                        <div className="details">
                            {/* Display owned info if available (meaning it's in user's portfolio) */}
                            {searchResult.shares_owned !== null && searchResult.shares_owned !== undefined && (
                                <>
                                    <p>Shares Owned: {parseFloat(searchResult.shares_owned).toFixed(4)}</p>
                                    <p>Price per (at entry): {parseFloat(searchResult.cost_per_share).toFixed(2)}</p>
                                    <p>Total Paid: {formatCurrency(searchResult.amount_paid)}</p>
                                    <p>Total Value: {formatCurrency(searchResult.total_value)}</p>
                                    <p className={searchResult.profits_losses >= 0 ? 'profit' : 'loss'}>Profits/Losses: {formatCurrency(searchResult.profits_losses)}</p>
                                </>
                            )}
                        </div>
                    )}
                </div>
            )}

            <hr />

            {/* Legend Table */}
            <div className="legend-section">
                <h2>Common Symbols to Search</h2>
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
                                        <tr key={index}>
                                            <td>{crypto.rank}</td>
                                            <td>{crypto.name}</td>
                                            <td>{crypto.symbol}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        )}
                    </div>

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
                                        <tr key={index}>
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

export default CryptoStockSearch;
