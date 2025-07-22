import React, { useState, useEffect, useCallback } from 'react'; // Added useCallback
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

function AllCurrenciesList({ apiBaseUrl }) {
    const navigate = useNavigate();
    const [currencies, setCurrencies] = useState([]);
    const [totalBalance, setTotalBalance] = useState('0.00');
    const [message, setMessage] = useState('');

    // Wrap fetchAllCurrencies in useCallback
    const fetchAllCurrencies = useCallback(async () => {
        try {
            const accessToken = localStorage.getItem('accessToken');
            if (!accessToken) {
                setMessage('You need to be logged in to view currencies.');
                navigate('/login');
                return;
            }
            // This endpoint (GET /api/currencies/) is set up in your backend
            // CurrencyViewSet.get_queryset to return ALL currencies for the current user.
            const response = await axios.get(`${apiBaseUrl}/currencies/`, {
                headers: {
                    'Authorization': `Bearer ${accessToken}`
                }
            });
            setCurrencies(response.data);
            setMessage('');

            // Calculate total balance from all fetched currencies
            const calculatedTotal = response.data.reduce((sum, currency) => {
                // Ensure current_price is used if available, otherwise fall back to current_entry_price, then price_per
                const price = parseFloat(currency.current_price || currency.current_entry_price || currency.price_per); // MODIFIED
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
            if (error.response?.status === 401) {
                navigate('/login');
            }
        }
    }, [apiBaseUrl, navigate]); // Dependencies for useCallback

    useEffect(() => {
        fetchAllCurrencies();
    }, [fetchAllCurrencies]); // Added fetchAllCurrencies to dependency array

    const handleAddCurrencyClick = () => {
        navigate('/currencies/new'); // Navigate to the 'Create a Currency' page
    };

    const handleBackToPortfolios = () => {
        navigate('/portfolios'); // Navigate back to the main portfolios page
    };

    // Helper function to format the date string
    const formatDate = (dateString) => {
        if (!dateString) return 'N/A';
        const options = { year: 'numeric', month: 'long', day: 'numeric', hour: 'numeric', minute: 'numeric' };
        return new Date(dateString).toLocaleDateString(undefined, options);
    };

    const handleCurrencyClick = (portfolioId, currencyId) => {
        // Navigate to the specific portfolio's currency page with the currency ID as a query parameter
        navigate(`/currencies/${portfolioId}?editCurrencyId=${currencyId}`);
    };

    return (
        <div className="App">
            <h1>All Currencies</h1>
            {message && <p className={message.includes('failed') || message.includes('error') ? 'error-message' : 'success-message'}>{message}</p>}

            <p className="total-balance-display">Total Balance: ${totalBalance}</p>

            <button onClick={handleAddCurrencyClick} className="action-button">Add A New Currency</button>

            <div className="currency-list-section">
                {currencies.length === 0 ? (
                    <p>No currencies found. Add one!</p>
                ) : (
                    <ul className="currency-list">
                        {currencies.map((currency, index) => (
                            <li 
                                key={currency.id} 
                                className="currency-item" 
                                onClick={() => handleCurrencyClick(currency.portfolio, currency.id)} // Make the entire item clickable
                                style={{ cursor: 'pointer' }} // Add cursor pointer for visual feedback
                            >
                                <span className="currency-info">
                                    {index + 1}. {currency.name} - {currency.symbol} = ${ (parseFloat(currency.current_price || currency.current_entry_price || currency.price_per) * parseFloat(currency.amount_owned)).toFixed(2) } | {formatDate(currency.date_added)} {/* MODIFIED */}
                                </span>
                            </li>
                        ))}
                    </ul>
                )}
            </div>

            <button onClick={handleBackToPortfolios} className="back-button">Back to Portfolios</button>
        </div>
    );
}

export default AllCurrenciesList;