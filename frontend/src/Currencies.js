import React, { useState, useEffect, useCallback } from 'react'; // Added useCallback
import axios from 'axios';
import { useNavigate, useParams, useLocation } from 'react-router-dom'; // Import useLocation

function Currencies({ apiBaseUrl }) {
    const navigate = useNavigate();
    const { portfolioId } = useParams();
    const location = useLocation(); // Initialize useLocation
    const [currencies, setCurrencies] = useState([]);
    const [message, setMessage] = useState('');
    const [portfolioName, setPortfolioName] = useState('');
    // NEW: State for the selected portfolio type to control conditional rendering
    const [selectedPortfolioType, setSelectedPortfolioType] = useState('');

    // State for editing a currency
    const [editingCurrency, setEditingCurrency] = useState(null);
    const [editName, setEditName] = useState('');
    const [editSymbol, setEditSymbol] = useState(''); // State for editing symbol
    // NEW: State for "Price per" (current market price at entry)
    const [editCurrentEntryPrice, setEditCurrentEntryPrice] = useState('');
    // RENAMED: State for "Price Paid" (actual purchase price)
    const [editPricePaid, setEditPricePaid] = useState('');
    const [editAmountOwned, setEditAmountOwned] = useState('');


    // Wrap fetchCurrencies in useCallback
    const fetchCurrencies = useCallback(async () => {
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
            // Set the selected portfolio type for conditional rendering
            setSelectedPortfolioType(portfolioResponse.data.name.toLowerCase());


            const currenciesResponse = await axios.get(`${apiBaseUrl}/portfolios/${portfolioId}/currencies/`, {
                headers: {
                    'Authorization': `Bearer ${accessToken}`
                }
            });
            setCurrencies(currenciesResponse.data);
            // REMOVED: setMessage(''); from here to prevent clearing messages set by other actions

            // Check for editCurrencyId in URL query parameters
            const params = new URLSearchParams(location.search);
            const editCurrencyId = params.get('editCurrencyId');

            if (editCurrencyId) {
                const currencyToEdit = currenciesResponse.data.find(c => String(c.id) === editCurrencyId);
                if (currencyToEdit) {
                    handleEditClick(currencyToEdit); // Use the existing handler to set edit state
                }
            }

        } catch (error) {
            console.error("Error fetching currencies:", error.response?.data || error);
            setMessage('Failed to load currencies.');
            if (error.response?.status === 401) {
                navigate('/login');
            } else if (error.response?.status === 404) {
                setMessage('Portfolio not found.');
            }
        }
    }, [apiBaseUrl, navigate, portfolioId, location.search]); // Added location.search to dependencies

    useEffect(() => {
        fetchCurrencies();
    }, [fetchCurrencies]); // Added fetchCurrencies to dependency array

    const calculateTotalBalance = () => {
        return currencies.reduce((sum, currency) => {
            // Use current_price if available, otherwise fall back to current_entry_price, then price_per
            const price = parseFloat(currency.current_price || currency.current_entry_price || currency.price_per); // MODIFIED
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
        setEditSymbol(currency.symbol); // Initialize editSymbol
        // Initialize new state 'editCurrentEntryPrice' from 'current_entry_price'
        setEditCurrentEntryPrice(currency.current_entry_price || '');
        // Initialize 'editPricePaid' from 'price_per' (which is the purchase price)
        setEditPricePaid(currency.price_per);
        setEditAmountOwned(currency.amount_owned);
    };

    const handleCancelEdit = () => {
        setEditingCurrency(null);
        setEditName('');
        setEditSymbol(''); // Clear editSymbol
        setEditCurrentEntryPrice(''); // Clear new state
        setEditPricePaid(''); // Clear renamed state
        setEditAmountOwned('');
        setMessage('');
        // Clear the query parameter from the URL after canceling edit
        navigate(location.pathname, { replace: true });
    };

    const handleSaveEdit = async (e) => {
        e.preventDefault();
        // REMOVED: setMessage(''); from here to prevent clearing message before it's displayed
        if (!editingCurrency) return;

        // Determine if financial fields should be validated
        const requiresFinancialFields = ['precious metals', 'stocks', 'cryptocurrency'].includes(selectedPortfolioType);

        if (!editName.trim() || !editSymbol.trim() || editAmountOwned === '') { // Validate editSymbol
            setMessage('Name, Symbol, and Amount owned are required.');
            return;
        }

        // Always validate pricePaid as it's the purchase price
        if (isNaN(parseFloat(editPricePaid)) || parseFloat(editPricePaid) <= 0) {
            setMessage('Price Paid must be a positive number.');
            return;
        }

        if (requiresFinancialFields) {
            if (isNaN(parseFloat(editCurrentEntryPrice)) || parseFloat(editCurrentEntryPrice) <= 0) {
                setMessage('Price per must be a positive number.');
                return;
            }
        }

        if (isNaN(parseFloat(editAmountOwned)) || parseFloat(editAmountOwned) < 0) {
            setMessage('Amount owned must be a non-negative number.');
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
                symbol: editSymbol, // Include editSymbol in the payload
                amount_owned: parseFloat(editAmountOwned),
                price_per: parseFloat(editPricePaid), // Always include price_per
            };

            // Conditionally add current_entry_price to payload
            if (requiresFinancialFields) {
                payload.current_entry_price = parseFloat(editCurrentEntryPrice);
            } else {
                // If not a financial type, explicitly set current_entry_price to null
                payload.current_entry_price = null;
            }

            console.log("Sending payload:", payload); // Log the payload

            await axios.patch(`${apiBaseUrl}/portfolios/${portfolioId}/currencies/${editingCurrency.id}/`, payload, {
                headers: {
                    'Authorization': `Bearer ${accessToken}`
                }
            });

            setMessage(`Currency "${editName}" updated successfully!`); // Success message
            setEditingCurrency(null);

            // Re-fetch currencies to get updated data including real-time prices
            // This is the crucial step to ensure the frontend displays the latest data
            fetchCurrencies(); // Call the memoized fetch function
            // Clear the query parameter from the URL after saving edit
            navigate(location.pathname, { replace: true });

            // Set a timeout to clear the message after 3 seconds
            setTimeout(() => {
                setMessage('');
            }, 5000); // Message will disappear after 3 seconds

        } catch (error) {
            console.error("Error updating currency:", error.response?.data || error);
            const errorMsg = error.response?.data?.symbol?.[0] ||
                             error.response?.data?.name?.[0] ||
                             error.response?.data?.current_entry_price?.[0] || // Added error for new field
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

    // The condition for showing "Price per" and "Price Paid" fields in edit mode
    const showFinancialFields = ['precious metals', 'stocks', 'cryptocurrency'].includes(selectedPortfolioType);


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
                                        />
                                        (
                                        <input // Added input for symbol
                                            type="text"
                                            value={editSymbol}
                                            onChange={(e) => setEditSymbol(e.target.value)}
                                            required
                                            style={{ width: '120px' }} // Increased width for the symbol input
                                        />
                                        )
                                    </h3>
                                    {/* Conditionally rendered "Price per" and "Price Paid" fields in edit mode */}
                                    {showFinancialFields && (
                                        <>
                                            <p>Price per: $
                                                <input
                                                    type="number"
                                                    step="0.00000001"
                                                    placeholder="Current Market Price"
                                                    value={editCurrentEntryPrice}
                                                    onChange={(e) => setEditCurrentEntryPrice(e.target.value)}
                                                    required={showFinancialFields}
                                                />
                                            </p>
                                            <p>Amount owned:
                                                <input
                                                    type="number"
                                                    step="0.00000001"
                                                    value={editAmountOwned}
                                                    onChange={(e) => setEditAmountOwned(e.target.value)}
                                                    required
                                                />
                                            </p>
                                            <p>Price Paid: $
                                                <input
                                                    type="number"
                                                    step="0.00000001"
                                                    placeholder="Your Purchase Price"
                                                    value={editPricePaid}
                                                    onChange={(e) => setEditPricePaid(e.target.value)}
                                                    required={showFinancialFields}
                                                />
                                            </p>
                                        </>
                                    )}
                                    {/* If not a financial field, only show Amount owned */}
                                    {!showFinancialFields && (
                                        <p>Amount owned:
                                            <input
                                                type="number"
                                                step="0.00000001"
                                                value={editAmountOwned}
                                                onChange={(e) => setEditAmountOwned(e.target.value)}
                                                required
                                            />
                                        </p>
                                    )}

                                    <button type="submit">Save</button>
                                    <button type="button" onClick={handleCancelEdit}>Cancel</button>
                                </form>
                            ) : (
                                <>
                                    <h3>{currency.name} ({currency.symbol})</h3>
                                    {/* Display current_entry_price or fallback to price_per if current_entry_price is null */}
                                    <p>Price per (at entry): ${parseFloat(currency.current_entry_price || currency.price_per).toFixed(8)}</p>
                                    <p>Amount owned: {parseFloat(currency.amount_owned).toFixed(8)}</p>
                                    <p>Current Price: ${currency.current_price ? parseFloat(currency.current_price).toFixed(8) : 'N/A'}</p>
                                    <p>Total Value: ${currency.total_value ? parseFloat(currency.total_value).toFixed(2) : 'N/A'}</p>
                                    <p>Total Paid: ${currency.total_paid ? parseFloat(currency.total_paid).toFixed(2) : 'N/A'}</p>
                                    <p className={currency.profits_losses >= 0 ? 'profit' : 'loss'}>
                                        Profits/Losses: ${currency.profits_losses ? parseFloat(currency.profits_losses).toFixed(2) : 'N/A'}
                                    </p>
                                    {currency.rank && <p>Rank: {currency.rank}</p>}
                                    {currency.percent_change_1h && <p>1HR Change: {parseFloat(currency.percent_change_1h).toFixed(2)}%</p>}
                                    {currency.percent_change_24h && <p>24HR Change: {parseFloat(currency.percent_change_24h).toFixed(2)}%</p>}
                                    {currency.percent_change_7d && <p>7D Change: {parseFloat(currency.percent_change_7d).toFixed(2)}%</p>}

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