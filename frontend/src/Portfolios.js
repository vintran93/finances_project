import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { useNavigate, Link } from 'react-router-dom'; // Import Link

function Portfolios({ apiBaseUrl }) {
    const navigate = useNavigate();
    const [portfolios, setPortfolios] = useState([]);
    const [portfolioValues, setPortfolioValues] = useState({}); // Store portfolio total values
    const [message, setMessage] = useState('');
    const [newPortfolioName, setNewPortfolioName] = useState('');
    const [editingPortfolio, setEditingPortfolio] = useState(null);
    const [editPortfolioName, setEditPortfolioName] = useState('');
    const [loading, setLoading] = useState(true);

    // Fetch portfolio total value
    const fetchPortfolioValue = useCallback(async (portfolioId) => {
        try {
            const accessToken = localStorage.getItem('accessToken');
            if (!accessToken) return 0;

            // Attempt to get total from a dedicated backend endpoint first (if it exists)
            // If this endpoint doesn't exist or returns an error, it will fall back
            // to calculating from currencies.
            const response = await axios.get(`${apiBaseUrl}/portfolios/${portfolioId}/total/`, {
                headers: {
                    'Authorization': `Bearer ${accessToken}`
                }
            });
            return response.data.total_value || 0;
        } catch (error) {
            console.error(`Error fetching portfolio ${portfolioId} value from /total/ endpoint:`, error);
            // Fallback to calculating from currencies if the /total/ endpoint fails
            return await calculatePortfolioValueFromCurrencies(portfolioId);
        }
    }, [apiBaseUrl]);

    // Alternative: Calculate portfolio value from currencies if no direct endpoint
    const calculatePortfolioValueFromCurrencies = useCallback(async (portfolioId) => {
        try {
            const accessToken = localStorage.getItem('accessToken');
            if (!accessToken) return 0;

            const response = await axios.get(`${apiBaseUrl}/portfolios/${portfolioId}/currencies/`, {
                headers: {
                    'Authorization': `Bearer ${accessToken}`
                }
            });
            
            const currencies = response.data;
            let total = 0;
            
            currencies.forEach(currency => {
                // IMPORTANT FIX: Use correct property names from backend
                // `current_price` is the real-time fetched price
                // `current_entry_price` is the price at time of entry (nullable)
                // `price_per` is the purchase price (always present)
                const priceToUse = parseFloat(currency.current_price || currency.current_entry_price || currency.price_per);
                const amount = parseFloat(currency.amount_owned); // Correct property name
                
                if (!isNaN(priceToUse) && !isNaN(amount)) {
                    total += (priceToUse * amount);
                }
            });
            
            return total;
        } catch (error) {
            console.error(`Error calculating portfolio ${portfolioId} value from currencies:`, error.response?.data || error);
            return 0;
        }
    }, [apiBaseUrl]);

    // Fetch portfolios and their values
    const fetchPortfolios = useCallback(async () => {
        setLoading(true);
        try {
            const accessToken = localStorage.getItem('accessToken');
            if (!accessToken) {
                setMessage('You need to be logged in to view portfolios.');
                navigate('/login');
                return;
            }

            const response = await axios.get(`${apiBaseUrl}/portfolios/`, {
                headers: {
                    'Authorization': `Bearer ${accessToken}`
                }
            });
            
            const portfolioData = response.data;
            setPortfolios(portfolioData);
            
            // Fetch values for each portfolio
            const values = {};
            await Promise.all(
                portfolioData.map(async (portfolio) => {
                    const value = await fetchPortfolioValue(portfolio.id);
                    values[portfolio.id] = value;
                })
            );
            
            setPortfolioValues(values);
            setMessage('');
        } catch (error) {
            console.error("Error fetching portfolios:", error.response?.data || error);
            setMessage('Failed to load portfolios.');
            if (error.response?.status === 401) {
                navigate('/login');
            }
        } finally {
            setLoading(false);
        }
    }, [apiBaseUrl, navigate, fetchPortfolioValue]);

    useEffect(() => {
        fetchPortfolios();
    }, [fetchPortfolios]);

    const handleCreatePortfolio = async (e) => {
        e.preventDefault();
        setMessage('');
        if (!newPortfolioName.trim()) {
            setMessage('Portfolio name cannot be empty.');
            return;
        }

        try {
            const accessToken = localStorage.getItem('accessToken');
            if (!accessToken) {
                setMessage('You need to be logged in to create portfolios.');
                navigate('/login');
                return;
            }

            await axios.post(`${apiBaseUrl}/portfolios/`,
                { name: newPortfolioName },
                {
                    headers: {
                        'Authorization': `Bearer ${accessToken}`
                    }
                }
            );
            setMessage(`Portfolio "${newPortfolioName}" created successfully!`);
            setNewPortfolioName('');
            fetchPortfolios(); // Refresh the list of portfolios
        } catch (error) {
            console.error("Error creating portfolio:", error.response?.data || error);
            const errorMsg = error.response?.data?.name?.[0] || error.response?.data?.detail || 'Failed to create portfolio.';
            setMessage(errorMsg);
            if (error.response?.status === 401) {
                navigate('/login');
            }
        }
    };

    const handleEditClick = (portfolio) => {
        setEditingPortfolio(portfolio);
        setEditPortfolioName(portfolio.name);
    };

    const handleCancelEdit = () => {
        setEditingPortfolio(null);
        setEditPortfolioName('');
        setMessage('');
    };

    const handleSaveEdit = async (e) => {
        e.preventDefault();
        setMessage('');
        if (!editingPortfolio) return;

        if (!editPortfolioName.trim()) {
            setMessage('Portfolio name cannot be empty.');
            return;
        }

        try {
            const accessToken = localStorage.getItem('accessToken');
            if (!accessToken) {
                setMessage('You need to be logged in to edit portfolios.');
                navigate('/login');
                return;
            }

            await axios.patch(`${apiBaseUrl}/portfolios/${editingPortfolio.id}/`,
                { name: editPortfolioName },
                {
                    headers: {
                        'Authorization': `Bearer ${accessToken}`
                    }
                }
            );
            setMessage(`Portfolio "${editPortfolioName}" updated successfully!`);
            setEditingPortfolio(null);
            fetchPortfolios(); // Refresh the list
        } catch (error) {
            console.error("Error updating portfolio:", error.response?.data || error);
            const errorMsg = error.response?.data?.name?.[0] || error.response?.data?.detail || 'Failed to update portfolio.';
            setMessage(errorMsg);
            if (error.response?.status === 401) {
                navigate('/login');
            }
        }
    };

    const handleDeleteClick = async (portfolioId, portfolioName) => {
        if (!window.confirm(`Are you sure you want to delete "${portfolioName}" and all its contents?`)) {
            return;
        }
        setMessage('');

        try {
            const accessToken = localStorage.getItem('accessToken');
            if (!accessToken) {
                setMessage('You need to be logged in to delete portfolios.');
                navigate('/login');
                return;
            }

            await axios.delete(`${apiBaseUrl}/portfolios/${portfolioId}/`, {
                headers: {
                    'Authorization': `Bearer ${accessToken}`
                }
            });

            setMessage(`Portfolio "${portfolioName}" deleted successfully!`);
            setPortfolios(portfolios.filter(p => p.id !== portfolioId));
            
            // Remove from portfolio values
            const newValues = { ...portfolioValues };
            delete newValues[portfolioId];
            setPortfolioValues(newValues);
        } catch (error) {
            console.error("Error deleting portfolio:", error.response?.data || error);
            const errorMsg = error.response?.data?.detail || 'Failed to delete portfolio.';
            setMessage(errorMsg);
            if (error.response?.status === 401) {
                navigate('/login');
            }
        }
    };

    const handleViewCurrencies = (portfolioId) => {
        navigate(`/currencies/${portfolioId}`);
    };

    const handleBackToPortal = () => {
        navigate('/');
    };

    const handleViewDashboard = () => { // NEW: Handler for viewing dashboard
        navigate('/portfolio-dashboard'); // Navigate to the dashboard route
    };

    // Calculate total across all portfolios
    const calculateGrandTotal = () => {
        return Object.values(portfolioValues).reduce((sum, value) => sum + value, 0);
    };

    // Format currency display
    const formatCurrency = (amount) => {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD',
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        }).format(amount);
    };

    if (loading) {
        return (
            <div className="App">
                <h1>Your Portfolios</h1>
                <p>Loading portfolios...</p>
            </div>
        );
    }

    return (
        <div className="App">
            <h1>Your Portfolios</h1>
            {message && <p className={message.includes('failed') || message.includes('error') ? 'error-message' : 'success-message'}>{message}</p>}

            <form onSubmit={handleCreatePortfolio} className="create-portfolio-form">
                <input
                    type="text"
                    placeholder="Portfolio Name"
                    value={newPortfolioName}
                    onChange={(e) => setNewPortfolioName(e.target.value)}
                    required
                />
                <button type="submit" className="action-button">Create Portfolio</button>
            </form>

            <div className="portfolio-list-section">
                <h2>Your Existing Portfolios</h2>
                {portfolios.length === 0 ? (
                    <p>No portfolios found. Create one above!</p>
                ) : (
                    <ul className="portfolio-list">
                        {portfolios.map(portfolio => (
                            <li key={portfolio.id} className="portfolio-item">
                                {editingPortfolio && editingPortfolio.id === portfolio.id ? (
                                    <form onSubmit={handleSaveEdit} className="edit-portfolio-form">
                                        <input
                                            type="text"
                                            value={editPortfolioName}
                                            onChange={(e) => setEditPortfolioName(e.target.value)}
                                            required
                                        />
                                        <div className="portfolio-actions">
                                            <button type="submit" className="action-button">Save</button>
                                            <button type="button" onClick={handleCancelEdit} className="back-button">Cancel</button>
                                        </div>
                                    </form>
                                ) : (
                                    <>
                                        <div className="portfolio-info">
                                            <strong>{portfolio.name}</strong>
                                            <span className="portfolio-total">
                                                Total: <span className="profit">{formatCurrency(portfolioValues[portfolio.id] || 0)}</span>
                                            </span>
                                        </div>
                                        <div className="portfolio-actions">
                                            <button 
                                                onClick={() => handleViewCurrencies(portfolio.id)}
                                                className="action-button"
                                            >
                                                View
                                            </button>
                                            <button 
                                                onClick={() => handleEditClick(portfolio)}
                                                className="edit-button"
                                            >
                                                Edit
                                            </button>
                                            <button 
                                                onClick={() => handleDeleteClick(portfolio.id, portfolio.name)}
                                                className="delete-button"
                                            >
                                                ×
                                            </button>
                                        </div>
                                    </>
                                )}
                            </li>
                        ))}
                    </ul>
                )}

                {portfolios.length > 0 && (
                    <div className="total-balance-display">
                        <strong>Total Across All Portfolios:</strong><br />
                        {formatCurrency(calculateGrandTotal())}
                    </div>
                )}
            </div>

            <hr />
            {/* Added the All Currencies List link here */}
            <Link to="/currencies" style={{ textDecoration: 'none' }}>
                <button className="action-button" style={{ width: '100%', marginBottom: '10px' }}>
                    View All Currencies
                </button>
            </Link>
            {/* NEW: Button to navigate to Dashboard */}
            <button onClick={handleViewDashboard} className="action-button" style={{ width: '100%', marginBottom: '10px' }}>
                View Dashboard
            </button>
            <button onClick={handleBackToPortal} className="back-button">Back to Portal</button>
        </div>
    );
}

export default Portfolios;
