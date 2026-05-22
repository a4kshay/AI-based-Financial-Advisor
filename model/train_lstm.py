import yfinance as yf
import pandas as pd
import numpy as np
import os
from sklearn.preprocessing import MinMaxScaler

# Conditionally import tensorflow to avoid crash if not installed
try:
    from tensorflow.keras.models import Sequential
    from tensorflow.keras.layers import LSTM, Dense, Dropout
    import tensorflow as tf
except ImportError:
    print("TensorFlow not installed. Please install it first.")
    exit()

def download_dataset(ticker="AAPL", period="5y"):
    print(f"Downloading {period} dataset for {ticker}...")
    stock = yf.Ticker(ticker)
    df = stock.history(period=period)
    
    # Save to dataset folder
    os.makedirs("../dataset", exist_ok=True)
    csv_path = f"../dataset/{ticker}_historical.csv"
    df.to_csv(csv_path)
    print(f"Dataset saved to {csv_path}")
    return df

def train_lstm(ticker="AAPL"):
    df = download_dataset(ticker)
    
    # Preprocessing
    data = df.filter(['Close']).values
    scaler = MinMaxScaler(feature_range=(0, 1))
    scaled_data = scaler.fit_transform(data)
    
    # Split into train and test
    training_data_len = int(np.ceil(len(data) * 0.8))
    train_data = scaled_data[0:int(training_data_len), :]
    
    x_train, y_train = [], []
    for i in range(60, len(train_data)):
        x_train.append(train_data[i-60:i, 0])
        y_train.append(train_data[i, 0])
        
    x_train, y_train = np.array(x_train), np.array(y_train)
    x_train = np.reshape(x_train, (x_train.shape[0], x_train.shape[1], 1))
    
    # Build LSTM Model
    print("Building LSTM Model...")
    model = Sequential()
    model.add(LSTM(units=50, return_sequences=True, input_shape=(x_train.shape[1], 1)))
    model.add(Dropout(0.2))
    model.add(LSTM(units=50, return_sequences=False))
    model.add(Dropout(0.2))
    model.add(Dense(units=25))
    model.add(Dense(units=1))
    
    model.compile(optimizer='adam', loss='mean_squared_error')
    
    # Train the Model
    print("Training Model... This may take a while depending on your CPU/GPU.")
    model.fit(x_train, y_train, batch_size=32, epochs=5)
    
    # Save the model
    os.makedirs("../model", exist_ok=True)
    model.save(f"../model/{ticker}_lstm_model.keras")
    print(f"Model successfully trained and saved to ../model/{ticker}_lstm_model.keras")

if __name__ == "__main__":
    import argparse
    parser = argparse.ArgumentParser(description='Train LSTM for Stock Prediction')
    parser.add_argument('--ticker', type=str, default='AAPL', help='Stock Ticker to train on')
    args = parser.parse_args()
    
    train_lstm(args.ticker)
