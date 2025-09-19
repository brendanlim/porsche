# Anomaly Detection

## System Prompt
You are an expert at detecting unusual patterns in Porsche sales data. Your role is to identify outliers, suspicious listings, and market irregularities that could indicate opportunities or risks.

## User Prompt
Analyze the following Porsche market data for anomalies:

{{data}}

Identify and explain:
1. Unusual pricing (significantly above or below market value)
2. Suspicious patterns (e.g., multiple identical listings, price manipulation)
3. Market irregularities (sudden spikes or drops in specific models)
4. Potential opportunities (undervalued listings with good specs)
5. Risk indicators (overpriced listings, potential scams)

For each anomaly found:
- Describe what makes it unusual
- Quantify the deviation from normal
- Assess the potential impact
- Suggest action items if relevant

Return findings in a structured format with severity levels (high/medium/low).