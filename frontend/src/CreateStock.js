import React, { useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

function CreateStock({ apiBaseUrl }) {
    const [name, setName] = useState('');
    const [symbol, setSymbol] = useState('');
    const [costPerShare, setCostPerShare] = useState('');
    const [sharesOwned, setSharesOwned] = useState('');
    const [portfolioId, setPortfolioId] = useState(''); // To select which portfolio it belongs to
    const [portfolios, setPortfolios] = useState([]); // To populate the portfolio dropdown
    const [message, setMessage] = useState('');
    const navigate = useNavigate();

    // Fetch portfolios when the component mounts
    React.useEffect(() => {
        const fetchPortfolios = async () => {
            try {
                const accessToken = localStorage.getItem('accessToken');
                if (!accessToken) {
                    setMessage('You need to be logged in to add a stock.');
                    navigate('/login');
                    return;
                }
                const response = await axios.get(`${apiBaseUrl}/portfolios/`, {
                    headers: { 'Authorization': `Bearer ${accessToken}` }
                });
                // Filter for 'Stocks' portfolio or other relevant types if needed
                const stockPortfolios = response.data.filter(p => p.name.toLowerCase() === 'stocks');
                setPortfolios(stockPortfolios);
                // Automatically select the first 'Stocks' portfolio if available
                if (stockPortfolios.length > 0) {
                    setPortfolioId(stockPortfolios[0].id);
                } else {
                    setMessage('No "Stocks" portfolio found. Please create one first.');
                }
            } catch (error) {
                console.error("Error fetching portfolios:", error.response?.data || error);
                setMessage('Failed to load portfolios.');
            }
        };
        fetchPortfolios();
    }, [apiBaseUrl, navigate]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setMessage('');

        if (!name || !symbol || !costPerShare || !sharesOwned || !portfolioId) {
            setMessage('All fields are required.');
            return;
        }

        if (isNaN(parseFloat(costPerShare)) || parseFloat(costPerShare) <= 0) {
            setMessage('Cost per share must be a positive number.');
            return;
        }

        if (isNaN(parseFloat(sharesOwned)) || parseFloat(sharesOwned) <= 0) {
            setMessage('Shares owned must be a positive number.');
            return;
        }

        try {
            const accessToken = localStorage.getItem('accessToken');
            if (!accessToken) {
                navigate('/login');
                return;
            }

            const payload = {
                name: name,
                symbol: symbol.toUpperCase(), // Ensure symbol is uppercase for consistency
                cost_per_share: parseFloat(costPerShare),
                shares_owned: parseFloat(sharesOwned),
                portfolio: portfolioId,
            };

            const response = await axios.post(`${apiBaseUrl}/stocks/`, payload, {
                headers: { 'Authorization': `Bearer ${accessToken}` }
            });

            setMessage(`Stock "${response.data.name}" added successfully!`);
            // Clear form fields
            setName('');
            setSymbol('');
            setCostPerShare('');
            setSharesOwned('');
            // Optionally navigate back to dashboard or stocks list
            setTimeout(() => {
                navigate('/dashboard'); // Navigate to dashboard after success
            }, 2000);

        } catch (error) {
            console.error("Error adding stock:", error.response?.data || error);
            const errorMsg = error.response?.data?.symbol?.[0] ||
                             error.response?.data?.non_field_errors?.[0] ||
                             error.response?.data?.detail ||
                             'Failed to add stock.';
            setMessage(errorMsg);
        }
    };

    const handleBack = () => {
        navigate('/dashboard'); // Navigate back to the dashboard
    };

    return (
        <div className="App">
            <h1>Add New Stock</h1>
            {message && <p className={message.includes('failed') || message.includes('error') ? 'error-message' : 'success-message'}>{message}</p>}
            
            <form onSubmit={handleSubmit}>
                <div>
                    <label>Stock Name:</label>
                    <input
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        required
                    />
                </div>
                <div>
                    <label>Stock Symbol:</label>
                    <input
                        type="text"
                        value={symbol}
                        onChange={(e) => setSymbol(e.target.value)}
                        required
                    />
                </div>
                <div>
                    <label>Cost per Share:</label>
                    <input
                        type="number"
                        step="0.01"
                        value={costPerShare}
                        onChange={(e) => setCostPerShare(e.target.value)}
                        required
                    />
                </div>
                <div>
                    <label>Shares Owned:</label>
                    <input
                        type="number"
                        step="0.0001"
                        value={sharesOwned}
                        onChange={(e) => setSharesOwned(e.target.value)}
                        required
                    />
                </div>
                <div>
                    <label>Portfolio:</label>
                    <select
                        value={portfolioId}
                        onChange={(e) => setPortfolioId(e.target.value)}
                        required
                    >
                        {portfolios.length === 0 ? (
                            <option value="">Loading portfolios...</option>
                        ) : (
                            <>
                                <option value="">Select a portfolio</option>
                                {portfolios.map(p => (
                                    <option key={p.id} value={p.id}>{p.name}</option>
                                ))}
                            </>
                        )}
                    </select>
                </div>
                <button type="submit">Add Stock</button>
            </form>
            <hr />
            <button onClick={handleBack}>Back to Dashboard</button>
        </div>
    );
}

export default CreateStock;