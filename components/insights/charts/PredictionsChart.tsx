'use client';

import { LineChart, Line, Area, AreaChart, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine } from 'recharts';
import { TrendingUp, TrendingDown, AlertTriangle, Brain } from 'lucide-react';

interface PredictionData {
  date: string;
  actualPrice?: number;
  predictedPrice: number;
  confidence: number;
  trend: 'up' | 'down' | 'stable';
}

interface PredictionsChartProps {
  historicalData: Array<{ date: string; price: number }>;
  predictions: PredictionData[];
  className?: string;
  height?: number;
  showConfidence?: boolean;
}

export function PredictionsChart({
  historicalData,
  predictions,
  className = '',
  height = 400,
  showConfidence = true
}: PredictionsChartProps) {
  // Combine historical and prediction data
  const combinedData = [
    ...historicalData.map(h => ({
      date: h.date,
      actualPrice: h.price,
      predictedPrice: null,
      confidence: null
    })),
    ...predictions.map(p => ({
      date: p.date,
      actualPrice: p.actualPrice || null,
      predictedPrice: p.predictedPrice,
      confidence: p.confidence * 100 // Convert to percentage
    }))
  ];

  const formatPrice = (value: number) => {
    if (value >= 1000000) {
      return `$${(value / 1000000).toFixed(1)}M`;
    } else if (value >= 1000) {
      return `$${(value / 1000).toFixed(0)}K`;
    }
    return `$${value}`;
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return `${date.getMonth() + 1}/${date.getDate()}`;
  };

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      const isPrediction = data.predictedPrice !== null;

      return (
        <div className="bg-white p-3 rounded-lg shadow-lg border border-gray-200">
          <p className="font-semibold text-gray-900 flex items-center">
            {new Date(label).toLocaleDateString()}
            {isPrediction && (
              <Brain className="h-4 w-4 ml-2 text-purple-500" />
            )}
          </p>
          {data.actualPrice && (
            <p className="text-sm text-blue-600">
              Actual: {formatPrice(data.actualPrice)}
            </p>
          )}
          {data.predictedPrice && (
            <p className="text-sm text-purple-600">
              Predicted: {formatPrice(data.predictedPrice)}
            </p>
          )}
          {data.confidence && showConfidence && (
            <p className="text-sm text-gray-500">
              Confidence: {data.confidence.toFixed(1)}%
            </p>
          )}
        </div>
      );
    }
    return null;
  };

  // Calculate prediction accuracy if we have both actual and predicted values
  const accuracy = predictions.filter(p => p.actualPrice).reduce((acc, p) => {
    if (!p.actualPrice) return acc;
    const error = Math.abs(p.predictedPrice - p.actualPrice) / p.actualPrice;
    return acc + (1 - error);
  }, 0) / predictions.filter(p => p.actualPrice).length * 100;

  // Determine overall trend
  const lastPrediction = predictions[predictions.length - 1];
  const firstPrediction = predictions[0];
  const overallTrend = lastPrediction && firstPrediction
    ? lastPrediction.predictedPrice > firstPrediction.predictedPrice ? 'up' : 'down'
    : 'stable';

  return (
    <div className={className}>
      {/* Header with metrics */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-4">
          {overallTrend === 'up' ? (
            <div className="flex items-center text-green-600">
              <TrendingUp className="h-5 w-5 mr-1" />
              <span className="text-sm font-medium">Upward Trend</span>
            </div>
          ) : overallTrend === 'down' ? (
            <div className="flex items-center text-red-600">
              <TrendingDown className="h-5 w-5 mr-1" />
              <span className="text-sm font-medium">Downward Trend</span>
            </div>
          ) : (
            <div className="flex items-center text-gray-600">
              <AlertTriangle className="h-5 w-5 mr-1" />
              <span className="text-sm font-medium">Stable</span>
            </div>
          )}
          {!isNaN(accuracy) && (
            <div className="text-sm text-gray-600">
              Accuracy: <span className="font-medium">{accuracy.toFixed(1)}%</span>
            </div>
          )}
        </div>
        <div className="flex items-center text-xs text-gray-500">
          <Brain className="h-4 w-4 mr-1" />
          AI-Generated Predictions
        </div>
      </div>

      {/* Chart */}
      <ResponsiveContainer width="100%" height={height}>
        <AreaChart
          data={combinedData}
          margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
        >
          <defs>
            <linearGradient id="colorActual" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.8}/>
              <stop offset="95%" stopColor="#3B82F6" stopOpacity={0.1}/>
            </linearGradient>
            <linearGradient id="colorPredicted" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#8B5CF6" stopOpacity={0.8}/>
              <stop offset="95%" stopColor="#8B5CF6" stopOpacity={0.1}/>
            </linearGradient>
            <linearGradient id="colorConfidence" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#10B981" stopOpacity={0.4}/>
              <stop offset="95%" stopColor="#10B981" stopOpacity={0.05}/>
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis
            dataKey="date"
            tick={{ fontSize: 12 }}
            tickFormatter={formatDate}
          />
          <YAxis
            yAxisId="price"
            tick={{ fontSize: 12 }}
            tickFormatter={formatPrice}
            label={{ value: 'Price', angle: -90, position: 'insideLeft' }}
          />
          {showConfidence && (
            <YAxis
              yAxisId="confidence"
              orientation="right"
              tick={{ fontSize: 12 }}
              domain={[0, 100]}
              label={{ value: 'Confidence %', angle: 90, position: 'insideRight' }}
            />
          )}
          <Tooltip content={<CustomTooltip />} />
          <Legend />

          {/* Vertical line to separate historical from predictions */}
          {historicalData.length > 0 && predictions.length > 0 && (
            <ReferenceLine
              x={historicalData[historicalData.length - 1].date}
              stroke="#9CA3AF"
              strokeDasharray="5 5"
              label={{ value: "Today", position: "top" }}
            />
          )}

          <Area
            yAxisId="price"
            type="monotone"
            dataKey="actualPrice"
            stroke="#3B82F6"
            fillOpacity={1}
            fill="url(#colorActual)"
            name="Historical"
            strokeWidth={2}
            connectNulls={false}
          />
          <Area
            yAxisId="price"
            type="monotone"
            dataKey="predictedPrice"
            stroke="#8B5CF6"
            fillOpacity={1}
            fill="url(#colorPredicted)"
            name="Predicted"
            strokeWidth={2}
            strokeDasharray="5 5"
            connectNulls={false}
          />
          {showConfidence && (
            <Area
              yAxisId="confidence"
              type="monotone"
              dataKey="confidence"
              stroke="#10B981"
              fillOpacity={1}
              fill="url(#colorConfidence)"
              name="Confidence"
              strokeWidth={1}
              connectNulls={false}
            />
          )}
        </AreaChart>
      </ResponsiveContainer>

      {/* Legend explanation */}
      <div className="mt-4 text-xs text-gray-500 border-t pt-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="flex items-center">
              <div className="w-3 h-3 bg-blue-500 rounded mr-1"></div>
              <span>Historical Data</span>
            </div>
            <div className="flex items-center">
              <div className="w-3 h-3 bg-purple-500 rounded mr-1"></div>
              <span>AI Predictions</span>
            </div>
            {showConfidence && (
              <div className="flex items-center">
                <div className="w-3 h-3 bg-green-500 rounded mr-1"></div>
                <span>Confidence Level</span>
              </div>
            )}
          </div>
          <span className="text-gray-400">
            Predictions update daily via AI analysis
          </span>
        </div>
      </div>
    </div>
  );
}