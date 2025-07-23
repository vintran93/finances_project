import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { useNavigate, useLocation } from 'react-router-dom';

function AllCurrenciesList({ apiBaseUrl }) {
    const navigate = useNavigate();
    const location = useLocation();
    const [currencies, setCurrencies] = useState([]);
    const [totalBalance, setTotalBalance] = useState('0.00');
    const [message, setMessage] = useState('');
    const [isSuccessMessage, setIsSuccessMessage] = useState(false);
    const [initialLoadComplete, setInitialLoadComplete] = useState(false);
    const [sortDirection, setSortDirection] = useState(null); // 'asc' or 'desc'
    const [userPortfolios, setUserPortfolios] = useState([]); // To map currency portfolio IDs to types

    // Define colors for different portfolio types
    const typeColors = {
        'cryptocurrency': '#4CAF50', // Green
        'stocks': '#2196F3',         // Blue
        'precious metals': '#FFC107', // Amber/Gold
        'default': '#9E9E9E'         // Grey for unknown types
    };

    // Fetch all portfolios to map currency portfolio IDs to names/types
    const fetchUserPortfolios = useCallback(async () => {
        try {
            const accessToken = localStorage.getItem('accessToken');
            if (!accessToken) {
                // No need to set message/navigate here, parent useEffect handles auth
                return []; // Return empty array if not authenticated
            }
            const response = await axios.get(`${apiBaseUrl}/portfolios/`, {
                headers: { 'Authorization': `Bearer ${accessToken}` }
            });
            setUserPortfolios(response.data);
            return response.data;
        } catch (error) {
            console.error("Error fetching portfolios:", error.response?.data || error);
            // Don't set message here, let fetchAllCurrencies handle overall errors
            return [];
        }
    }, [apiBaseUrl]);


    // Wrap fetchAllCurrencies in useCallback
    const fetchAllCurrencies = useCallback(async () => {
        try {
            const accessToken = localStorage.getItem('accessToken');
            if (!accessToken) {
                setMessage('You need to be logged in to view currencies.');
                setIsSuccessMessage(false);
                navigate('/login');
                return;
            }
            const response = await axios.get(`${apiBaseUrl}/currencies/`, {
                headers: {
                    'Authorization': `Bearer ${accessToken}`
                }
            });
            setCurrencies(response.data);

            const calculatedTotal = response.data.reduce((sum, currency) => {
                const price = parseFloat(currency.current_price || currency.current_entry_price || currency.price_per);
                const amount = parseFloat(currency.amount_owned);
                if (!isNaN(price) && !isNaN(amount)) {
                    return sum + (price * amount);
                }
                return sum;
            }, 0).toFixed(2);
            setTotalBalance(calculatedTotal);

        } catch (error) {
            console.error("Error fetching all currencies:", error.response?.data || error);
            setMessage('Failed to load currencies.');
            setIsSuccessMessage(false);
            if (error.response?.status === 401) {
                navigate('/login');
            }
        }
    }, [apiBaseUrl, navigate]);

    // Effect to handle navigation state message on initial mount
    useEffect(() => {
        if (location.state && location.state.successMessage) {
            setMessage(location.state.successMessage);
            setIsSuccessMessage(true);
            navigate(location.pathname, { replace: true, state: {} });
        }
        setInitialLoadComplete(true);
    }, [location, navigate]);

    // Effect to fetch data, runs after initial message handling
    useEffect(() => {
        if (initialLoadComplete) {
            fetchAllCurrencies();
            fetchUserPortfolios(); // Fetch portfolios when data is loaded
        }
    }, [initialLoadComplete, fetchAllCurrencies, fetchUserPortfolios]);

    const handleAddCurrencyClick = () => {
        navigate('/currencies/new');
    };

    const handleBackToPortfolios = () => {
        navigate('/portfolios');
    };

    const formatDate = (dateString) => {
        if (!dateString) return 'N/A';
        const options = { year: 'numeric', month: 'long', day: 'numeric', hour: 'numeric', minute: 'numeric' };
        return new Date(dateString).toLocaleDateString(undefined, options);
    };

    const handleCurrencyClick = (portfolioId, currencyId) => {
        navigate(`/currencies/${portfolioId}?editCurrencyId=${currencyId}`);
    };

    // Sorting logic
    const getSortedCurrencies = () => {
        if (!sortDirection) {
            return currencies; // No sorting applied
        }

        const sorted = [...currencies].sort((a, b) => {
            const valueA = parseFloat(a.current_price || a.current_entry_price || a.price_per) * parseFloat(a.amount_owned);
            const valueB = parseFloat(b.current_price || b.current_entry_price || b.price_per) * parseFloat(b.amount_owned);

            if (sortDirection === 'asc') {
                return valueA - valueB;
            } else {
                return valueB - valueA;
            }
        });
        return sorted;
    };

    const sortedCurrencies = getSortedCurrencies();

    return (
        <div className="App">
            <h1>All Currencies</h1>
            {message && <p className={isSuccessMessage ? 'success-message' : 'error-message'}>{message}</p>}

            <p className="total-balance-display">Total Balance: ${totalBalance}</p>

            <div className="sort-buttons">
                <button onClick={() => setSortDirection('asc')} className="action-button">Sort by Value (Asc)</button>
                <button onClick={() => setSortDirection('desc')} className="action-button">Sort by Value (Desc)</button>
                {sortDirection && <button onClick={() => setSortDirection(null)} className="action-button">Clear Sort</button>}
            </div>

            <button onClick={handleAddCurrencyClick} className="action-button">Add A New Currency</button>

            <div className="content-container"> {/* New container for list and legend */}
                <div className="currency-list-section">
                    {currencies.length === 0 ? (
                        <p>No currencies found. Add one!</p>
                    ) : (
                        <ul className="currency-list">
                            {sortedCurrencies.map((currency, index) => {
                                // Find the portfolio name to determine type for color-coding
                                const portfolio = userPortfolios.find(p => p.id === currency.portfolio);
                                const portfolioType = portfolio ? portfolio.name.toLowerCase() : 'default';
                                const itemColor = typeColors[portfolioType] || typeColors.default;

                                return (
                                    <li 
                                        key={currency.id} 
                                        className="currency-item" 
                                        onClick={() => handleCurrencyClick(currency.portfolio, currency.id)}
                                        style={{ cursor: 'pointer', borderLeft: `5px solid ${itemColor}`, paddingLeft: '10px' }} // Color-coding
                                    >
                                        <span className="currency-info">
                                            {index + 1}. {currency.name} - {currency.symbol} = ${ (parseFloat(currency.current_price || currency.current_entry_price || currency.price_per) * parseFloat(currency.amount_owned)).toFixed(2) } | {formatDate(currency.date_added)}
                                        </span>
                                    </li>
                                );
                            })}
                        </ul>
                    )}
                </div>

                {/* NEW: Legend Section */}
                <div className="color-legend">
                    <h3>Portfolio Type Legend</h3>
                    <ul>
                        {Object.entries(typeColors).map(([type, color]) => (
                            <li key={type} style={{ display: 'flex', alignItems: 'center', marginBottom: '5px' }}>
                                <span style={{ 
                                    display: 'inline-block', 
                                    width: '20px', 
                                    height: '20px', 
                                    backgroundColor: color, 
                                    marginRight: '10px',
                                    borderRadius: '4px' // Added for consistency
                                }}></span>
                                {type.charAt(0).toUpperCase() + type.slice(1)}
                            </li>
                        ))}
                    </ul>
                </div>
            </div> {/* End of content-container */}

            <button onClick={handleBackToPortfolios} className="back-button">Back to Portfolios</button>
        </div>
    );
}

export default AllCurrenciesList;
