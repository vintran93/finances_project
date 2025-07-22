import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate, Link } from 'react-router-dom'; // Ensure Link is imported

function Portfolios({ apiBaseUrl }) {
    const navigate = useNavigate();
    const [portfolios, setPortfolios] = useState([]);
    const [newPortfolioName, setNewPortfolioName] = useState('');
    const [message, setMessage] = useState('');
    const [portfolioBalances, setPortfolioBalances] = useState({});
    const [grandTotalBalance, setGrandTotalBalance] = useState('0.00'); // NEW STATE

    useEffect(() => {
        fetchPortfolios();
    }, []);

    const fetchPortfolios = async () => {
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
            setPortfolios(response.data);
            setMessage('');

            fetchPortfolioBalances(response.data);

        } catch (error) {
            console.error("Error fetching portfolios:", error.response?.data || error);
            setMessage('Failed to load portfolios.');
            if (error.response?.status === 401) {
                navigate('/login');
            }
        }
    };

    const fetchPortfolioBalances = async (portfoliosData) => {
        const balances = {};
        let totalSum = 0; // Initialize sum for grand total
        const accessToken = localStorage.getItem('accessToken');
        if (!accessToken) return;

        for (const portfolio of portfoliosData) {
            try {
                const currenciesResponse = await axios.get(`${apiBaseUrl}/portfolios/${portfolio.id}/currencies/`, {
                    headers: {
                        'Authorization': `Bearer ${accessToken}`
                    }
                });
                const portfolioTotal = currenciesResponse.data.reduce((sum, currency) => {
                    const price = parseFloat(currency.price_per);
                    const amount = parseFloat(currency.amount_owned);
                    if (!isNaN(price) && !isNaN(amount)) {
                        return sum + (price * amount);
                    }
                    return sum;
                }, 0); // Keep as number for calculation
                
                balances[portfolio.id] = portfolioTotal.toFixed(2); // Store formatted for display
                totalSum += portfolioTotal; // Add to grand total
            } catch (error) {
                console.error(`Error fetching currencies for portfolio ${portfolio.name}:`, error.response?.data || error);
                balances[portfolio.id] = '0.00';
            }
        }
        setPortfolioBalances(balances);
        setGrandTotalBalance(totalSum.toFixed(2)); // Set the grand total
    };

    const handleCreatePortfolio = async (e) => {
        e.preventDefault();
        setMessage('');
        if (!newPortfolioName) {
            setMessage('Portfolio name cannot be empty.');
            return;
        }

        try {
            const accessToken = localStorage.getItem('accessToken');
            if (!accessToken) {
                setMessage('You need to be logged in to create a portfolio.');
                navigate('/login');
                return;
            }
            await axios.post(`${apiBaseUrl}/portfolios/`, { name: newPortfolioName }, {
                headers: {
                    'Authorization': `Bearer ${accessToken}`
                }
            });
            setNewPortfolioName('');
            setMessage('Portfolio created successfully!');
            fetchPortfolios(); // Re-fetch portfolios to update the list and totals
        } catch (error) {
            console.error("Error creating portfolio:", error.response?.data || error);
            const errorMsg = error.response?.data?.name?.[0] || error.response?.data?.detail || 'Failed to create portfolio.';
            setMessage(errorMsg);
            if (error.response?.status === 401) {
                navigate('/login');
            }
        }
    };

    const handleDeletePortfolio = async (portfolioId, portfolioName) => {
        if (window.confirm(`Are you sure you want to delete the portfolio "${portfolioName}"? This will also delete all currencies within it.`)) {
            try {
                const accessToken = localStorage.getItem('accessToken');
                if (!accessToken) {
                    setMessage('You need to be logged in to delete a portfolio.');
                    navigate('/login');
                    return;
                }
                await axios.delete(`${apiBaseUrl}/portfolios/${portfolioId}/`, {
                    headers: {
                        'Authorization': `Bearer ${accessToken}`
                    }
                });
                setMessage(`Portfolio "${portfolioName}" deleted successfully!`);
                fetchPortfolios(); // Re-fetch portfolios to update the list and totals
            } catch (error) {
                console.error("Error deleting portfolio:", error.response?.data || error);
                const errorMsg = error.response?.data?.detail || 'Failed to delete portfolio.';
                setMessage(errorMsg);
                if (error.response?.status === 401) {
                    navigate('/login');
                }
            }
        }
    };

    const handlePortfolioClick = (portfolioId) => {
        navigate(`/currencies/${portfolioId}`);
    };

    const handleBackToPortal = () => {
        navigate('/');
    };

    return (
        <div className="App">
            <h1>Your Portfolios</h1>
            {message && <p className={message.includes('failed') || message.includes('error') ? 'error-message' : 'success-message'}>{message}</p>}

            <div className="create-portfolio-section">
                <h2>Create New Portfolio</h2>
                <form onSubmit={handleCreatePortfolio}>
                    <input
                        type="text"
                        placeholder="Portfolio Name"
                        value={newPortfolioName}
                        onChange={(e) => setNewPortfolioName(e.target.value)}
                        required
                    />
                    <button type="submit">Create Portfolio</button>
                </form>
            </div>

            <div className="existing-portfolios-section">
                <h2>Your Existing Portfolios</h2>
                {portfolios.length === 0 ? (
                    <p>No portfolios found. Create one above!</p>
                ) : (
                    <>
                        <ul className="portfolio-list">
                            {portfolios.map(portfolio => (
                                <li key={portfolio.id} className="portfolio-item">
                                    <span className="portfolio-name-link" onClick={() => handlePortfolioClick(portfolio.id)}>
                                        {portfolio.name}
                                    </span>
                                    {portfolioBalances[portfolio.id] !== undefined ? (
                                        <span className="portfolio-total-balance">
                                            Total: ${portfolioBalances[portfolio.id]}
                                        </span>
                                    ) : (
                                        <span className="portfolio-loading">Loading...</span>
                                    )}
                                    <button
                                        className="delete-portfolio-button"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            handleDeletePortfolio(portfolio.id, portfolio.name);
                                        }}
                                    >
                                        X
                                    </button>
                                </li>
                            ))}
                        </ul>
                        {/* NEW: Grand Total Display with All Currencies Link INSIDE */}
                        <div className="grand-total-display">
                            <h3>Total Across All Portfolios: ${grandTotalBalance}</h3>
                            
                        </div>
                        
                    </>
                    
                )}
            </div>

                <Link to="/currencies" className="all-currencies-link">
                                View All Currencies
                </Link>
            <hr />
            
            <button onClick={handleBackToPortal}>Back to Portal</button>
        </div>
    );
}

export default Portfolios;