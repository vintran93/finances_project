import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

function AllCurrenciesList({ apiBaseUrl }) {
    const navigate = useNavigate();
    const [currencies, setCurrencies] = useState([]);
    const [totalBalance, setTotalBalance] = useState('0.00');
    const [message, setMessage] = useState('');

    useEffect(() => {
        fetchAllCurrencies();
    }, []);

    const fetchAllCurrencies = async () => {
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
                const price = parseFloat(currency.price_per);
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
    };

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
                            <li key={currency.id} className="currency-item">
                                <span className="currency-info">
                                    {index + 1}. {currency.name} - {currency.symbol} = ${ (parseFloat(currency.price_per) * parseFloat(currency.amount_owned)).toFixed(2) } | {formatDate(currency.date_added)}
                                </span>
                                {/* You can add Edit/Delete buttons here for each currency if desired, similar to the specific portfolio view or the Portfolios page */}
                                {/*
                                <div className="currency-actions">
                                    <button className="edit-button">Edit</button>
                                    <button className="delete-button">Delete</button>
                                </div>
                                */}
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