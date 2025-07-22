import React, { useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom'; // For redirection

const AccountSettings = ({ apiBaseUrl }) => {
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [message, setMessage] = useState('');

  const navigate = useNavigate();

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    setMessage(''); // Clear previous messages

    if (newPassword !== confirmNewPassword) {
      setMessage('New passwords do not match.');
      return;
    }

    const token = localStorage.getItem('access_token');
    if (!token) {
      setMessage('You are not logged in. Please log in again.');
      navigate('/login'); // Redirect to login
      return;
    }

    try {
      const response = await axios.post(
        `${apiBaseUrl}/password-change/`, // Your Django endpoint
        {
          old_password: oldPassword,
          new_password: newPassword,
          confirm_new_password: confirmNewPassword,
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      setMessage(response.data.message || 'Password changed successfully!');
      // Clear fields on success
      setOldPassword('');
      setNewPassword('');
      setConfirmNewPassword('');

      // Optionally, force re-login for security (invalidate old token client-side)
      // localStorage.removeItem('access_token');
      // localStorage.removeItem('refresh_token');
      // navigate('/'); // Go back to login/home
      // setMessage('Password changed. Please log in with your new password.');

    } catch (error) {
      console.error('Password change error:', error.response || error);
      setMessage(error.response?.data?.old_password?.[0] || // Specific error for old password
                 error.response?.data?.new_password?.[0] || // Specific error for new password
                 error.response?.data?.confirm_new_password?.[0] || // Specific error for confirmation
                 error.response?.data?.detail || // DRF general detail error
                 'Failed to change password. Please check your inputs.');
    }
  };

  return (
    <div className="account-settings">
      <h2>Account Settings</h2>
      <form onSubmit={handlePasswordChange}>
        <h3>Change Password</h3>
        <div>
          <label>Old Password:</label>
          <input
            type="password"
            value={oldPassword}
            onChange={(e) => setOldPassword(e.target.value)}
            required
          />
        </div>
        <div>
          <label>New Password:</label>
          <input
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            required
            minLength="8" // Match backend validation
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
        <button type="submit">Change Password</button>
      </form>

      {message && <p className="message">{message}</p>}

      <hr />
      <button onClick={() => navigate('/')}>Back to Portal</button>
    </div>
  );
};

export default AccountSettings;