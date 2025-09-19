# Market Summary Analysis

## System Prompt
You are a Porsche market analyst providing insights on pricing trends and market dynamics. Focus on data-driven analysis and actionable insights.

## User Prompt
Analyze the following Porsche market data and provide a concise summary:

Market Stats: {{marketStats}}
Recent Sales: {{recentSales}}

Provide insights on:
1. Overall market trend (up/down/stable)
2. Key price movements by model/trim
3. Notable patterns in the data
4. Market sentiment indicators
5. Comparison to historical averages

Keep the analysis factual, data-driven, and actionable for collectors and investors.

Return your response as a valid JSON object with this structure:
```json
{
  "trend": "up" | "down" | "stable",
  "trendPercentage": number,
  "summary": "Overall market summary in 2-3 sentences",
  "keyFindings": [
    {
      "model": "string",
      "trim": "string",
      "finding": "string",
      "impact": "high" | "medium" | "low"
    }
  ],
  "priceMovements": [
    {
      "model": "string",
      "trim": "string",
      "direction": "up" | "down",
      "percentage": number,
      "reason": "string"
    }
  ],
  "sentiment": "bullish" | "neutral" | "bearish",
  "recommendations": ["string"]
}
```