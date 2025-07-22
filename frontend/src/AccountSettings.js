import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

function AccountSettings({ apiBaseUrl }) {
    const [oldPassword, setOldPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmNewPassword, setConfirmNewPassword] = useState('');
    const [email, setEmail] = useState(''); // State for user's email
    const [currentPasswordForEmail, setCurrentPasswordForEmail] = useState(''); // State for current password when updating email
    const [message, setMessage] = useState('');
    const navigate = useNavigate();

    // Determine the base URL for Djoser authentication endpoints
    // Assumes apiBaseUrl is like 'http://127.0.0.1:8000/api' and Djoser is under '/auth/'
    const authApiBaseUrl = apiBaseUrl.replace('/api', '/auth');

    // Fetch user's current email on component mount
    useEffect(() => {
        const fetchUserData = async () => {
            try {
                const accessToken = localStorage.getItem('accessToken');
                if (!accessToken) {
                    setMessage('You need to be logged in to view your account settings.');
                    navigate('/login');
                    return;
                }
                // Use authApiBaseUrl for Djoser's /users/me/ endpoint
                const response = await axios.get(`${authApiBaseUrl}/users/me/`, {
                    headers: {
                        'Authorization': `Bearer ${accessToken}`
                    }
                });
                setEmail(response.data.email || ''); // Set email, default to empty string if null
            } catch (error) {
                console.error("Error fetching user data:", error.response?.data || error);
                setMessage('Failed to load user data.');
                if (error.response?.status === 401) {
                    navigate('/login');
                }
            }
        };
        fetchUserData();
    }, [authApiBaseUrl, navigate]); // Depend on authApiBaseUrl

    const handleChangePassword = async (e) => {
        e.preventDefault();
        setMessage('');

        if (newPassword !== confirmNewPassword) {
            setMessage('New password and confirmation do not match.');
            return;
        }

        try {
            const accessToken = localStorage.getItem('accessToken');
            if (!accessToken) {
                setMessage('You need to be logged in to change your password.');
                navigate('/login');
                return;
            }

            // Use authApiBaseUrl for Djoser's set_password endpoint
            await axios.post(`${authApiBaseUrl}/users/set_password/`, {
                current_password: oldPassword, // CHANGED: from old_password to current_password
                new_password: newPassword,
                re_new_password: confirmNewPassword,
            }, {
                headers: {
                    'Authorization': `Bearer ${accessToken}`
                }
            });
            setMessage('Password changed successfully!');
            setOldPassword('');
            setNewPassword('');
            setConfirmNewPassword('');
        } catch (error) {
            console.error("Password change error:", error.response?.data || error);
            const errorMsg = error.response?.data?.current_password?.[0] || // CHANGED: error message key
                             error.response?.data?.new_password?.[0] ||
                             error.response?.data?.non_field_errors?.[0] ||
                             error.response?.data?.detail ||
                             'Failed to change password.';
            setMessage(errorMsg);
            if (error.response?.status === 401) {
                navigate('/login');
            }
        }
    };

    // Function to handle updating the user's email
    const handleUpdateEmail = async (e) => {
        e.preventDefault();
        setMessage('');

        if (!email.trim()) {
            setMessage('Email cannot be empty.');
            return;
        }
        if (!currentPasswordForEmail.trim()) {
            setMessage('Current password is required to update email.');
            return;
        }

        try {
            const accessToken = localStorage.getItem('accessToken');
            if (!accessToken) {
                setMessage('You need to be logged in to update your email.');
                navigate('/login');
                return;
            }

            // Use authApiBaseUrl for Djoser's /users/me/ PATCH endpoint
            await axios.patch(`${authApiBaseUrl}/users/me/`, {
                email: email,
                current_password: currentPasswordForEmail // Djoser requires current_password for email update
            }, {
                headers: {
                    'Authorization': `Bearer ${accessToken}`
                }
            });
            setMessage('Email updated successfully!');
            setCurrentPasswordForEmail(''); // Clear password field after successful update
        } catch (error) {
            console.error("Email update error:", error.response?.data || error);
            const errorMsg = error.response?.data?.email?.[0] ||
                             error.response?.data?.current_password?.[0] ||
                             error.response?.data?.detail ||
                             'Failed to update email.';
            setMessage(errorMsg);
            if (error.response?.status === 401) {
                navigate('/login');
            }
        }
    };

    const handleDeleteAccount = async () => {
        if (!window.confirm("Are you sure you want to permanently delete your account? This action cannot be undone.")) {
            return;
        }
        setMessage('');

        try {
            const accessToken = localStorage.getItem('accessToken');
            if (!accessToken) {
                setMessage('You need to be logged in to delete your account.');
                navigate('/login');
                return;
            }

            // Use authApiBaseUrl for Djoser's /users/me/ DELETE endpoint
            await axios.delete(`${authApiBaseUrl}/users/me/`, {
                headers: {
                    'Authorization': `Bearer ${accessToken}`
                }
            });

            // Clear local storage and redirect to login after successful deletion
            localStorage.removeItem('accessToken');
            localStorage.removeItem('refreshToken');
            localStorage.removeItem('username');
            setMessage('Account successfully deleted.');
            navigate('/login');
        } catch (error) {
            console.error("Account deletion error:", error.response?.data || error);
            const errorMsg = error.response?.data?.detail || 'Failed to delete account.';
            setMessage(errorMsg);
            if (error.response?.status === 401) {
                navigate('/login');
            }
        }
    };

    const handleBackToPortal = () => {
        navigate('/');
    };

    return (
        <div className="App">
            <h1>Account Settings</h1>
            {message && <p className={message.includes('failed') || message.includes('error') ? 'error-message' : 'success-message'}>{message}</p>}

            {/* Section for Email Address */}
            <div className="settings-section">
                <h2>Edit User Information</h2>
                <form onSubmit={handleUpdateEmail}>
                    <div>
                        <label>Email:</label>
                        <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                        />
                    </div>
                    <div>
                        <label>Current password (to confirm changes):</label>
                        <input
                            type="password"
                            value={currentPasswordForEmail}
                            onChange={(e) => setCurrentPasswordForEmail(e.target.value)}
                            required
                        />
                    </div>
                    <button type="submit">Update Email</button>
                </form>
            </div>

            <hr />

            <div className="settings-section">
                <h2>Change Password</h2>
                <form onSubmit={handleChangePassword}>
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
            </div>

            <hr />

            <div className="settings-section">
                <h2>Account Management</h2>
                <button onClick={handleDeleteAccount} className="delete-account-button">
                    Cancel Account
                </button>
                <p className="warning-text">Warning: This action is permanent and cannot be undone.</p>
            </div>

            <hr />

            <button onClick={handleBackToPortal} className="back-button">Back to Portal</button>
        </div>
    );
}

export default AccountSettings;
