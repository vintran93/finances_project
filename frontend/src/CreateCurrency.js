import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

function CreateCurrency({ apiBaseUrl }) {
    const navigate = useNavigate();
    const [message, setMessage] = useState('');
    const [portfolioId, setPortfolioId] = useState('');
    const [currencyName, setCurrencyName] = useState('');
    const [symbol, setSymbol] = useState(''); // New state for Symbol
    const [pricePer, setPricePer] = useState(''); // New state for Price per
    const [amountOwned, setAmountOwned] = useState(''); // New state for Amount owned
    const [userPortfolios, setUserPortfolios] = useState([]);

    useEffect(() => {
        const fetchUserPortfolios = async () => {
            try {
                const accessToken = localStorage.getItem('accessToken');
                if (!accessToken) {
                    setMessage('You need to be logged in to create currencies.');
                    navigate('/login');
                    return;
                }

                const response = await axios.get(`${apiBaseUrl}/portfolios/`, {
                    headers: {
                        'Authorization': `Bearer ${accessToken}`
                    }
                });
                setUserPortfolios(response.data);
                if (response.data.length > 0) {
                    setPortfolioId(response.data[0].id);
                }
                setMessage('');
            } catch (error) {
                console.error("Error fetching portfolios:", error.response?.data || error);
                setMessage('Failed to load portfolios for selection.');
                if (error.response?.status === 401) {
                    navigate('/login');
                }
            }
        };

        fetchUserPortfolios();
    }, [apiBaseUrl, navigate]);

    const handleCreateCurrency = async (e) => {
        e.preventDefault();
        setMessage('');

        if (!portfolioId) {
            setMessage('Please select a portfolio.');
            return;
        }
        if (!currencyName.trim()) {
            setMessage('Currency name cannot be empty.');
            return;
        }
        if (!symbol.trim()) {
            setMessage('Symbol cannot be empty.');
            return;
        }
        if (isNaN(parseFloat(pricePer)) || parseFloat(pricePer) <= 0) {
            setMessage('Price per must be a positive number.');
            return;
        }
        if (isNaN(parseFloat(amountOwned)) || parseFloat(amountOwned) < 0) {
            setMessage('Amount owned must be a non-negative number.');
            return;
        }

        try {
            const accessToken = localStorage.getItem('accessToken');
            if (!accessToken) {
                setMessage('You need to be logged in to create currencies.');
                navigate('/login');
                return;
            }

            await axios.post(`${apiBaseUrl}/currencies/`,
                {
                    portfolio: portfolioId,
                    name: currencyName,
                    symbol: symbol, // Include symbol
                    price_per: parseFloat(pricePer), // Include price_per, ensure it's a number
                    amount_owned: parseFloat(amountOwned), // Include amount_owned, ensure it's a number
                },
                {
                    headers: {
                        'Authorization': `Bearer ${accessToken}`
                    }
                }
            );
            setMessage(`Currency "${currencyName}" added successfully to portfolio!`);
            setCurrencyName('');
            setSymbol('');
            setPricePer('');
            setAmountOwned('');

        } catch (error) {
            console.error("Error creating currency:", error.response?.data || error);
            const errorMsg = error.response?.data?.name?.[0] ||
                             error.response?.data?.portfolio?.[0] ||
                             error.response?.data?.symbol?.[0] ||
                             error.response?.data?.price_per?.[0] ||
                             error.response?.data?.amount_owned?.[0] ||
                             error.response?.data?.non_field_errors?.[0] ||
                             error.response?.data?.detail ||
                             'Failed to create currency.';
            setMessage(errorMsg);
            if (error.response?.status === 401) {
                navigate('/login');
            }
        }
    };

    const handleBackToCurrencies = () => {
        navigate('/currencies');
    };

    return (
        <div className="App">
            <h1>Create a Currency</h1>
            {message && <p className={message.includes('failed') || message.includes('error') ? 'error-message' : 'success-message'}>{message}</p>}

            <form onSubmit={handleCreateCurrency}>
                <label htmlFor="portfolio-select">Portfolio name</label>
                <select
                    id="portfolio-select"
                    value={portfolioId}
                    onChange={(e) => setPortfolioId(e.target.value)}
                    required
                >
                    <option value="">Select a Portfolio</option>
                    {userPortfolios.map(portfolio => (
                        <option key={portfolio.id} value={portfolio.id}>
                            {portfolio.name}
                        </option>
                    ))}
                </select>

                <label htmlFor="currency-name">Name</label>
                <input
                    id="currency-name"
                    type="text"
                    placeholder="e.g., USD, BTC"
                    value={currencyName}
                    onChange={(e) => setCurrencyName(e.target.value)}
                    required
                />

                <label htmlFor="currency-symbol">Symbol</label> {/* New field */}
                <input
                    id="currency-symbol"
                    type="text"
                    placeholder="e.g., CRO, SHIB, GLD, TSLA"
                    value={symbol}
                    onChange={(e) => setSymbol(e.target.value)}
                    required
                />

                <label htmlFor="price-per">Price per</label> {/* New field */}
                <input
                    id="price-per"
                    type="number"
                    step="0.00000001" // Allow for small decimal values for cryptocurrencies
                    placeholder="e.g., 0.15, 60000"
                    value={pricePer}
                    onChange={(e) => setPricePer(e.target.value)}
                    required
                />

                <label htmlFor="amount-owned">Amount owned</label> {/* New field */}
                <input
                    id="amount-owned"
                    type="number"
                    step="0.00000001" // Allow for small decimal values
                    placeholder="e.g., 1000, 0.05"
                    value={amountOwned}
                    onChange={(e) => setAmountOwned(e.target.value)}
                    required
                />

                {/* The suggestions from your previous screenshot are removed here
                    as they were for the 'Name' field, but the new screenshot
                    doesn't show them directly under the 'Name' input on this page.
                    If you still want them, we can re-add them conditionally for the 'Name' or 'Symbol' field.
                */}
                <button type="submit">Create Currency</button>
            </form>

            <hr />
            <button onClick={handleBackToCurrencies}>Back to All Currencies</button>
        </div>
    );
}

export default CreateCurrency;