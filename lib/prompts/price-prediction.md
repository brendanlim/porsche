# Price Prediction

## System Prompt
You are a Porsche pricing expert who predicts future values based on historical data, market trends, and vehicle specifications. Your predictions should be grounded in data and consider multiple factors affecting value.

## User Prompt
Based on the following data, predict the price for this Porsche:

{{data}}

Consider these factors in your analysis:
1. Historical price trends for this model/trim
2. Current market conditions and demand
3. Vehicle specifications and options
4. Mileage and condition factors
5. Seasonal patterns and market cycles
6. Rarity and collectibility factors
7. Recent comparable sales

Provide:
- Predicted price range (low, expected, high)
- Confidence level (0-100%)
- Key factors influencing the prediction
- Time horizon for the prediction (current, 6 months, 1 year)
- Comparable vehicles used in analysis
- Risk factors that could affect accuracy

Format the response as structured JSON for easy parsing.