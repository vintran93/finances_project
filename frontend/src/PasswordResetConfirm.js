// src/PasswordResetConfirm.js
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useParams, useNavigate } from 'react-router-dom';

const PasswordResetConfirm = ({ apiBaseUrl }) => {
  const { uid, token } = useParams(); // Get uid and token from URL
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [isValidToken, setIsValidToken] = useState(false);

  const navigate = useNavigate();

  useEffect(() => {
    const verifyToken = async () => {
      try {
        // Djoser has a endpoint to verify token validity before showing the form
        await axios.post(`${apiBaseUrl}/auth/users/reset_password_confirm/`, {
          uid: uid,
          token: token,
          new_password: 'testpassword123', // Dummy password to just check token validity
          re_new_password: 'testpassword123',
        });
        setIsValidToken(true);
      } catch (error) {
        console.error("Token verification failed:", error.response || error);
        setMessage("Invalid or expired password reset link. Please try requesting a new one.");
        setIsValidToken(false);
      } finally {
        setLoading(false);
      }
    };

    if (uid && token) {
      verifyToken();
    } else {
      setMessage("Missing UID or Token in URL.");
      setLoading(false);
    }
  }, [uid, token, apiBaseUrl]);


  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage('');

    if (newPassword !== confirmNewPassword) {
      setMessage('New passwords do not match.');
      return;
    }

    try {
      const response = await axios.post(`${apiBaseUrl}/auth/users/reset_password_confirm/`, {
        uid: uid,
        token: token,
        new_password: newPassword,
        re_new_password: confirmNewPassword, // Djoser expects re_new_password for confirmation
      });
      setMessage('Your password has been reset successfully. You can now log in.');
      setNewPassword('');
      setConfirmNewPassword('');
      // Optionally redirect to login page after a delay
      setTimeout(() => {
        navigate('/');
      }, 3000);
    } catch (error) {
      console.error('Password reset confirm error:', error.response || error);
      setMessage(error.response?.data?.new_password?.[0] ||
                 error.response?.data?.detail ||
                 'Failed to reset password. Please check the link or try again.');
    }
  };

  if (loading) {
    return <div className="form-container">Loading...</div>;
  }

  if (!isValidToken) {
    return <div className="form-container">{message}</div>;
  }

  return (
    <div className="form-container">
      <h2>Set New Password</h2>
      <form onSubmit={handleSubmit}>
        <div>
          <label>New Password:</label>
          <input
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            required
            minLength="8"
          />
        </div>
        <div>
          <label>Confirm New Password:</label>
          <input
            type="password"
            value={confirmNewPassword}
            onChange={(e) => setConfirmNewPassword(e.target.value)}
            required
          />
        </div>
        <button type="submit">Reset Password</button>
      </form>
      {message && <p className="message">{message}</p>}
    </div>
  );
};

export default PasswordResetConfirm;