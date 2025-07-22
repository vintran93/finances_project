import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

function CreateCurrency({ apiBaseUrl }) {
    const navigate = useNavigate();
    const [message, setMessage] = useState('');
    const [portfolioId, setPortfolioId] = useState('');
    const [currencyName, setCurrencyName] = useState('');
    const [symbol, setSymbol] = useState('');
    const [currentEntryPrice, setCurrentEntryPrice] = useState(''); // NEW: For "Price per"
    const [pricePaid, setPricePaid] = useState(''); // RENAMED: For "Price Paid" (purchase price)
    const [amountOwned, setAmountOwned] = useState('');
    const [userPortfolios, setUserPortfolios] = useState([]);
    const [selectedPortfolioType, setSelectedPortfolioType] = useState('');

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
                    setSelectedPortfolioType(response.data[0].name.toLowerCase());
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

    const handlePortfolioChange = (e) => {
        const selectedId = e.target.value;
        setPortfolioId(selectedId);
        const selectedPortfolio = userPortfolios.find(p => p.id === parseInt(selectedId));
        if (selectedPortfolio) {
            setSelectedPortfolioType(selectedPortfolio.name.toLowerCase());
        } else {
            setSelectedPortfolioType('');
        }
    };

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
        // Validate "Price per" (currentEntryPrice)
        if (isNaN(parseFloat(currentEntryPrice)) || parseFloat(currentEntryPrice) <= 0) {
            setMessage('Price per must be a positive number.');
            return;
        }
        // Validate "Price Paid" (pricePaid)
        if (isNaN(parseFloat(pricePaid)) || parseFloat(pricePaid) <= 0) {
            setMessage('Price Paid must be a positive number.');
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
                    symbol: symbol,
                    current_entry_price: parseFloat(currentEntryPrice), // NEW: sending current_entry_price
                    price_per: parseFloat(pricePaid), // This is now explicitly "Price Paid" (purchase price)
                    amount_owned: parseFloat(amountOwned),
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
            setCurrentEntryPrice(''); // Reset new state
            setPricePaid(''); // Reset renamed state
            setAmountOwned('');

        } catch (error) {
            console.error("Error creating currency:", error.response?.data || error);
            const errorMsg = error.response?.data?.name?.[0] ||
                             error.response?.data?.portfolio?.[0] ||
                             error.response?.data?.symbol?.[0] ||
                             error.response?.data?.current_entry_price?.[0] || // Added validation error for new field
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

    // The condition for showing "Price Paid" should now apply to both "Price per" and "Price Paid"
    // as they are both related to the financial asset entry.
    const showFinancialFields = ['precious metals', 'stocks', 'cryptocurrency'].includes(selectedPortfolioType);


    return (
        <div className="App">
            <h1>Create a Currency</h1>
            {message && <p className={message.includes('failed') || message.includes('error') ? 'error-message' : 'success-message'}>{message}</p>}

            <form onSubmit={handleCreateCurrency}>
                <label htmlFor="portfolio-select">Portfolio name</label>
                <select
                    id="portfolio-select"
                    value={portfolioId}
                    onChange={handlePortfolioChange}
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

                <label htmlFor="currency-symbol">Symbol</label>
                <input
                    id="currency-symbol"
                    type="text"
                    placeholder="e.g., CRO, SHIB, GLD, TSLA"
                    value={symbol}
                    onChange={(e) => setSymbol(e.target.value)}
                    required
                />

                {/* Conditionally rendered "Price per" and "Price Paid" fields */}
                {showFinancialFields && (
                    <>
                        <label htmlFor="current-entry-price">Price per</label>
                        <input
                            id="current-entry-price"
                            type="number"
                            step="0.00000001"
                            placeholder="e.g., 0.15, 60000 (Current Market Price)"
                            value={currentEntryPrice}
                            onChange={(e) => setCurrentEntryPrice(e.target.value)}
                            required={showFinancialFields}
                        />

                        <label htmlFor="price-paid">Price Paid</label>
                        <input
                            id="price-paid"
                            type="number"
                            step="0.00000001"
                            placeholder="e.15, 60000 (Your Purchase Price)"
                            value={pricePaid}
                            onChange={(e) => setPricePaid(e.target.value)}
                            required={showFinancialFields}
                        />
                    </>
                )}

                <label htmlFor="amount-owned">Amount owned</label>
                <input
                    id="amount-owned"
                    type="number"
                    step="0.00000001"
                    placeholder="e.g., 1000, 0.05"
                    value={amountOwned}
                    onChange={(e) => setAmountOwned(e.target.value)}
                    required
                />

                <button type="submit">Create Currency</button>
            </form>

            <hr />
            <button onClick={handleBackToCurrencies}>Back to All Currencies</button>
        </div>
    );
}

export default CreateCurrency;