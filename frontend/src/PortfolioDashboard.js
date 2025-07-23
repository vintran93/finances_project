import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

function PortfolioDashboard({ apiBaseUrl }) {
    const navigate = useNavigate();
    const [portfolios, setPortfolios] = useState([]);
    const [currencies, setCurrencies] = useState([]);
    const [stocks, setStocks] = useState([]);
    const [message, setMessage] = useState('');
    const [loading, setLoading] = useState(true);

    const fetchDashboardData = useCallback(async () => {
        setLoading(true);
        try {
            const accessToken = localStorage.getItem('accessToken');
            if (!accessToken) {
                setMessage('You need to be logged in to view the dashboard.');
                navigate('/login');
                return;
            }

            // Fetch all portfolios
            const portfoliosResponse = await axios.get(`${apiBaseUrl}/portfolios/`, {
                headers: { 'Authorization': `Bearer ${accessToken}` }
            });
            setPortfolios(portfoliosResponse.data);
            console.log("Fetched Portfolios:", portfoliosResponse.data); // DEBUG LOG

            // Fetch all currencies for the user (now includes enriched data from backend)
            const currenciesResponse = await axios.get(`${apiBaseUrl}/currencies/`, {
                headers: { 'Authorization': `Bearer ${accessToken}` }
            });
            setCurrencies(currenciesResponse.data);
            console.log("Fetched Currencies:", currenciesResponse.data); // DEBUG LOG

            // Fetch all stocks for the user (now includes enriched data from backend)
            const stocksResponse = await axios.get(`${apiBaseUrl}/stocks/`, {
                headers: { 'Authorization': `Bearer ${accessToken}` }
            });
            setStocks(stocksResponse.data);
            console.log("Fetched Stocks:", stocksResponse.data); // DEBUG LOG

            setMessage('');
        } catch (error) {
            console.error("Error fetching dashboard data:", error.response?.data || error);
            setMessage('Failed to load dashboard data.');
            if (error.response?.status === 401) {
                navigate('/login');
            }
        } finally {
            setLoading(false);
        }
    }, [apiBaseUrl, navigate]);

    useEffect(() => {
        fetchDashboardData();
    }, [fetchDashboardData]);

    // Helper to calculate total profits/losses for a given list of items
    const calculateTotalProfitsLosses = (items) => {
        return items.reduce((sum, item) => {
            const profitsLosses = parseFloat(item.profits_losses);
            return sum + (isNaN(profitsLosses) ? 0 : profitsLosses);
        }, 0);
    };

    // Helper to format currency
    const formatCurrency = (amount) => {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD',
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        }).format(amount);
    };

    // Filter currencies for Cryptocurrency Portfolio
    const cryptoPortfolio = portfolios.find(p => p.name.toLowerCase() === 'cryptocurrency');
    const cryptoCurrencies = cryptoPortfolio 
        ? currencies.filter(c => c.portfolio === cryptoPortfolio.id)
        : [];
    console.log("Crypto Portfolio:", cryptoPortfolio); // DEBUG LOG
    console.log("Filtered Crypto Currencies:", cryptoCurrencies); // DEBUG LOG

    // Filter stocks for Stocks Portfolio
    const stocksPortfolio = portfolios.find(p => p.name.toLowerCase() === 'stocks');
    
    // NEW LOGIC: Combine actual Stock objects and Currency objects associated with the 'Stocks' portfolio
    let combinedStocksAndCurrenciesForStocksPortfolio = [];
    if (stocksPortfolio) {
        // Add actual Stock objects
        const actualStocks = stocks.filter(s => s.portfolio === stocksPortfolio.id);
        combinedStocksAndCurrenciesForStocksPortfolio.push(...actualStocks);

        // Add Currency objects that are linked to the 'Stocks' portfolio
        // This handles cases where a "stock" might have been created as a Currency type
        const currenciesInStocksPortfolio = currencies.filter(c => c.portfolio === stocksPortfolio.id);
        combinedStocksAndCurrenciesForStocksPortfolio.push(...currenciesInStocksPortfolio);
    }

    // Sort the combined list by name for consistent display
    combinedStocksAndCurrenciesForStocksPortfolio.sort((a, b) => a.name.localeCompare(b.name));

    console.log("Stocks Portfolio:", stocksPortfolio); // DEBUG LOG
    console.log("Combined Stocks and Currencies for Stocks Portfolio:", combinedStocksAndCurrenciesForStocksPortfolio); // DEBUG LOG

    const totalCryptoProfitsLosses = calculateTotalProfitsLosses(cryptoCurrencies);
    // Calculate total profits/losses for the combined stocks/currencies in the Stocks Portfolio
    const totalStocksProfitsLosses = calculateTotalProfitsLosses(combinedStocksAndCurrenciesForStocksPortfolio);
    const overallProfitsLosses = totalCryptoProfitsLosses + totalStocksProfitsLosses;

    const handleManagePortfolios = () => {
        navigate('/portfolios');
    };

    const handleAddCurrency = () => {
        navigate('/currencies/new');
    };

    const handleAddStock = () => {
        navigate('/stocks/new');
    };

    // NEW: Function to handle deleting an item (stock or currency)
    const handleDeleteItem = async (itemId, itemName, itemType, portfolioId) => {
        if (!window.confirm(`Are you sure you want to delete "${itemName}" (${itemType})?`)) {
            return;
        }
        setMessage('');

        try {
            const accessToken = localStorage.getItem('accessToken');
            if (!accessToken) {
                setMessage('You need to be logged in to delete items.');
                navigate('/login');
                return;
            }

            let deleteEndpoint = '';
            if (itemType === 'Stock') {
                deleteEndpoint = `${apiBaseUrl}/stocks/${itemId}/`;
            } else if (itemType === 'Currency') {
                // For currencies, we need the portfolio ID.
                // It's passed directly now, or we can find it if not passed.
                const currentItemPortfolioId = portfolioId || cryptoCurrencies.find(c => c.id === itemId)?.portfolio;
                if (!currentItemPortfolioId) {
                    setMessage('Error: Could not determine portfolio for currency deletion.');
                    return;
                }
                deleteEndpoint = `${apiBaseUrl}/portfolios/${currentItemPortfolioId}/currencies/${itemId}/`;
            } else {
                setMessage('Error: Unknown item type for deletion.');
                return;
            }

            await axios.delete(deleteEndpoint, {
                headers: {
                    'Authorization': `Bearer ${accessToken}`
                }
            });

            setMessage(`"${itemName}" deleted successfully!`);
            // Re-fetch all dashboard data to ensure the tables are updated
            fetchDashboardData();

        } catch (error) {
            console.error("Error deleting item:", error.response?.data || error);
            const errorMsg = error.response?.data?.detail || 'Failed to delete item.';
            setMessage(errorMsg);
            if (error.response?.status === 401) {
                navigate('/login');
            }
        }
    };

    if (loading) {
        return (
            <div className="App">
                <h1>Investing Portfolios All Currencies</h1>
                <p>Loading dashboard data...</p>
            </div>
        );
    }

    return (
        <div className="App">
            <h1>Investing Portfolios All Currencies</h1>
            {message && <p className={message.includes('failed') || message.includes('error') ? 'error-message' : 'success-message'}>{message}</p>}

            <div className="portfolio-section">
                <h2>Cryptocurrencies Portfolio</h2>
                {cryptoCurrencies.length === 0 ? (
                    <p>No cryptocurrencies in your portfolio. Add some!</p>
                ) : (
                    <table>
                        <thead>
                            <tr>
                                <th>Name</th>
                                <th>Symbol</th>
                                <th>Rank</th>
                                <th>1HR</th>
                                <th>24HR</th>
                                <th>7D</th>
                                <th>Current Price</th>
                                <th>Total Value</th>
                                <th>Total Paid</th>
                                <th>Profits/Losses</th>
                                <th>Price per (at entry)</th>
                                <th>Amount owned</th>
                                <th>Actions</th> {/* NEW: Actions column for cryptocurrencies */}
                            </tr>
                        </thead>
                        <tbody>
                            {cryptoCurrencies.map(currency => (
                                <tr key={currency.id}>
                                    <td>{currency.name}</td>
                                    <td>{currency.symbol}</td>
                                    <td>{currency.rank !== null && currency.rank !== undefined ? currency.rank : 'N/A'}</td>
                                    <td className={currency.percent_change_1h >= 0 ? 'profit' : 'loss'}>
                                        {currency.percent_change_1h !== null && currency.percent_change_1h !== undefined ? parseFloat(currency.percent_change_1h).toFixed(2) + '%' : 'N/A'}
                                    </td>
                                    <td className={currency.percent_change_24h >= 0 ? 'profit' : 'loss'}>
                                        {currency.percent_change_24h !== null && currency.percent_change_24h !== undefined ? parseFloat(currency.percent_change_24h).toFixed(2) + '%' : 'N/A'}
                                    </td>
                                    <td className={currency.percent_change_7d >= 0 ? 'profit' : 'loss'}>
                                        {currency.percent_change_7d !== null && currency.percent_change_7d !== undefined ? parseFloat(currency.percent_change_7d).toFixed(2) + '%' : 'N/A'}
                                    </td>
                                    <td>{currency.current_price !== null && currency.current_price !== undefined ? formatCurrency(currency.current_price) : 'N/A'}</td>
                                    <td>{currency.total_value !== null && currency.total_value !== undefined ? formatCurrency(currency.total_value) : 'N/A'}</td>
                                    <td>{currency.total_paid !== null && currency.total_paid !== undefined ? formatCurrency(currency.total_paid) : 'N/A'}</td>
                                    <td className={currency.profits_losses >= 0 ? 'profit' : 'loss'}>
                                        {currency.profits_losses !== null && currency.profits_losses !== undefined ? formatCurrency(currency.profits_losses) : 'N/A'}
                                    </td>
                                    <td>{parseFloat(currency.current_entry_price || currency.price_per).toFixed(8)}</td>
                                    <td>{parseFloat(currency.amount_owned).toFixed(8)}</td>
                                    <td>
                                        <button
                                            onClick={() => handleDeleteItem(currency.id, currency.name, 'Currency', currency.portfolio)}
                                            className="delete-button"
                                        >
                                            Delete
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
                <p>Total Portfolio Profits/Losses: <span className={totalCryptoProfitsLosses >= 0 ? 'profit' : 'loss'}>{formatCurrency(totalCryptoProfitsLosses)}</span></p>
            </div>

            <div className="portfolio-section">
                <h2>Stocks Portfolio</h2>
                {combinedStocksAndCurrenciesForStocksPortfolio.length === 0 ? (
                    <p>No stocks in your portfolio. Add some!</p>
                ) : (
                    <table>
                        <thead>
                            <tr>
                                <th>Name</th>
                                <th>Symbol</th>
                                <th>Current Price</th>
                                <th>Total Value</th>
                                <th>Amount Paid</th>
                                <th>Profits/Losses</th>
                                <th>Purchase Price</th>
                                <th>Quantity Owned</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {combinedStocksAndCurrenciesForStocksPortfolio.map(item => (
                                <tr key={item.id}>
                                    <td>{item.name}</td>
                                    <td>{item.symbol}</td>
                                    <td>{item.current_price !== null && item.current_price !== undefined ? formatCurrency(item.current_price) : 'N/A'}</td>
                                    <td>{item.total_value !== null && item.total_value !== undefined ? formatCurrency(item.total_value) : 'N/A'}</td>
                                    <td>
                                        {item.cost_per_share !== undefined && item.shares_owned !== undefined ?
                                            formatCurrency(parseFloat(item.cost_per_share) * parseFloat(item.shares_owned)) :
                                            item.total_paid !== undefined ? formatCurrency(item.total_paid) : 'N/A'
                                        }
                                    </td>
                                    <td className={item.profits_losses >= 0 ? 'profit' : 'loss'}>
                                        {item.profits_losses !== null && item.profits_losses !== undefined ? formatCurrency(item.profits_losses) : 'N/A'}
                                    </td>
                                    <td>
                                        {item.cost_per_share !== undefined ? parseFloat(item.cost_per_share).toFixed(2) :
                                           item.price_per !== undefined ? parseFloat(item.price_per).toFixed(8) : 'N/A'}
                                    </td>
                                    <td>
                                        {item.shares_owned !== undefined ? parseFloat(item.shares_owned).toFixed(4) :
                                           item.amount_owned !== undefined ? parseFloat(item.amount_owned).toFixed(8) : 'N/A'}
                                    </td>
                                    <td>
                                        <button
                                            onClick={() => handleDeleteItem(item.id, item.name, item.cost_per_share !== undefined ? 'Stock' : 'Currency', item.portfolio)}
                                            className="delete-button"
                                        >
                                            Delete
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
                <p>Total Portfolio Profits/Losses: <span className={totalStocksProfitsLosses >= 0 ? 'profit' : 'loss'}>{formatCurrency(totalStocksProfitsLosses)}</span></p>
            </div>

            <h2 className="overall-total">Overall Portfolio Profits/Losses: <span className={overallProfitsLosses >= 0 ? 'profit' : 'loss'}>{formatCurrency(overallProfitsLosses)}</span></h2>

            <div className="dashboard-actions">
                <button onClick={handleManagePortfolios} className="action-button">Manage Portfolios</button>
                <button onClick={handleAddCurrency} className="action-button">Add New Currency</button>
                {/* <button onClick={handleAddStock} className="action-button">Add New Stock</button> */}
            </div>
        </div>
    );
}

export default PortfolioDashboard;
