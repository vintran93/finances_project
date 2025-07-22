import React, { useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

const ForgotPasswordRequest = ({ apiBaseUrl }) => {
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage('');
    try {
      const response = await axios.post(`${apiBaseUrl}/auth/users/reset_password/`, { email });
      setMessage('If an account with that email exists, a password reset email has been sent.');
      setEmail('');
    } catch (error) {
      console.error('Password reset request error:', error.response || error);
      setMessage(error.response?.data?.email?.[0] || 'Failed to send password reset email. Please try again.');
    }
  };

  return (
    <div className="form-container">
      <h2>Forgot Password</h2>
      <p>Enter your email address and we'll send you a link to reset your password.</p>
      <form onSubmit={handleSubmit}>
        <div>
          <label>Email:</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>
        <button type="submit">Send Reset Email</button>
      </form>
      {message && <p className="message">{message}</p>}
      <button onClick={() => navigate('/')}>Back to Login</button>
    </div>
  );
};

export default ForgotPasswordRequest;