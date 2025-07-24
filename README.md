## Finances Portfolio Tracker 📈💰<br/>
<img width="405" height="710" alt="image" src="https://github.com/user-attachments/assets/f019055f-b1d6-4d55-baec-8f2a8db0b263" /><img width="610" height="565" alt="image" src="https://github.com/user-attachments/assets/587df45c-3375-43cf-92bb-a0d1f2bee3ea" /> 

This is a comprehensive web application designed to help users manage their financial portfolios, including cryptocurrencies, stocks, and precious metals. It provides tools to track holdings, view real-time market data, and analyze portfolio performance.

## Features <br/>
* User Authentication: Secure user registration, login, logout, password reset, and account management functionalities. <br/>
* Portfolio Management: Create, view, and organize multiple portfolios (e.g., "Cryptocurrency," "Stocks," "Precious Metals"). <br/>
* Asset Tracking: Add, view, edit, and delete individual cryptocurrency, stock, or precious metal holdings within your portfolios. <br/>
* Real-time Market Data: Fetches live prices and market information for cryptocurrencies (via CoinMarketCap API) and stocks/precious metals (via Financial Modeling Prep API). <br/>
* Portfolio Valuation: Automatically calculates the total value of your holdings and tracks profits/losses based on current market prices. <br/>
* Asset Search: Search for specific cryptocurrency or stock symbols to get detailed market information. <br/>
* Top Assets Display: View lists of top cryptocurrencies and stocks to stay informed on market trends. <br/>
* Data Visualization: Currencies are color-coded by portfolio type for easy identification. <br/>
* Sorting: Sort your list of currencies by their total value (ascending or descending). <br/>

## Technologies <br/>
This project is built with a React frontend and a Django REST Framework backend. <br/>

## Frontend: <br/>
* React.js: For building the user interface. <br/>
* Axios: For making HTTP requests to the backend API. <br/>
* React Router DOM: For client-side routing and navigation. <br/>

## Backend (Inferred from code): <br/>
* Django: Python web framework. <br/>
* Django REST Framework: For building robust APIs. <br/>
* Djoser: For handling user authentication (registration, login, password reset). <br/>
* CoinMarketCap API: For fetching cryptocurrency data. <br/>
* Financial Modeling Prep API: For fetching stock and precious metals data. <br/>

## Setup & Installation
To run this project locally, you will need to set up both the frontend and the backend.

1. **Clone & install**
   ```
   git clone https://github.com/YOUR_USERNAME/doctor‑appointment.git 
   cd doctor‑appointment 

1. **Backend Setup (Django):**
* Clone the repository: (Assuming this is part of a larger project)
```
git clone <your-repo-url>
cd <your-backend-directory>
```
* Create a virtual environment:
```
python -m venv venv
source venv/bin/activate # On Windows: `venv\Scripts\activate`
```
* Install dependencies: 
```
pip install -r requirements.txt # (Assuming you have a requirements.txt) <br/>
# Or manually: pip install django djangorestframework djoser django-cors-headers requests 
```
* Set environment variables: <br/>
Create a .env file in your backend root or set them directly in your environment: <br/>
```
DJANGO_SECRET_KEY='your_django_secret_key' <br/>
JWT_SECRET_KEY='your_jwt_secret_key' <br/>
COINMARKETCAP_API_KEY='YOUR_COINMARKETCAP_API_KEY' <br/>
FINANCIALMODELINGPREP_API_KEY='YOUR_FINANCIALMODELINGPREP_API_KEY' <br/>
```
* You can get API keys from CoinMarketCap and Financial Modeling Prep websites. <br/>

* Run migrations: <br/>
```
python manage.py migrate 
```
* Create a superuser (optional, for admin access): <br/>
```
python manage.py createsuperuser 
```
* Start the Django development server: <br/>
```
python manage.py runserver 
```
The backend will typically run on http://127.0.0.1:8000. <br/>

2. **Frontend Setup (React):** <br/>
 
* Navigate to the frontend directory: <br/>
```
cd <your-frontend-directory> 
```
* Install Node.js dependencies: <br/>
```
npm install 
# or yarn install 
```
* Start the React development server: <br/>
```
npm start 
# or yarn start 
```
The frontend will typically run on http://localhost:3000.<br/>

## Usage
1. Register: Navigate to http://localhost:3000 and create a new account. <br/>
2. Login: Use your new credentials to log in. <br/>
3. Manage Portfolios: Go to "Your Portfolios" to create different types of investment portfolios (e.g., "Cryptocurrency," "Stocks"). <br/>
4. Add Assets: Within a portfolio, add new currencies or stocks by providing their details and purchase information. <br/>
5. View Dashboard: Check the "Portfolio Dashboard" for an overview of your total balance and asset performance. <br/>
6. Search: Use the "Search Crypto/Stock" page to look up real-time data for individual symbols. <br/>

## Built With <br/>
* React <br/>
* Axios <br/>
* React Router DOM <br/>
* Django <br/>
* Django REST Framework <br/>
* Djoser <br/>
* CoinMarketCap API <br/>
* Financial Modeling Prep API <br/>

## Possible Future Updates <br/>
* Integration of interactive charts and graphs for portfolio performance visualization. <br/>
* Advanced news feed and sentiment analysis for assets. <br/>
* Customizable alerts for price changes or portfolio thresholds. <br/>
* Support for more asset types (e.g., bonds, mutual funds). <br/>
* User-defined watchlists for tracking assets without owning them. <br/>

## Show some support <br/>
  Give a ⭐ if you like this project!

## License <br/>
This project is [MIT](https://opensource.org/licenses/MIT) licensed @ [vintran93]
