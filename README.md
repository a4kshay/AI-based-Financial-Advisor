# AI-based-Financial-Advisor

## 6.3 Discussion over results:

Comparison of forecasting accuracy among Linear Regression, ARIMA, Random Forest, and LSTM Momentum are done based on the multi-model prediction evaluations:

1. **ARIMA vs. Linear Regression**:
   - The performance of the ARIMA model was compared to that of the Linear Regression model, a simple approach which is predominantly applied to data without complex sequential dependencies or moving averages.
   - **Accuracy Improvements**:
     - In respect of the final analysis, high predictions evidenced that ARIMA exhibited a significant gain against Linear Regression. This indicates that the fact that ARIMA possesses the ability to ascertain complex structures and trends in historical time-series data enhances its predicting productivity in comparison to Linear Regression, which might be perceived as a more simplistic model of forecasting.
     - ARIMA gave better accuracy under fluctuating circumstances, emphasizing how much more efficient ARIMA, substantively, is when handling volatile stock prices compared to straight-line regression models.

2. **Random Forest vs. ARIMA**:
   - Once ARIMA had proven to be a good candidate for stock price projection, further analysis was undertaken against another forecasting estimator, Random Forest, which utilized an ensemble learning framework to decipher the non-linear relationships in the data.
   - **Accuracy Improvements**:
     - High prediction indicated that Random Forest had performed better than ARIMA. This difference indicates that ARIMA might be a little weaker than the usage of Random Forest in modeling complex non-linear stock price dynamics.
     - Random Forest is fed on assembly shapes through embedding numerous decision trees, each modeled on various data parcels, which boosts its predictive performance through robustness in different market scenarios. 

3. **Comparison between Random Forest and LSTM Momentum**:
   - Finally, the Random Forest model was compared against the LSTM Momentum model, an advanced neural network architecture explicitly designed to excel at learning long-term sequential dependencies in time-series data.
   - **Accuracy Improvements**:
     - The analyses suggested that LSTM Momentum was the best-performing model, significantly outperforming Random Forest in overall predictive accuracy. LSTM Momentum, thus, is better at detecting deep, long-term sequential patterns and momentum shifts that might be missed by ensemble models such as Random Forest.
     - The LSTM Momentum model effectively captures both short-term volatility and long-term trends by retaining memory of past price actions. Therefore, its generalization ability for a wide variation of financial datasets is reaffirmed, making it the most perfect and suitable model chosen in this project's analysis.