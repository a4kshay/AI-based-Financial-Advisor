# AI Financial Advisor - Project Architecture & Overview

This document provides a comprehensive breakdown of the file structure and components used in the **AI Financial Advisor** platform. It is designed to help you understand the flow of data and the responsibilities of each file for your conference presentation.

## High-Level Architecture
The project follows a standard decoupled **Client-Server Architecture**:
- **Frontend**: Built with React, Vite, and TailwindCSS. It provides the interactive user interface.
- **Backend**: Built with Python and FastAPI. It handles business logic, API endpoints, and database interactions.
- **Database**: SQLite, used for storing user credentials.
- **Machine Learning**: Python scripts using LSTM (Long Short-Term Memory) neural networks for stock predictions.

---

## 1. Frontend (`/frontend`)
The frontend is a Single Page Application (SPA) responsible for all user interactions.

### Configuration Files
- **`vite.config.js`**: Configuration for Vite (the build tool). Crucially, it sets up a proxy so that all `/api` requests from the frontend are automatically forwarded to the backend running on port 8000.
- **`tailwind.config.js` / `postcss.config.js`**: Configuration for the styling framework, ensuring custom colors, fonts, and responsive designs are applied across the app.
- **`package.json`**: Lists all the Node.js dependencies (like `react`, `framer-motion` for animations, `recharts` for graphs, etc.) and scripts (like `npm run dev`).

### Core React Files (`/frontend/src`)
- **`main.jsx`**: The entry point of the React application. It renders the root `<App />` component into the HTML DOM.
- **`App.jsx`**: The main router file. It defines the navigation paths (e.g., `/login`, `/dashboard`) and wraps the application in the `AuthContext` to protect private routes.
- **`index.css` / `App.css`**: Global stylesheets containing CSS variables and baseline styles.

### Context (`/frontend/src/context`)
- **`AuthContext.jsx`**: Manages the global authentication state of the user. It provides functions to login, signup, and logout, and keeps track of whether a user is currently authenticated across all pages.

### Pages (`/frontend/src/pages`)
Each file here represents a distinct screen or feature in the application:
- **`LandingPage.jsx`**: The public-facing home page explaining the platform's features.
- **`Login.jsx` & `Signup.jsx`**: Screens for user authentication. They communicate with the backend to verify or register users.
- **`Dashboard.jsx`**: The main hub after logging in, showing a summary of the user's financial health, trending stocks, and market indices.
- **`Explore.jsx`**: A page to browse trending stocks and recommended mutual funds.
- **`Holdings.jsx` & `Portfolio.jsx`**: Screens that display the user's current investments and asset allocation.
- **`SIPCalculator.jsx` & `FDCalculator.jsx`**: Financial tools that take user input (principal, interest rate, duration) and call backend APIs to calculate returns and generate growth graphs.
- **`ForexRisk.jsx`**: An interface to assess currency exchange risks.
- **`StockPrediction.jsx`**: The UI that interacts with the backend ML model to show historical stock data and future price predictions.
- **`Wishlist.jsx`**: A screen for users to track stocks they are interested in.
- **`AIChatbot.jsx`**: An interactive chat interface that provides automated responses to basic financial queries.

---

## 2. Backend (`/backend`)
The backend serves as the bridge between the database, the frontend, and external financial data APIs (like Yahoo Finance).

- **`main.py`**: The core API server built with FastAPI. It contains all the endpoints:
  - **Auth APIs** (`/api/login`, `/api/signup`): Validates user credentials.
  - **Market APIs** (`/api/trending`, `/api/stocks`, `/api/indices`): Fetches live market data using the `yfinance` Python library.
  - **Calculator APIs** (`/api/sip`, `/api/fd`): Performs mathematical computations for financial growth.
  - **AI/ML APIs** (`/api/chat`, `/api/predict/{ticker}`): Handles chatbot logic and serves stock predictions (currently mocked, waiting for the LSTM model integration).
- **`database.py`**: Contains the logic to connect to the SQLite database. It defines functions to initialize the database, create new users securely (hashing passwords), and verify existing users.
- **`users.db`**: The local SQLite database file where user information (usernames, emails, hashed passwords) is physically stored.

---

## 3. Machine Learning (`/model` & `/dataset`)
- **`train_lstm.py`**: A Python script designed to build and train a Long Short-Term Memory (LSTM) neural network. LSTMs are excellent at analyzing time-series data, making them ideal for predicting future stock prices based on historical trends.
- **`dataset/`**: A designated folder to store CSV files containing historical stock data used to train the LSTM model.

---

## How It All Works Together (The Flow)
1. **User Action**: A user navigates to the **SIP Calculator** page (`SIPCalculator.jsx`) and enters their investment details.
2. **API Request**: The React frontend sends a POST request to `/api/sip`. Because of `vite.config.js`, this request is securely proxied to `http://localhost:8000/api/sip`.
3. **Backend Processing**: `main.py` receives the data, calculates the projected wealth gained, and generates data points for a graph.
4. **Response & Render**: The backend sends the JSON data back to the frontend, and `SIPCalculator.jsx` updates its charts (using the `recharts` library) to display the growth visually to the user.
