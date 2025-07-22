import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate, useParams } from 'react-router-dom';

function Currencies({ apiBaseUrl }) {
    const navigate = useNavigate();
    const { portfolioId } = useParams();
    const [currencies, setCurrencies] = useState([]);
    const [message, setMessage] = useState('');
    const [portfolioName, setPortfolioName] = useState('');

    // State for editing a currency
    const [editingCurrency, setEditingCurrency] = useState(null);
    const [editName, setEditName] = useState('');
    const [editSymbol, setEditSymbol] = useState('');
    const [editPricePer, setEditPricePer] = useState('');
    const [editAmountOwned, setEditAmountOwned] = useState('');

    useEffect(() => {
        const fetchCurrencies = async () => {
            if (!portfolioId) {
                setMessage('No portfolio selected. Please go back to portfolios.');
                return;
            }

            try {
                const accessToken = localStorage.getItem('accessToken');
                if (!accessToken) {
                    setMessage('You need to be logged in to view currencies.');
                    navigate('/login');
                    return;
                }

                const portfolioResponse = await axios.get(`${apiBaseUrl}/portfolios/${portfolioId}/`, {
                    headers: {
                        'Authorization': `Bearer ${accessToken}`
                    }
                });
                setPortfolioName(portfolioResponse.data.name);

                const currenciesResponse = await axios.get(`${apiBaseUrl}/portfolios/${portfolioId}/currencies/`, {
                    headers: {
                        'Authorization': `Bearer ${accessToken}`
                    }
                });
                setCurrencies(currenciesResponse.data);
                setMessage('');
            } catch (error) {
                console.error("Error fetching currencies:", error.response?.data || error);
                setMessage('Failed to load currencies.');
                if (error.response?.status === 401) {
                    navigate('/login');
                } else if (error.response?.status === 404) {
                    setMessage('Portfolio not found.');
                }
            }
        };

        fetchCurrencies();
    }, [apiBaseUrl, navigate, portfolioId]);

    const calculateTotalBalance = () => {
        return currencies.reduce((sum, currency) => {
            const price = parseFloat(currency.price_per);
            const amount = parseFloat(currency.amount_owned);
            if (!isNaN(price) && !isNaN(amount)) {
                return sum + (price * amount);
            }
            return sum;
        }, 0).toFixed(2);
    };

    const handleAddCurrency = () => {
        navigate(`/currencies/new?portfolio=${portfolioId}`);
    };

    const handleBackToPortfolios = () => {
        navigate('/portfolios');
    };

    const handleEditClick = (currency) => {
        setEditingCurrency(currency);
        setEditName(currency.name);
        setEditSymbol(currency.symbol);
        setEditPricePer(currency.price_per);
        setEditAmountOwned(currency.amount_owned);
    };

    const handleCancelEdit = () => {
        setEditingCurrency(null);
        setEditName('');
        setEditSymbol('');
        setEditPricePer('');
        setEditAmountOwned('');
        setMessage('');
    };

    const handleSaveEdit = async (e) => {
        e.preventDefault();
        setMessage('');
        if (!editingCurrency) return;

        if (!editName || !editSymbol || editPricePer === '' || editAmountOwned === '') {
            setMessage('All fields are required.');
            return;
        }
        if (isNaN(parseFloat(editPricePer)) || isNaN(parseFloat(editAmountOwned))) {
            setMessage('Price per and Amount owned must be valid numbers.');
            return;
        }

        try {
            const accessToken = localStorage.getItem('accessToken');
            if (!accessToken) {
                setMessage('You need to be logged in to edit currencies.');
                navigate('/login');
                return;
            }

            const payload = {
                name: editName,
                symbol: editSymbol,
                price_per: parseFloat(editPricePer),
                amount_owned: parseFloat(editAmountOwned),
            };

            await axios.patch(`${apiBaseUrl}/portfolios/${portfolioId}/currencies/${editingCurrency.id}/`, payload, {
                headers: {
                    'Authorization': `Bearer ${accessToken}`
                }
            });

            setMessage(`Currency "${editName}" updated successfully!`);
            setEditingCurrency(null);

            const currenciesResponse = await axios.get(`${apiBaseUrl}/portfolios/${portfolioId}/currencies/`, {
                headers: {
                    'Authorization': `Bearer ${accessToken}`
                }
            });
            setCurrencies(currenciesResponse.data);

        } catch (error) {
            console.error("Error updating currency:", error.response?.data || error);
            const errorMsg = error.response?.data?.symbol?.[0] ||
                             error.response?.data?.name?.[0] ||
                             error.response?.data?.price_per?.[0] ||
                             error.response?.data?.amount_owned?.[0] ||
                             error.response?.data?.non_field_errors?.[0] ||
                             error.response?.data?.detail ||
                             'Failed to update currency.';
            setMessage(errorMsg);
            if (error.response?.status === 401) {
                navigate('/login');
            }
        }
    };

    const handleDeleteClick = async (currencyId, currencyName) => {
        if (!window.confirm(`Are you sure you want to delete "${currencyName}"?`)) {
            return;
        }
        setMessage('');

        try {
            const accessToken = localStorage.getItem('accessToken');
            if (!accessToken) {
                setMessage('You need to be logged in to delete currencies.');
                navigate('/login');
                return;
            }

            await axios.delete(`${apiBaseUrl}/portfolios/${portfolioId}/currencies/${currencyId}/`, {
                headers: {
                    'Authorization': `Bearer ${accessToken}`
                }
            });

            setMessage(`Currency "${currencyName}" deleted successfully!`);
            setCurrencies(currencies.filter(currency => currency.id !== currencyId));

        } catch (error) {
            console.error("Error deleting currency:", error.response?.data || error);
            const errorMsg = error.response?.data?.detail || 'Failed to delete currency.';
            setMessage(errorMsg);
            if (error.response?.status === 401) {
                navigate('/login');
            }
        }
    };

    return (
        <div className="App">
            <h1>Currencies for "{portfolioName}"</h1>
            {message && <p className={message.includes('failed') || message.includes('error') ? 'error-message' : 'success-message'}>{message}</p>}

            <h2>Total Portfolio Balance: ${calculateTotalBalance()}</h2>

            {currencies.length === 0 ? (
                <p>No currencies found for this portfolio. Add one!</p>
            ) : (
                <div className="currencies-list">
                    {currencies.map(currency => (
                        <div key={currency.id} className="currency-item">
                            {editingCurrency && editingCurrency.id === currency.id ? (
                                <form onSubmit={handleSaveEdit}>
                                    <h3>
                                        <input
                                            type="text"
                                            value={editName}
                                            onChange={(e) => setEditName(e.target.value)}
                                            required
                                        /> ({editingCurrency.symbol})
                                    </h3>
                                    <p>Price per: $
                                        <input
                                            type="number"
                                            step="0.01" // Changed step to 0.01 for easier 2-decimal input
                                            value={editPricePer}
                                            onChange={(e) => setEditPricePer(e.target.value)}
                                            required
                                        />
                                    </p>
                                    <p>Amount owned:
                                        <input
                                            type="number"
                                            step="0.01" // Changed step to 0.01
                                            value={editAmountOwned}
                                            onChange={(e) => setEditAmountOwned(e.target.value)}
                                            required
                                        />
                                    </p>
                                    <button type="submit">Save</button>
                                    <button type="button" onClick={handleCancelEdit}>Cancel</button>
                                </form>
                            ) : (
                                <>
                                    <h3>{currency.name} ({currency.symbol})</h3>
                                    {/* APPLY .toFixed(2) HERE for display */}
                                    <p>Price per: ${parseFloat(currency.price_per).toFixed(2)}</p>
                                    <p>Amount owned: {parseFloat(currency.amount_owned).toFixed(2)}</p>
                                    <p>Value: ${(parseFloat(currency.price_per) * parseFloat(currency.amount_owned)).toFixed(2)}</p>
                                    <button onClick={() => handleEditClick(currency)}>Edit</button>
                                    <button onClick={() => handleDeleteClick(currency.id, currency.name)}>Delete</button>
                                </>
                            )}
                        </div>
                    ))}
                </div>
            )}

            <button onClick={handleAddCurrency}>Add A New Currency</button>
            <hr />
            <button onClick={handleBackToPortfolios}>Back to Portfolios</button>
        </div>
    );
}

export default Currencies;