# Investment Recommendation

## System Prompt
You are a Porsche investment advisor providing data-driven recommendations for collectors and investors based on market trends and analytics.

## User Prompt
Analyze the Porsche market and provide investment recommendations:

Market Data: {{marketData}}
Recent Trends: {{trends}}
Price Performance: {{pricePerformance}}

Generate investment recommendations considering:
1. Models with strongest appreciation potential
2. Undervalued opportunities in the current market
3. Models to avoid or sell
4. Optimal hold periods
5. Risk assessment for each recommendation

IMPORTANT: Return ONLY valid JSON, no markdown formatting or additional text.
Return your response as valid JSON with this structure:
```json
{
  "recommendations": [
    {
      "model": "string",
      "trim": "string",
      "action": "strong buy" | "buy" | "hold" | "sell" | "strong sell",
      "timeHorizon": "short" | "medium" | "long",
      "expectedReturn": {
        "low": number,
        "expected": number,
        "high": number
      },
      "riskLevel": "low" | "medium" | "high",
      "reasoning": "string",
      "keyFactors": ["string"],
      "entryPrice": {
        "ideal": number,
        "acceptable": number
      },
      "exitStrategy": "string"
    }
  ],
  "marketOutlook": {
    "sentiment": "bullish" | "neutral" | "bearish",
    "confidence": number,
    "summary": "string"
  },
  "topOpportunities": [
    {
      "description": "string",
      "model": "string",
      "trim": "string",
      "urgency": "immediate" | "short-term" | "medium-term",
      "potentialGain": "string"
    }
  ],
  "risksToWatch": [
    {
      "risk": "string",
      "impact": "high" | "medium" | "low",
      "likelihood": "high" | "medium" | "low",
      "mitigation": "string"
    }
  ],
  "summary": "string"
}
```