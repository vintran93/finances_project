import React from 'react';
import ReactDOM from 'react-dom/client'; // Use createRoot for React 18
import './index.css';
import AppWithRouter from './App'; // Import AppWithRouter
// import App from './App'; // Remove or comment out this line if present

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <AppWithRouter /> {/* Render AppWithRouter */}
  </React.StrictMode>
);