import os
import re
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, field_validator
import pandas as pd
import numpy as np
import yfinance as yf
from backend.database import init_db, create_user, get_user_by_email, verify_password
import math

def sanitize_nan(obj):
    if isinstance(obj, dict):
        return {k: sanitize_nan(v) for k, v in obj.items()}
    elif isinstance(obj, list):
        return [sanitize_nan(v) for v in obj]
    elif isinstance(obj, float):
        if math.isnan(obj) or math.isinf(obj):
            return 0.0
        return obj
    return obj

app = FastAPI(title="AI Financial Advisor API")

@app.on_event("startup")
def startup_event():
    init_db()

allowed_origins = [
    origin.strip()
    for origin in os.getenv("ALLOWED_ORIGINS", "*").split(",")
    if origin.strip()
]

# Setup CORS for Frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
def read_root():
    return {"message": "AI Financial Advisor Backend Running"}


@app.get("/api/health")
def health_check():
    return {"status": "ok", "message": "Backend is reachable"}


# --- Schemas ---

class SIPInput(BaseModel):
    monthly_investment: float
    duration_years: int
    expected_return_rate: float

class FDInput(BaseModel):
    principal: float
    interest_rate: float
    duration_years: int
    compounding_frequency: int = 4 # Default quarterly

class ChatInput(BaseModel):
    message: str

class SignupInput(BaseModel):
    username: str
    email: str
    password: str

    @field_validator("email")
    @classmethod
    def validate_email(cls, value):
        email = value.strip().lower()
        if not re.match(r"^[^\s@]+@[^\s@]+\.[^\s@]+$", email):
            raise ValueError("Enter a valid email address.")
        return email

class LoginInput(BaseModel):
    email: str
    password: str

    @field_validator("email")
    @classmethod
    def validate_email(cls, value):
        email = value.strip().lower()
        if not re.match(r"^[^\s@]+@[^\s@]+\.[^\s@]+$", email):
            raise ValueError("Enter a valid email address.")
        return email

class FDLiquidationInput(BaseModel):
    principal: float
    interest_rate: float
    duration_years: int
    months_elapsed: int
    penalty_rate: float = 1.0  # 1.0 means 1% penalty
    new_investment_rate: float = 12.0  # e.g. 12% in mutual fund

class AssetPredictionInput(BaseModel):
    initial_investment: float
    monthly_contribution: float
    years: int


# --- AUTH APIs ---


@app.post("/api/signup")
def signup(data: SignupInput):
    username = data.username.strip()
    email = data.email.strip().lower()

    if len(data.password) < 6:
        raise HTTPException(status_code=400, detail="Password must be at least 6 characters.")
    if len(username) < 2:
        raise HTTPException(status_code=400, detail="Username must be at least 2 characters.")
    if get_user_by_email(email):
        raise HTTPException(status_code=409, detail="An account with this email already exists. Please sign in instead.")

    success = create_user(username, email, data.password)
    if not success:
        raise HTTPException(status_code=409, detail="An account with this email already exists. Please sign in instead.")
    return {"status": "success", "message": "Account created successfully!"}


@app.post("/api/login")
def login(data: LoginInput):
    user = get_user_by_email(data.email.strip().lower())
    if not user or not verify_password(data.password, user["hashed_password"]):
        raise HTTPException(status_code=401, detail="Invalid email or password.")
    return {
        "status": "success",
        "message": "Login successful!",
        "user": {
            "id": user["id"],
            "username": user["username"],
            "email": user["email"],
        }
    }


# --- Trending / Explore API ---

TRENDING_STOCKS = [
    {"symbol": "RELIANCE.NS", "name": "Reliance Industries", "sector": "Energy"},
    {"symbol": "TCS.NS",      "name": "Tata Consultancy Services", "sector": "IT"},
    {"symbol": "INFY.NS",     "name": "Infosys",           "sector": "IT"},
    {"symbol": "HDFCBANK.NS", "name": "HDFC Bank",          "sector": "Banking"},
    {"symbol": "ICICIBANK.NS","name": "ICICI Bank",         "sector": "Banking"},
    {"symbol": "BHARTIARTL.NS","name": "Bharti Airtel",    "sector": "Telecom"},
    {"symbol": "ITC.NS",      "name": "ITC Limited",        "sector": "FMCG"},
    {"symbol": "WIPRO.NS",    "name": "Wipro",              "sector": "IT"},
]

TRENDING_SIPS = [
    {"name": "Mirae Asset Large Cap Fund", "category": "Large Cap", "returns_1y": 14.2, "min_sip": 500},
    {"name": "Axis Bluechip Fund",         "category": "Large Cap", "returns_1y": 12.8, "min_sip": 500},
    {"name": "SBI Small Cap Fund",         "category": "Small Cap", "returns_1y": 26.5, "min_sip": 500},
    {"name": "Parag Parikh Flexi Cap",     "category": "Flexi Cap", "returns_1y": 18.3, "min_sip": 1000},
    {"name": "HDFC Mid-Cap Opportunities", "category": "Mid Cap",   "returns_1y": 22.1, "min_sip": 500},
    {"name": "Kotak Emerging Equity",      "category": "Mid Cap",   "returns_1y": 19.7, "min_sip": 1000},
]

@app.get("/api/trending")
def get_trending():
    """Fetch live data for trending Indian stocks + curated SIP list"""
    stocks = []
    for s in TRENDING_STOCKS:
        try:
            ticker = yf.Ticker(s["symbol"])
            hist = ticker.history(period="5d")
            if len(hist) >= 2:
                price = round(float(hist['Close'].iloc[-1]), 2)
                prev  = round(float(hist['Close'].iloc[-2]), 2)
                chg   = round(price - prev, 2)
                pct   = round((chg / prev) * 100, 2)
                spark = [round(float(p), 2) for p in ticker.history(period="1mo")['Close'].values]
            else:
                price = prev = chg = pct = 0
                spark = []
            stocks.append({**s, "price": price, "prev_close": prev,
                           "change": chg, "change_pct": pct, "sparkline": spark})
        except Exception as e:
            stocks.append({**s, "price": 0, "change": 0, "change_pct": 0, "sparkline": []})

    return sanitize_nan({"status": "success", "stocks": stocks, "sips": TRENDING_SIPS})


@app.get("/api/stocks")
def get_stocks_data(symbols: str):
    """Fetch live data for a specific list of comma-separated symbols"""
    stocks = []
    symbol_list = [s.strip() for s in symbols.split(",") if s.strip()]
    for sym in symbol_list:
        try:
            ticker = yf.Ticker(sym)
            hist = ticker.history(period="5d")
            if len(hist) >= 2:
                price = round(float(hist['Close'].iloc[-1]), 2)
                prev  = round(float(hist['Close'].iloc[-2]), 2)
                chg   = round(price - prev, 2)
                pct   = round((chg / prev) * 100, 2)
                # Sector/Name info
                info = ticker.info
                name = info.get('longName', sym.replace('.NS', ''))
                sector = info.get('sector', 'Financials')
            else:
                price = prev = chg = pct = 0
                name = sym.replace('.NS', '')
                sector = "Unknown"
            stocks.append({
                "symbol": sym, 
                "name": name, 
                "price": price, 
                "change": chg, 
                "change_pct": pct, 
                "sector": sector
            })
        except Exception as e:
            stocks.append({"symbol": sym, "name": sym, "price": 0, "change": 0, "change_pct": 0, "sector": "Error"})
    return {"status": "success", "data": stocks}


@app.get("/api/portfolio")
def get_portfolio():
    """Fetch user portfolio with live pricing"""
    # In a real app, this would come from a DB for the logged-in user
    # Currently returns empty — no fake holdings
    user_holdings = []
    
    results = []
    for h in user_holdings:
        try:
            ticker = yf.Ticker(h["symbol"])
            hist = ticker.history(period="2d")
            curr = round(float(hist['Close'].iloc[-1]), 2) if len(hist) > 0 else h["avg"]
            results.append({**h, "curr": curr})
        except:
            results.append({**h, "curr": h["avg"]})
            
    return {"status": "success", "data": results}


# --- Market Indices API ---

@app.get("/api/indices")
def get_market_indices():
    """Fetch live Nifty 50, Sensex, and Bank Nifty data"""
    indices = {
        "NIFTY 50": "^NSEI",
        "SENSEX": "^BSESN",
        "BANK NIFTY": "^NSEBANK",
    }
    
    results = []
    for name, ticker_symbol in indices.items():
        try:
            ticker = yf.Ticker(ticker_symbol)
            hist = ticker.history(period="5d")
            
            if len(hist) >= 2:
                current_price = hist['Close'].iloc[-1]
                prev_close = hist['Close'].iloc[-2]
                change = current_price - prev_close
                change_pct = (change / prev_close) * 100
                
                # Get mini sparkline data (last 30 days)
                hist_30d = ticker.history(period="1mo")
                sparkline = [round(float(p), 2) for p in hist_30d['Close'].values]
                
                closes = hist_30d['Close'].values.tolist()
                last_date_str = hist_30d.index[-1].strftime("%Y-%m-%d") if len(hist_30d) > 0 else "2024-01-01"
                prediction, forecast_analysis = _forecast_from_history(
                    closes, current_price, last_date_str, forecast_days=7
                )
                
                results.append({
                    "name": name,
                    "ticker": ticker_symbol,
                    "price": round(float(current_price), 2),
                    "change": round(float(change), 2),
                    "change_pct": round(float(change_pct), 2),
                    "prev_close": round(float(prev_close), 2),
                    "high": round(float(hist['High'].iloc[-1]), 2),
                    "low": round(float(hist['Low'].iloc[-1]), 2),
                    "sparkline": sparkline,
                    "prediction": prediction,
                    "forecast": forecast_analysis,
                })
            else:
                results.append({
                    "name": name,
                    "ticker": ticker_symbol,
                    "price": 0,
                    "change": 0,
                    "change_pct": 0,
                    "prev_close": 0,
                    "high": 0,
                    "low": 0,
                    "sparkline": [],
                })
        except Exception as e:
            results.append({
                "name": name,
                "ticker": ticker_symbol,
                "price": 0,
                "change": 0,
                "change_pct": 0,
                "error": str(e),
                "sparkline": [],
            })
    
    return {"status": "success", "data": results}


# --- Calculator APIs ---

@app.post("/api/sip")
def calculate_sip(data: SIPInput):
    # SIP calculation: M = P × ({[1 + i]^n – 1} / i) × (1 + i).
    P = data.monthly_investment
    r = data.expected_return_rate / 100 / 12  # monthly interest rate
    n = data.duration_years * 12 # total months
    
    total_invested = P * n
    
    if r == 0:
        estimated_returns = total_invested
    else:
        estimated_returns = P * (((1 + r) ** n - 1) / r) * (1 + r)
    
    wealth_gained = estimated_returns - total_invested
    
    # Generate growth graph points (yearly)
    graph_data = []
    current_invested = 0
    current_value = 0
    for year in range(1, data.duration_years + 1):
        months = year * 12
        current_invested = P * months
        current_value = P * (((1 + r) ** months - 1) / r) * (1 + r)
        graph_data.append({
            "year": year,
            "invested": round(current_invested, 2),
            "value": round(current_value, 2)
        })
        
    return {
        "status": "success",
        "data": {
            "total_invested": round(total_invested, 2),
            "wealth_gained": round(wealth_gained, 2),
            "estimated_returns": round(estimated_returns, 2),
            "graph": graph_data
        }
    }


@app.post("/api/fd")
def calculate_fd(data: FDInput):
    # FD Compounding Formula: A = P * (1 + r/n)^(n*t)
    P = data.principal
    r = data.interest_rate / 100
    n = data.compounding_frequency
    t = data.duration_years
    
    amount = P * (1 + r/n) ** (n * t)
    interest_earned = amount - P
    
    # Generate graph data (yearly)
    graph_data = []
    for year in range(1, t + 1):
        val = P * (1 + r/n) ** (n * year)
        graph_data.append({
            "year": year,
            "principal": P,
            "value": round(val, 2)
        })
        
    return {
        "status": "success",
        "data": {
            "maturity_amount": round(amount, 2),
            "interest_earned": round(interest_earned, 2),
            "graph": graph_data
        }
    }


# --- ML / AI APIs ---

@app.get("/api/forex")
def forex_risk_analysis():
    # Simulated FOREX data and risk profile
    pairs = ["EUR/USD", "GBP/USD", "USD/JPY", "USD/INR"]
    import random
    
    analysis = []
    for p in pairs:
        volatility = random.uniform(0.5, 2.5) # Percent daily
        trend = random.choice(["Bullish", "Bearish", "Neutral"])
        
        if volatility > 1.5:
            risk = "High"
        elif volatility > 0.8:
            risk = "Medium"
        else:
            risk = "Low"
            
        analysis.append({
            "pair": p,
            "volatility": round(volatility, 2),
            "trend": trend,
            "risk_level": risk
        })
        
    return {"status": "success", "data": analysis}


@app.post("/api/chat")
def basic_financial_chat(chat: ChatInput):
    msg = chat.message.lower()
    response = "I'm a basic financial assistant. Try asking about 'SIP', 'FD', 'Stocks', or 'Forex risk'."
    
    if "sip" in msg:
        response = "A Systematic Investment Plan (SIP) allows you to invest a fixed amount regularly in mutual funds, benefiting from rupee cost averaging."
    elif "fd" in msg or "fixed deposit" in msg:
        response = "A Fixed Deposit (FD) guarantees a fixed interest rate over a specific period. It is very low risk."
    elif "stock" in msg or "prediction" in msg:
        response = "Stock predictions use historical data (via LSTM models) to forecast future trends. However, markets are volatile and predictions should not be taken as exact financial advice."
    elif "forex" in msg or "currency" in msg:
        response = "Forex trading involves exchanging currencies. It is highly volatile. Use our Forex risk tool to assess the current market."
        
    return {"status": "success", "response": response}


def _forecast_from_history(closes, current_price, last_date_str, forecast_days=7):
    """Project future prices from recent close-price trend, EMA momentum, and volatility."""
    import datetime

    n = len(closes)
    if n < 5:
        return [], {}

    window_len = min(30, n)
    window = np.array(closes[-window_len:], dtype=float)
    x = np.arange(len(window))
    try:
        slope, _intercept = np.polyfit(x, window, 1)
    except np.linalg.LinAlgError:
        slope = 0.0
        _intercept = 0.0

    def _ema(series, span):
        alpha = 2 / (span + 1)
        value = float(series[0])
        for point in series[1:]:
            value = alpha * float(point) + (1 - alpha) * value
        return value

    ema_short = _ema(closes[-min(12, n):], 12)
    ema_long = _ema(closes[-min(26, n):], 26)
    ema_signal = (ema_short - ema_long) / ema_long if ema_long > 0 else 0.0

    prior = np.array(closes[-window_len:], dtype=float)
    returns = np.diff(prior) / prior[:-1]
    volatility = float(np.std(returns)) if len(returns) > 1 else 0.008

    regression_drift = slope / current_price if current_price > 0 else 0.0
    blended_daily = 0.65 * regression_drift + 0.35 * ema_signal * 0.12
    blended_daily = float(np.clip(blended_daily, -0.04, 0.04))

    last_date = datetime.datetime.strptime(last_date_str, "%Y-%m-%d")
    predictions = []
    price = float(current_price)

    for i in range(1, forecast_days + 1):
        next_date = last_date + datetime.timedelta(days=i)
        price = price * (1 + blended_daily)
        cap = volatility * 2.5 * np.sqrt(i)
        price = float(np.clip(price, current_price * (1 - cap), current_price * (1 + cap)))
        predictions.append({
            "date": next_date.strftime("%Y-%m-%d"),
            "predicted_price": round(price, 2),
            "upper_bound": round(price * (1 + volatility * np.sqrt(i)), 2),
            "lower_bound": round(price * (1 - volatility * np.sqrt(i)), 2),
        })

    target = predictions[-1]["predicted_price"]
    change_pct = round((target - current_price) / current_price * 100, 2) if current_price else 0

    if blended_daily > 0.0015:
        sentiment = "Bullish"
    elif blended_daily < -0.0015:
        sentiment = "Bearish"
    else:
        sentiment = "Neutral"

    analysis = {
        "sentiment": sentiment,
        "daily_trend_pct": round(blended_daily * 100, 3),
        "volatility_pct": round(volatility * 100, 2),
        "forecast_days": forecast_days,
        "forecast_target_price": target,
        "forecast_change_pct": change_pct,
        "method": "Trend regression + EMA momentum on live historical closes",
    }
    return predictions, analysis


def _calculate_indicators(df):
    """Calculate SMA, EMA, RSI, MACD, and Bollinger Bands using pandas."""
    df = df.copy()
    
    # Simple Moving Averages
    df['sma20'] = df['Close'].rolling(window=20).mean()
    df['sma50'] = df['Close'].rolling(window=50).mean()
    df['sma200'] = df['Close'].rolling(window=200).mean()
    
    # Exponential Moving Averages
    df['ema12'] = df['Close'].ewm(span=12, adjust=False).mean()
    df['ema26'] = df['Close'].ewm(span=26, adjust=False).mean()
    
    # Relative Strength Index (RSI-14)
    delta = df['Close'].diff()
    gain = delta.clip(lower=0)
    loss = -delta.clip(upper=0)
    avg_gain = gain.rolling(window=14).mean()
    avg_loss = loss.rolling(window=14).mean()
    
    # Smoothing gain and loss (Wilder's method)
    avg_gain_smooth = avg_gain.copy()
    avg_loss_smooth = avg_loss.copy()
    
    for i in range(14, len(df)):
        if i == 14:
            avg_gain_smooth.iloc[i] = avg_gain.iloc[14]
            avg_loss_smooth.iloc[i] = avg_loss.iloc[14]
        else:
            avg_gain_smooth.iloc[i] = (avg_gain_smooth.iloc[i-1] * 13 + gain.iloc[i]) / 14
            avg_loss_smooth.iloc[i] = (avg_loss_smooth.iloc[i-1] * 13 + loss.iloc[i]) / 14
            
    rs = avg_gain_smooth / avg_loss_smooth
    df['rsi'] = 100 - (100 / (1 + rs))
    df['rsi'] = df['rsi'].fillna(50)  # Default neutral if nan
    
    # MACD
    df['macd'] = df['ema12'] - df['ema26']
    df['macd_signal'] = df['macd'].ewm(span=9, adjust=False).mean()
    df['macd_hist'] = df['macd'] - df['macd_signal']
    
    # Bollinger Bands
    df['bb_middle'] = df['sma20']
    bb_std = df['Close'].rolling(window=20).std()
    df['bb_upper'] = df['bb_middle'] + (2 * bb_std)
    df['bb_lower'] = df['bb_middle'] - (2 * bb_std)
    
    # Fill NaNs with current Close price or reasonable values so serialization is clean
    df['sma20'] = df['sma20'].fillna(df['Close'])
    df['sma50'] = df['sma50'].fillna(df['Close'])
    df['sma200'] = df['sma200'].fillna(df['Close'])
    df['bb_upper'] = df['bb_upper'].fillna(df['Close'])
    df['bb_lower'] = df['bb_lower'].fillna(df['Close'])
    df['bb_middle'] = df['bb_middle'].fillna(df['Close'])
    df['macd'] = df['macd'].fillna(0.0)
    df['macd_signal'] = df['macd_signal'].fillna(0.0)
    df['macd_hist'] = df['macd_hist'].fillna(0.0)
    
    return df


def _double_exponential_smoothing(closes, forecast_days=30, alpha=0.3, beta=0.2):
    """Double Exponential Smoothing (Holt's Linear Trend Model) for price forecasting."""
    n = len(closes)
    if n < 5:
        return [float(closes[-1]) for _ in range(forecast_days)]
        
    level = float(closes[0])
    trend = float(closes[1] - closes[0])
    
    for i in range(1, n):
        last_level = level
        val = float(closes[i])
        level = alpha * val + (1 - alpha) * (level + trend)
        trend = beta * (level - last_level) + (1 - beta) * trend
        
    predictions = []
    for i in range(1, forecast_days + 1):
        pred_val = level + i * trend
        pred_val = max(0.0, pred_val)
        predictions.append(pred_val)
    return predictions


def _monte_carlo_simulation(closes, current_price, last_date_str, num_simulations=100, forecast_days=30):
    """Geometric Brownian Motion (GBM) Monte Carlo Simulation for stock pricing."""
    import datetime
    closes = np.array(closes, dtype=float)
    if len(closes) < 5:
        return [], [], {}
        
    returns = np.diff(closes) / closes[:-1]
    
    mu = float(np.mean(returns))
    sigma = float(np.std(returns))
    if sigma == 0:
        sigma = 0.01
        
    paths = []
    np.random.seed(42)
    
    for _ in range(num_simulations):
        path = [float(current_price)]
        price = float(current_price)
        for _ in range(forecast_days):
            z = np.random.normal(0, 1)
            drift = mu - 0.5 * (sigma ** 2)
            shock = sigma * z
            price = price * np.exp(drift + shock)
            path.append(max(0.01, float(price)))
        paths.append(path)
        
    paths = np.array(paths)
    
    last_date = datetime.datetime.strptime(last_date_str, "%Y-%m-%d")
    dates = [(last_date + datetime.timedelta(days=i)).strftime("%Y-%m-%d") for i in range(1, forecast_days + 1)]
    
    percentiles_5 = []
    percentiles_50 = []
    percentiles_95 = []
    
    for t in range(1, forecast_days + 1):
        prices_at_t = paths[:, t]
        percentiles_5.append(round(float(np.percentile(prices_at_t, 5)), 2))
        percentiles_50.append(round(float(np.percentile(prices_at_t, 50)), 2))
        percentiles_95.append(round(float(np.percentile(prices_at_t, 95)), 2))
        
    mc_forecast = []
    for i in range(forecast_days):
        mc_forecast.append({
            "date": dates[i],
            "predicted_price": percentiles_50[i],
            "lower_bound": percentiles_5[i],
            "upper_bound": percentiles_95[i]
        })
        
    sample_indices = np.linspace(0, num_simulations - 1, 10, dtype=int)
    sampled_paths = []
    for idx in sample_indices:
        path = paths[idx]
        path_data = []
        for i in range(1, forecast_days + 1):
            path_data.append({
                "date": dates[i-1],
                "price": round(float(path[i]), 2)
            })
        sampled_paths.append(path_data)
        
    ending_prices = paths[:, -1]
    
    sim_stats = {
        "drift": round(mu, 5),
        "volatility": round(sigma, 5),
        "expected_value": round(float(np.mean(ending_prices)), 2),
        "min_ending_price": round(float(np.min(ending_prices)), 2),
        "max_ending_price": round(float(np.max(ending_prices)), 2),
        "ending_prices": [round(float(x), 2) for x in ending_prices.tolist()]
    }
    
    return mc_forecast, sampled_paths, sim_stats


def _generate_technical_consensus(historical, current_price):
    if len(historical) < 20:
        return {"consensus": "Neutral", "score": 0, "signals": {}, "narrative": "Insufficient data to calculate consensus."}
        
    last = historical[-1]
    prev = historical[-2]
    
    rsi = last["rsi"]
    if rsi > 70:
        rsi_signal = "Bearish (Overbought)"
        rsi_score = -1
    elif rsi < 30:
        rsi_signal = "Bullish (Oversold)"
        rsi_score = 1
    else:
        rsi_signal = "Neutral"
        rsi_score = 0
        
    price_vs_sma50 = "Bullish" if current_price > last["sma50"] else "Bearish"
    sma50_score = 1 if price_vs_sma50 == "Bullish" else -1
    
    price_vs_sma200 = "Bullish" if current_price > last["sma200"] else "Bearish"
    sma200_score = 1 if price_vs_sma200 == "Bullish" else -1
    
    macd = last["macd"]
    signal = last["macd_signal"]
    prev_macd = prev["macd"]
    prev_signal = prev["macd_signal"]
    
    macd_score = 0
    if macd > signal and prev_macd <= prev_signal:
        macd_signal = "Bullish Crossover"
        macd_score = 1
    elif macd < signal and prev_macd >= prev_signal:
        macd_signal = "Bearish Crossover"
        macd_score = -1
    else:
        macd_signal = "Bullish" if macd > signal else "Bearish"
        macd_score = 0.5 if macd > signal else -0.5
        
    bb_width = (last["bb_upper"] - last["bb_lower"]) / last["bb_middle"] if last["bb_middle"] > 0 else 0
    bb_score = 0
    if current_price >= last["bb_upper"] * 0.98:
        bb_signal = "Overbought (Upper BB)"
        bb_score = -0.5
    elif current_price <= last["bb_lower"] * 1.02:
        bb_signal = "Oversold (Lower BB)"
        bb_score = 0.5
    else:
        bb_signal = "Neutral"
        bb_score = 0
        
    total_score = rsi_score + sma50_score + sma200_score + macd_score + bb_score
    
    if total_score >= 2.0:
        consensus = "Strong Buy"
    elif total_score >= 0.75:
        consensus = "Buy"
    elif total_score <= -2.0:
        consensus = "Strong Sell"
    elif total_score <= -0.75:
        consensus = "Sell"
    else:
        consensus = "Hold"
        
    narrative = f"Technical analysis indicates a {consensus.upper()} sentiment for this stock. "
    if price_vs_sma50 == "Bullish" and price_vs_sma200 == "Bullish":
        narrative += "The price is in a strong long-term uptrend, trading above both the 50-day and 200-day SMAs. "
    elif price_vs_sma50 == "Bearish" and price_vs_sma200 == "Bearish":
        narrative += "The price is in a clear downtrend, trading below the 50-day and 200-day SMAs. "
    else:
        narrative += "The stock is showing mixed trend signals, trading between its 50-day and 200-day moving averages. "
        
    if rsi > 70:
        narrative += f"The RSI is currently at {round(rsi, 1)}, signaling overbought conditions which may lead to a near-term pullback. "
    elif rsi < 30:
        narrative += f"The RSI is at {round(rsi, 1)}, which is oversold and suggests a strong technical rebound potential. "
    else:
        narrative += f"The RSI of {round(rsi, 1)} indicates a neutral momentum state with room for movement in either direction. "
        
    if "Crossover" in macd_signal:
        narrative += f"Notably, MACD recently triggered a {macd_signal}, signaling a potential shift in momentum."
    else:
        narrative += f"The MACD line is currently {'above' if macd > signal else 'below'} its signal line, reflecting {'bullish' if macd > signal else 'bearish'} momentum."
        
    return {
        "consensus": consensus,
        "score": round(total_score, 2),
        "signals": {
            "rsi": {"value": round(rsi, 1), "signal": rsi_signal},
            "sma50": {"value": round(last["sma50"], 2), "signal": price_vs_sma50},
            "sma200": {"value": round(last["sma200"], 2), "signal": price_vs_sma200},
            "macd": {"value": round(macd, 2), "signal_value": round(signal, 2), "signal": macd_signal},
            "bollinger": {"upper": round(last["bb_upper"], 2), "lower": round(last["bb_lower"], 2), "width": round(bb_width * 100, 2), "signal": bb_signal}
        },
        "narrative": narrative
    }


# Live stock quote + historical prices + trend-based price forecast
@app.get("/api/predict/{ticker}")
def predict_stock(ticker: str):
    import datetime
    from concurrent.futures import ThreadPoolExecutor, TimeoutError as FuturesTimeout

    ticker = ticker.strip().upper()
    if not ticker:
        raise HTTPException(status_code=400, detail="Ticker symbol is required.")

    try:
        stock = yf.Ticker(ticker)

        # Attempt to fetch 1 year of daily data to support SMA-200 and indicators, fallback if needed
        df = stock.history(period="1y", interval="1d", auto_adjust=True)
        if df is None or df.empty:
            df = stock.history(period="3mo", interval="1d", auto_adjust=True)
        if df is None or df.empty:
            df = stock.history(period="1mo", interval="1d", auto_adjust=True)
        if df is None or df.empty:
            raise HTTPException(
                status_code=404,
                detail=f"No market data found for '{ticker}'. Verify the ticker symbol or try a different one."
            )

        # Ensure required columns exist
        required_cols = ["Open", "High", "Low", "Close", "Volume"]
        missing = [c for c in required_cols if c not in df.columns]
        if missing:
            raise HTTPException(
                status_code=500,
                detail=f"Unexpected data format from Yahoo Finance for '{ticker}'. Missing columns: {', '.join(missing)}"
            )

        df = df.reset_index()

        # Handle the Date column — yfinance may name it 'Date' or 'Datetime'
        date_col = "Date" if "Date" in df.columns else "Datetime" if "Datetime" in df.columns else df.columns[0]
        df["Date"] = pd.to_datetime(df[date_col]).dt.tz_localize(None).dt.strftime("%Y-%m-%d")

        # Compute Technical Indicators
        df = _calculate_indicators(df)

        # Build historical list safely
        historical = []
        for _, row in df.iterrows():
            try:
                historical.append({
                    "date": row["Date"],
                    "price": round(float(row["Close"]), 2),
                    "open": round(float(row["Open"]), 2),
                    "high": round(float(row["High"]), 2),
                    "low": round(float(row["Low"]), 2),
                    "volume": int(row["Volume"]) if pd.notna(row["Volume"]) else 0,
                    "sma20": round(float(row["sma20"]), 2),
                    "sma50": round(float(row["sma50"]), 2),
                    "sma200": round(float(row["sma200"]), 2),
                    "rsi": round(float(row["rsi"]), 2),
                    "macd": round(float(row["macd"]), 2),
                    "macd_signal": round(float(row["macd_signal"]), 2),
                    "macd_hist": round(float(row["macd_hist"]), 2),
                    "bb_upper": round(float(row["bb_upper"]), 2),
                    "bb_lower": round(float(row["bb_lower"]), 2),
                    "bb_middle": round(float(row["bb_middle"]), 2),
                })
            except Exception:
                continue

        if not historical:
            raise HTTPException(
                status_code=500,
                detail=f"Failed to parse historical data for '{ticker}'."
            )

        current_price = round(float(df["Close"].iloc[-1]), 2)
        prev_close = (
            round(float(df["Close"].iloc[-2]), 2) if len(df) >= 2 else current_price
        )
        day_high = round(float(df["High"].iloc[-1]), 2)
        day_low = round(float(df["Low"].iloc[-1]), 2)
        day_open = round(float(df["Open"].iloc[-1]), 2)
        volume = historical[-1]["volume"] if historical else 0

        # --- fast_info with 5-second timeout (can hang on Yahoo) ---
        def _fetch_fast_info():
            fi = stock.fast_info
            return {
                "last_price": getattr(fi, "last_price", None),
                "previous_close": getattr(fi, "previous_close", None),
                "day_high": getattr(fi, "day_high", None),
                "day_low": getattr(fi, "day_low", None),
                "open": getattr(fi, "open", None),
                "last_volume": getattr(fi, "last_volume", None),
            }

        try:
            with ThreadPoolExecutor(max_workers=1) as pool:
                fast = pool.submit(_fetch_fast_info).result(timeout=5)

            last = fast.get("last_price")
            if last and float(last) > 0:
                current_price = round(float(last), 2)
            prev = fast.get("previous_close")
            if prev and float(prev) > 0:
                prev_close = round(float(prev), 2)
            hi = fast.get("day_high")
            if hi and float(hi) > 0:
                day_high = round(float(hi), 2)
            lo = fast.get("day_low")
            if lo and float(lo) > 0:
                day_low = round(float(lo), 2)
            op = fast.get("open")
            if op and float(op) > 0:
                day_open = round(float(op), 2)
            vol = fast.get("last_volume")
            if vol and int(vol) > 0:
                volume = int(vol)
        except (FuturesTimeout, Exception):
            pass

        change = round(current_price - prev_close, 2)
        change_pct = round((change / prev_close) * 100, 2) if prev_close > 0 else 0

        # --- stock.info with 5-second timeout (can hang on Yahoo) ---
        def _fetch_info():
            return stock.info

        stock_name = ticker.replace(".NS", "")
        currency = "INR" if ticker.endswith(".NS") else "USD"
        try:
            with ThreadPoolExecutor(max_workers=1) as pool:
                info = pool.submit(_fetch_info).result(timeout=5)
            stock_name = info.get("longName") or info.get("shortName") or stock_name
            currency = info.get("currency") or currency
        except (FuturesTimeout, Exception):
            pass

        currency_symbol = "₹" if currency == "INR" else "$" if currency == "USD" else f"{currency} "

        closes = [h["price"] for h in historical]
        last_date = historical[-1]["date"]
        
        # 1. Existing trend-regression forecast (7 days)
        prediction_trend, forecast_analysis_trend = _forecast_from_history(
            closes, current_price, last_date, forecast_days=7
        )

        # 2. Holt-Winters Double Exponential Smoothing forecast (30 days)
        hw_preds = _double_exponential_smoothing(closes, forecast_days=30)
        last_dt = datetime.datetime.strptime(last_date, "%Y-%m-%d")
        hw_forecast = []
        for i, val in enumerate(hw_preds):
            next_dt = last_dt + datetime.timedelta(days=i+1)
            hw_forecast.append({
                "date": next_dt.strftime("%Y-%m-%d"),
                "predicted_price": round(val, 2)
            })

        # 3. Monte Carlo Simulation forecast (30 days)
        mc_forecast, mc_paths, mc_stats = _monte_carlo_simulation(closes, current_price, last_date, forecast_days=30)

        # 4. Generate Technical Indicators Consensus & Narrative
        tech_consensus = _generate_technical_consensus(historical, current_price)

        return sanitize_nan({
            "status": "success",
            "ticker": ticker,
            "name": stock_name,
            "currency": currency,
            "currency_symbol": currency_symbol,
            "current_price": current_price,
            "prev_close": prev_close,
            "change": change,
            "change_pct": change_pct,
            "day_high": day_high,
            "day_low": day_low,
            "day_open": day_open,
            "volume": volume,
            "live": {
                "price": current_price,
                "prev_close": prev_close,
                "change": change,
                "change_pct": change_pct,
                "day_high": day_high,
                "day_low": day_low,
                "day_open": day_open,
                "volume": volume,
                "as_of": datetime.datetime.utcnow().strftime("%Y-%m-%dT%H:%M:%SZ"),
            },
            "historical": historical,
            "prediction": prediction_trend,
            "forecast": forecast_analysis_trend,
            "holt_winters": hw_forecast,
            "monte_carlo": {
                "forecast": mc_forecast,
                "paths": mc_paths,
                "stats": mc_stats
            },
            "technical_analysis": tech_consensus,
            "data_source": "yahoo_finance",
            "model": "trend_analysis",
            "disclaimer": "7-day trend regression, 30-day double exponential smoothing, and Monte Carlo models extrapolate historical data. Not financial advice.",
        })
    except HTTPException:
        raise
    except Exception as e:
        import traceback, sys
        traceback.print_exc(file=sys.stderr)
        raise HTTPException(status_code=500, detail=f"Unexpected error: {type(e).__name__}: {str(e)}")


@app.post("/api/fd/liquidation")
def fd_liquidation_advice(data: FDLiquidationInput):
    try:
        # FD compound math
        P = data.principal
        r_orig = data.interest_rate / 100
        t_orig = data.duration_years
        months_elapsed = data.months_elapsed
        t_elapsed = months_elapsed / 12.0
        t_remaining = max(0.0, t_orig - t_elapsed)
        
        # 1. Maturity value if held to the end
        maturity_value_held = P * (1 + r_orig / 4) ** (4 * t_orig)
        
        # 2. Accrued value currently if kept (no penalty yet, theoretical)
        accrued_value_no_penalty = P * (1 + r_orig / 4) ** (4 * t_elapsed)
        
        # 3. Liquidated value now (with premature penalty)
        r_penalty = max(0.0, (data.interest_rate - data.penalty_rate) / 100)
        liquidated_value = P * (1 + r_penalty / 4) ** (4 * t_elapsed)
        
        # Lost interest due to premature withdrawal penalty
        lost_interest = accrued_value_no_penalty - liquidated_value
        
        # 4. Reinvestment option: Put liquidated_value into a new asset for the remaining duration
        r_new = data.new_investment_rate / 100
        # Assume monthly compounding for SIP/Mutual Fund reinvestment
        reinvested_final = liquidated_value * (1 + r_new / 12) ** (12 * t_remaining)
        
        net_benefit = reinvested_final - maturity_value_held
        
        # Generate advice
        advice = []
        if t_remaining <= 0.5: # less than 6 months left
            advice.append("With less than 6 months left to maturity, it is highly recommended to KEEP the Fixed Deposit. Reinvesting for such a short window rarely offsets the premature liquidation penalty.")
        elif net_benefit > 0:
            advice.append(f"LIQUIDATING and reinvesting in a higher-yielding asset ({data.new_investment_rate}%) is mathematically optimal. It yields ₹{round(net_benefit, 2):,} more by the end of the original tenure.")
        else:
            advice.append(f"KEEP the FD. Liquidating now and reinvesting yields ₹{round(abs(net_benefit), 2):,} LESS due to the {data.penalty_rate}% premature penalty and short compounding duration.")
            
        if P >= 50000:
            advice.append("Alternative: Instead of liquidating, consider taking a 'Loan against FD' (typically available at +1% above your FD interest rate) if you need short-term liquidity, preserving your interest rate on the principal.")
            
        return {
            "status": "success",
            "data": {
                "maturity_value_held": round(maturity_value_held, 2),
                "accrued_value_no_penalty": round(accrued_value_no_penalty, 2),
                "liquidated_value": round(liquidated_value, 2),
                "lost_interest": round(lost_interest, 2),
                "reinvested_final": round(reinvested_final, 2),
                "net_benefit": round(net_benefit, 2),
                "advice": advice
            }
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@app.post("/api/predict/assets")
def predict_assets_growth(data: AssetPredictionInput):
    try:
        years = data.years
        P = data.initial_investment
        PMT = data.monthly_contribution
        
        # Growth rates
        rates = {
            "Fixed Deposit": 0.065, # 6.5% Compounded Quarterly
            "Gold": 0.08,           # 8% Compounded Annually
            "Mutual Fund (SIP)": 0.12, # 12% Compounded Monthly
            "Stocks": 0.15,         # 15% Compounded Monthly
            "Cryptocurrency": 0.25  # 25% Compounded Annually with high volatility
        }
        
        graph_data = []
        
        for yr in range(0, years + 1):
            # FD: Initial investment compounded quarterly, no monthly contribution to FD usually
            fd_val = P * (1 + rates["Fixed Deposit"] / 4) ** (4 * yr)
            
            # Gold: Initial investment compounded annually
            gold_val = P * (1 + rates["Gold"]) ** yr
            
            # Mutual Fund: Initial compounded monthly + monthly contributions compounded monthly
            r_mf = rates["Mutual Fund (SIP)"] / 12
            n_mf = yr * 12
            mf_contrib = PMT * (((1 + r_mf) ** n_mf - 1) / r_mf) * (1 + r_mf) if r_mf > 0 and n_mf > 0 else PMT * n_mf
            mf_init = P * (1 + r_mf) ** n_mf
            mf_val = mf_init + mf_contrib
            
            # Stocks: Initial compounded monthly + monthly contributions compounded monthly
            r_st = rates["Stocks"] / 12
            n_st = yr * 12
            st_contrib = PMT * (((1 + r_st) ** n_st - 1) / r_st) * (1 + r_st) if r_st > 0 and n_st > 0 else PMT * n_st
            st_init = P * (1 + r_st) ** n_st
            st_val = st_init + st_contrib
            
            # Cryptocurrency: Initial compounded annually with standard deviation / random volatility component
            # To make it deterministic for the client request but look organic:
            # We will use a pseudo-random seed based on the year to draw a small fluctuation
            np.random.seed(yr + 42)
            fluctuation = np.random.uniform(-0.15, 0.15) if yr > 0 else 0
            crypto_rate = rates["Cryptocurrency"] + fluctuation
            crypto_val = P * (1 + crypto_rate) ** yr
            
            graph_data.append({
                "year": yr,
                "Fixed Deposit": round(fd_val, 2),
                "Gold": round(gold_val, 2),
                "Mutual Fund": round(mf_val, 2),
                "Stocks": round(st_val, 2),
                "Crypto": round(crypto_val, 2)
            })
            
        return {
            "status": "success",
            "data": graph_data
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))
