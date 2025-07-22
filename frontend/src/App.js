import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { BrowserRouter as Router, Routes, Route, Link, useNavigate } from 'react-router-dom';

// Import your components
import AccountSettings from './AccountSettings';
import ForgotPasswordRequest from './ForgotPasswordRequest';
import PasswordResetConfirm from './PasswordResetConfirm';
import Portfolios from './Portfolios';
import Currencies from './Currencies';
import CreateCurrency from './CreateCurrency';
import AllCurrenciesList from './AllCurrenciesList';
import PortfolioDashboard from './PortfolioDashboard';
import CreateStock from './CreateStock';
import CryptoStockSearch from './CryptoStockSearch'; // NEW IMPORT: Import CryptoStockSearch

import './App.css';

const AUTH_API_BASE_URL = "http://127.0.0.1:8000/api";

function App() {
  return (
    <Router>
      <AppContent />
    </Router>
  );
}

function AppContent() {
  const [isAuthenticated, setIsAuthenticated] = useState(!!localStorage.getItem('accessToken'));
  const [username, setUsername] = useState(localStorage.getItem('username') || '');
  const [message, setMessage] = useState('');

  const [registerUsername, setRegisterUsername] = useState('');
  const [registerPassword, setRegisterPassword] = useState('');
  const [registerEmail, setRegisterEmail] = useState('');

  const [loginUsername, setLoginUsername] = useState('');
  const [loginPassword, setLoginPassword] = useState('');

  const navigate = useNavigate();

  useEffect(() => {
    // Check token validity on mount or when isAuthenticated changes
    // This useEffect can be expanded later for token refresh logic if needed
  }, [isAuthenticated]);

  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      const response = await axios.post(`${AUTH_API_BASE_URL}/login/`, {
        username: loginUsername,
        password: loginPassword,
      });
      localStorage.setItem('accessToken', response.data.access);
      localStorage.setItem('refreshToken', response.data.refresh);
      localStorage.setItem('username', response.data.username);
      setIsAuthenticated(true);
      setUsername(response.data.username);
      setMessage('Login successful!');
      setLoginUsername('');
      setLoginPassword('');
      navigate('/');
    } catch (error) {
      console.error("Login error:", error.response || error);
      setMessage('Login failed. Please check your credentials.');
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    try {
      await axios.post(`${AUTH_API_BASE_URL}/users/`, {
        username: registerUsername,
        password: registerPassword,
        re_password: registerPassword, // Ensure backend expects re_password if not using Djoser's default user
        email: registerEmail,
      });

      // Automatically log in after successful registration
      const loginResponse = await axios.post(`${AUTH_API_BASE_URL}/login/`, {
        username: registerUsername,
        password: registerPassword,
      });

      localStorage.setItem('accessToken', loginResponse.data.access);
      localStorage.setItem('refreshToken', loginResponse.data.refresh);
      localStorage.setItem('username', loginResponse.data.username);
      setIsAuthenticated(true);
      setUsername(loginResponse.data.username);
      setMessage('Registration successful and logged in!');
      setRegisterUsername('');
      setRegisterPassword('');
      setRegisterEmail('');
      navigate('/');

    } catch (error) {
      console.error("Registration error:", error.response?.data || error);
      const errorMsg = error.response?.data?.username?.[0] ||
                       error.response?.data?.password?.[0] ||
                       error.response?.data?.re_password?.[0] ||
                       error.response?.data?.email?.[0] ||
                       error.response?.data?.non_field_errors?.[0] ||
                       error.response?.data?.detail ||
                       'Registration failed.';
      setMessage(errorMsg);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('username');
    setIsAuthenticated(false);
    setUsername('');
    setMessage('Logged out successfully.');
    navigate('/login');
  };

  return (
    <Routes>
      
      <Route path="/" element={
        <CommonContent
          isAuthenticated={isAuthenticated}
          username={username}
          message={message}
          registerUsername={registerUsername}
          setRegisterUsername={setRegisterUsername}
          registerPassword={registerPassword}
          setRegisterPassword={setRegisterPassword}
          registerEmail={registerEmail}
          setRegisterEmail={setRegisterEmail}
          loginUsername={loginUsername}
          setLoginUsername={setLoginUsername}
          loginPassword={loginPassword}
          setLoginPassword={setLoginPassword}
          handleRegister={handleRegister}
          handleLogin={handleLogin}
          handleLogout={handleLogout}
        />
      } />
      <Route path="/login" element={
        <CommonContent
          isAuthenticated={isAuthenticated}
          username={username}
          message={message}
          registerUsername={registerUsername}
          setRegisterUsername={setRegisterUsername}
          registerPassword={registerPassword}
          setRegisterPassword={setRegisterPassword}
          registerEmail={registerEmail}
          setRegisterEmail={setRegisterEmail}
          loginUsername={loginUsername}
          setLoginUsername={setLoginUsername}
          loginPassword={loginPassword}
          setLoginPassword={setLoginPassword}
          handleRegister={handleRegister}
          handleLogin={handleLogin}
          handleLogout={handleLogout}
        />
      } />
      <Route
        path="/portfolios"
        element={isAuthenticated ? <Portfolios apiBaseUrl={AUTH_API_BASE_URL} /> : <CommonContent
          isAuthenticated={isAuthenticated}
          username={username}
          message={message}
          registerUsername={registerUsername}
          setRegisterUsername={setRegisterUsername}
          registerPassword={registerPassword}
          setRegisterPassword={setRegisterPassword}
          registerEmail={registerEmail}
          setRegisterEmail={setRegisterEmail}
          loginUsername={loginUsername}
          setLoginUsername={loginUsername}
          loginPassword={loginPassword}
          setLoginPassword={loginPassword}
          handleRegister={handleRegister}
          handleLogin={handleLogin}
          handleLogout={handleLogout}
        />}
      />
      {/* Updated route for Currencies to include portfolioId */}
      <Route
        path="/currencies/:portfolioId"
        element={isAuthenticated ? <Currencies apiBaseUrl={AUTH_API_BASE_URL} /> : <CommonContent
          isAuthenticated={isAuthenticated}
          username={username}
          message={message}
          registerUsername={registerUsername}
          setRegisterUsername={setRegisterUsername}
          registerPassword={registerPassword}
          setRegisterPassword={setRegisterPassword}
          registerEmail={registerEmail}
          setRegisterEmail={setRegisterEmail}
          loginUsername={loginUsername}
          setLoginUsername={loginUsername}
          loginPassword={loginPassword}
          setLoginPassword={loginPassword}
          handleRegister={handleRegister}
          handleLogin={handleLogin}
          handleLogout={handleLogout}
        />}
      />
      <Route
        path="/currencies" // This is the path for the All Currencies List page
        element={isAuthenticated ? <AllCurrenciesList apiBaseUrl={AUTH_API_BASE_URL} /> : <CommonContent
            isAuthenticated={isAuthenticated}
            username={username}
            message={message}
            registerUsername={registerUsername}
            setRegisterUsername={setRegisterUsername}
            registerPassword={registerPassword}
            setRegisterPassword={setRegisterPassword}
            registerEmail={registerEmail}
            setRegisterEmail={setRegisterEmail}
            loginUsername={loginUsername}
            setLoginUsername={loginUsername}
            loginPassword={loginPassword}
            setLoginPassword={loginPassword}
            handleRegister={handleRegister}
            handleLogin={handleLogin}
            handleLogout={handleLogout}
        />}
      />
      {/* Route for creating new currency */}
      <Route
        path="/currencies/new"
        element={isAuthenticated ? <CreateCurrency apiBaseUrl={AUTH_API_BASE_URL} /> : <CommonContent
          isAuthenticated={isAuthenticated}
          username={username}
          message={message}
          registerUsername={registerUsername}
          setRegisterUsername={setRegisterUsername}
          registerPassword={registerPassword}
          setRegisterPassword={setRegisterPassword}
          registerEmail={registerEmail}
          setRegisterEmail={setRegisterEmail}
          loginUsername={loginUsername}
          setLoginUsername={loginUsername}
          loginPassword={loginPassword}
          setLoginPassword={loginPassword}
          handleRegister={handleRegister}
          handleLogin={handleLogin}
          handleLogout={handleLogout}
        />}
      />

      <Route
        path="/portfolio-dashboard" // Route for the dashboard
        element={isAuthenticated ? <PortfolioDashboard apiBaseUrl={AUTH_API_BASE_URL} /> : <CommonContent
          isAuthenticated={isAuthenticated}
          username={username}
          message={message}
          registerUsername={registerUsername}
          setRegisterUsername={setRegisterUsername}
          registerPassword={registerPassword}
          setRegisterPassword={setRegisterPassword}
          registerEmail={registerEmail}
          setRegisterEmail={setRegisterEmail}
          loginUsername={loginUsername}
          setLoginUsername={loginUsername}
          loginPassword={loginPassword}
          setLoginPassword={loginPassword}
          handleRegister={handleRegister}
          handleLogin={handleLogin}
          handleLogout={handleLogout}
        />}
      />

      {/* Route for creating new stock */}
      <Route
        path="/stocks/new"
        element={isAuthenticated ? <CreateStock apiBaseUrl={AUTH_API_BASE_URL} /> : <CommonContent
          isAuthenticated={isAuthenticated}
          username={username}
          message={message}
          registerUsername={registerUsername}
          setRegisterUsername={setRegisterUsername}
          registerPassword={registerPassword}
          setRegisterPassword={setRegisterPassword}
          registerEmail={registerEmail}
          setRegisterEmail={setRegisterEmail}
          loginUsername={loginUsername}
          setLoginUsername={loginUsername}
          loginPassword={loginPassword}
          setLoginPassword={loginPassword}
          handleRegister={handleRegister}
          handleLogin={handleLogin}
          handleLogout={handleLogout}
        />}
      />

      {/* NEW ROUTE: Route for Crypto/Stock Search */}
      <Route
        path="/search"
        element={isAuthenticated ? <CryptoStockSearch apiBaseUrl={AUTH_API_BASE_URL} /> : <CommonContent
          isAuthenticated={isAuthenticated}
          username={username}
          message={message}
          registerUsername={registerUsername}
          setRegisterUsername={setRegisterUsername}
          registerPassword={registerPassword}
          setRegisterPassword={setRegisterPassword}
          registerEmail={registerEmail}
          setRegisterEmail={setRegisterEmail}
          loginUsername={loginUsername}
          setLoginUsername={loginUsername}
          loginPassword={loginPassword}
          setLoginPassword={loginPassword}
          handleRegister={handleRegister}
          handleLogin={handleLogin}
          handleLogout={handleLogout}
        />}
      />

      <Route path="/settings" element={isAuthenticated ? <AccountSettings apiBaseUrl="http://127.0.0.1:8000/api" /> : <CommonContent
          isAuthenticated={isAuthenticated}
          username={username}
          message={message}
          registerUsername={registerUsername}
          setRegisterUsername={setRegisterUsername}
          registerPassword={registerPassword}
          setRegisterPassword={setRegisterPassword}
          registerEmail={registerEmail}
          setRegisterEmail={setRegisterEmail}
          loginUsername={loginUsername}
          setLoginUsername={loginUsername}
          loginPassword={loginPassword}
          setLoginPassword={loginPassword}
          handleRegister={handleRegister}
          handleLogin={handleLogin}
          handleLogout={handleLogout}
        />} />
      <Route path="/forgot-password" element={<ForgotPasswordRequest apiBaseUrl="http://127.0.0.1:8000" />} />
      <Route path="/reset-password-confirm/:uid/:token" element={<PasswordResetConfirm apiBaseUrl="http://127.0.0.1:8000" />} />
    </Routes>
  );
}

// CommonContent is now a separate, top-level functional component
function CommonContent({
  isAuthenticated,
  username,
  message,
  registerUsername,
  setRegisterUsername,
  registerPassword,
  setRegisterPassword,
  registerEmail,
  setRegisterEmail,
  loginUsername,
  setLoginUsername,
  loginPassword,
  setLoginPassword,
  handleRegister,
  handleLogin,
  handleLogout,
}) {
  return (
    <div className="App">
      <h1>User Portal</h1>
      {message && <p className={message.includes('failed') || message.includes('error') ? 'error-message' : 'success-message'}>{message}</p>}

      {isAuthenticated ? (
        <>
          <p>Welcome, {username}!</p>
          <nav>
            <Link to="/settings">Account Settings</Link>
            <Link to="/portfolios">Your Portfolios</Link>
            <Link to="/portfolio-dashboard">View Portfolio Dashboard</Link>
            <Link to="/currencies">All Currencies List</Link>
            <Link to="/search">Search Crypto/Stock</Link> {/* NEW: Link to search page */}
            <button onClick={handleLogout}>Logout</button>
          </nav>
          <p>This is your main dashboard content. You can add more features here.</p>
        </>
      ) : (
        <>
          <h2>Register</h2>
          <form onSubmit={handleRegister}>
            <input
              type="text"
              placeholder="Username"
              value={registerUsername}
              onChange={(e) => setRegisterUsername(e.target.value)}
              required
            />
            <input
              type="email"
              placeholder="Email"
              value={registerEmail}
              onChange={(e) => setRegisterEmail(e.target.value)}
              required
            />
            <input
              type="password"
              placeholder="Password"
              value={registerPassword}
              onChange={(e) => setRegisterPassword(e.target.value)}
              required
            />
            <button type="submit">Register</button>
          </form>

          <h2>Login</h2>
          <form onSubmit={handleLogin}>
            <input
              type="text"
              placeholder="Username"
              value={loginUsername}
              onChange={(e) => setLoginUsername(e.target.value)}
              required
            />
            <input
              type="password"
              placeholder="Password"
              value={loginPassword}
              onChange={(e) => setLoginPassword(e.target.value)}
              required
            />
            <button type="submit">Login</button>
          </form>
        
          <div>
              <Link to="/forgot-password">Forgot Password?</Link>
          </div>
        </>
      )}
    </div>
  );
}

export default App;
