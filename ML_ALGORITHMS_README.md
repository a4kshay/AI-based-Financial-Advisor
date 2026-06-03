# AI & ML Algorithms for Stock Price Prediction

This document provides a comprehensive end-to-end explanation of the algorithms and Machine Learning (ML) models used in this project for analyzing and predicting stock prices. 

## Table of Contents
1. [Overview of Used Algorithms](#overview-of-used-algorithms)
   - [1. Linear Regression](#1-linear-regression)
   - [2. ARIMA](#2-arima)
   - [3. Random Forest](#3-random-forest)
   - [4. LSTM Momentum (Primary Model)](#4-lstm-momentum-primary-model)
2. [Deep Dive: LSTM Neural Network](#deep-dive-lstm-neural-network)
3. [End-to-End Implementation Workflow](#end-to-end-implementation-workflow)
4. [Code Walkthrough: `train_lstm.py`](#code-walkthrough-train_lstmpy)
5. [Model Evaluation & Conclusion](#model-evaluation--conclusion)

---

## Overview of Used Algorithms

Throughout the development of this project, multiple models were evaluated to determine the most effective approach for forecasting stock prices.

### 1. Linear Regression
**What it is:** Linear Regression is a fundamental statistical approach that models the relationship between a dependent variable (stock price) and one or more independent variables (time, historical prices) by fitting a linear equation to observed data.
**Role in this project:** Used as a baseline model. It assumes a straight-line relationship, making it too simplistic for highly volatile and non-linear stock market data.

### 2. ARIMA (AutoRegressive Integrated Moving Average)
**What it is:** ARIMA is a classical time-series forecasting model. It combines autoregression (using past values), differencing (to make data stationary), and moving averages (to model noise).
**Role in this project:** Served as an intermediate baseline. ARIMA is better than Linear Regression at capturing complex structures and trends. However, it struggles with highly non-linear dynamics and volatile stock shifts.

### 3. Random Forest
**What it is:** An ensemble learning method that constructs a multitude of decision trees during training and outputs the average prediction of the individual trees.
**Role in this project:** Evaluated for its ability to decipher non-linear relationships. Random Forest performs robustly across different market scenarios, outperforming ARIMA. However, it lacks an inherent understanding of sequential time dependencies.

### 4. LSTM Momentum (Primary Model)
**What it is:** LSTM (Long Short-Term Memory) is a highly advanced Recurrent Neural Network (RNN) architecture explicitly designed to learn and remember long-term sequential dependencies in time-series data. 
**Role in this project:** This is the **final chosen model** for the platform. It effectively captures both short-term volatility and long-term momentum shifts by retaining a memory of past price actions.

---

## Deep Dive: LSTM Neural Network

LSTM networks are uniquely suited for stock prediction because they can "remember" important historical data while "forgetting" irrelevant noise. 

**Key Mechanisms:**
- **Cell State:** The "memory" of the network that carries information throughout the sequence processing.
- **Gates:** Mechanisms that regulate information flow:
  - *Forget Gate:* Decides what information from the past should be discarded.
  - *Input Gate:* Decides what new information should be added to the memory.
  - *Output Gate:* Decides what the next hidden state should be, forming the prediction.

In the context of this project, the LSTM looks at the past **60 days of closing prices** to predict the **price on the 61st day**.

---

## End-to-End Implementation Workflow

The end-to-end stock prediction pipeline consists of the following stages:

1. **Data Acquisition:** Live historical market data is fetched using the `yfinance` API.
2. **Data Preprocessing:** The data is filtered (extracting only 'Close' prices) and scaled down to a range of 0 to 1 to help the neural network converge faster during training.
3. **Dataset Creation:** The data is segmented into overlapping windows of 60 days (X) and the subsequent day's price (Y).
4. **Model Training:** The LSTM model is built using TensorFlow/Keras and trained on 80% of the historical dataset.
5. **Prediction & Serving:** The trained model `.keras` file is saved, which the FastAPI backend can load to serve real-time predictions to the React frontend.

---

## Code Walkthrough: `train_lstm.py`

The `model/train_lstm.py` script handles the complete training lifecycle. Here is a step-by-step breakdown of how the code works:

### 1. Downloading the Dataset
```python
def download_dataset(ticker="AAPL", period="5y"):
```
This function uses the `yfinance` library to download the last 5 years of historical stock data for a given ticker (e.g., Apple - AAPL). It saves the raw data as a CSV file in the `dataset/` folder for reproducibility.

### 2. Preprocessing Data
```python
data = df.filter(['Close']).values
scaler = MinMaxScaler(feature_range=(0, 1))
scaled_data = scaler.fit_transform(data)
```
We isolate the `Close` price (the final price of the stock on a given day). The `MinMaxScaler` is then used to normalize these prices between 0 and 1. Normalization is critical for Neural Networks to prevent large numbers from dominating the learning process.

### 3. Creating the Training Sequences
```python
x_train, y_train = [], []
for i in range(60, len(train_data)):
    x_train.append(train_data[i-60:i, 0])
    y_train.append(train_data[i, 0])
```
The script structures the data for the LSTM. It creates `x_train` blocks containing 60 days of historical prices. The corresponding `y_train` is the 61st day's price. This sliding window approach teaches the model sequence dependencies.

### 4. Building the LSTM Architecture
```python
model = Sequential()
model.add(LSTM(units=50, return_sequences=True, input_shape=(x_train.shape[1], 1)))
model.add(Dropout(0.2))
model.add(LSTM(units=50, return_sequences=False))
model.add(Dropout(0.2))
model.add(Dense(units=25))
model.add(Dense(units=1))
```
- **Sequential API**: Initializes a linear stack of neural network layers.
- **First LSTM Layer (50 units)**: Reads the 60-day sequence. `return_sequences=True` passes the full sequence to the next layer.
- **Dropout (0.2)**: Randomly disables 20% of neurons during training to prevent over-reliance on specific nodes, reducing **overfitting**.
- **Second LSTM Layer (50 units)**: Condenses the learned sequence into a single feature vector.
- **Dense Layers (25 & 1 units)**: Standard fully connected layers that map the complex features extracted by LSTMs down to a single predicted price value (the output).

### 5. Compiling and Training
```python
model.compile(optimizer='adam', loss='mean_squared_error')
model.fit(x_train, y_train, batch_size=32, epochs=5)
```
- **Adam Optimizer**: Dynamically adjusts the learning rate to find the minimum error efficiently.
- **Mean Squared Error (MSE)**: The loss function that measures the distance between the predicted price and the actual price.
- **Training (fit)**: The model processes the data in batches of 32 over 5 complete passes (epochs).

### 6. Saving the Model
```python
model.save(f"../model/{ticker}_lstm_model.keras")
```
Once fully trained, the model's weights and architecture are saved to disk. The backend API can directly load this `.keras` file to infer future predictions without retraining.

---

## Model Evaluation & Conclusion

Based on multi-model prediction evaluations conducted during the project lifecycle:

- **Linear Regression** was too rigid for the volatile nature of stocks.
- **ARIMA** showed significant gains by capturing moving averages and trends but struggled with non-linear spikes.
- **Random Forest** outperformed ARIMA by mapping complex non-linear relationships but lacked temporal awareness.
- **LSTM Momentum** emerged as the definitive winner. By retaining a memory of past price actions, it effectively captures both short-term volatility and long-term sequential momentum shifts. Its superior generalization ability across varying financial datasets makes it the ideal engine for this AI Financial Advisor platform.
