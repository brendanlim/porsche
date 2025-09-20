'use client';

import React from 'react';
import {
  RadialBarChart,
  RadialBar,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from 'recharts';
import { TrendingUp, Award, Target, AlertCircle } from 'lucide-react';

interface ConfidenceData {
  category: string;
  confidence: number;
  count: number;
  impact?: 'high' | 'medium' | 'low';
}

interface ConfidenceVisualizationProps {
  averageConfidence: number;
  confidenceBreakdown?: ConfidenceData[];
  title?: string;
  type?: 'radial' | 'pie' | 'bar';
  className?: string;
}

const CONFIDENCE_COLORS = {
  high: '#10B981',    // green-500
  medium: '#F59E0B',  // amber-500
  low: '#EF4444',     // red-500
};

const RADIAL_COLORS = ['#10B981', '#3B82F6', '#8B5CF6', '#F59E0B', '#EF4444'];

export function ConfidenceVisualization({ 
  averageConfidence,
  confidenceBreakdown = [],
  title = "Confidence Analysis",
  type = 'radial',
  className = ""
}: ConfidenceVisualizationProps) {
  // Create confidence level data
  const confidenceLevel = 
    averageConfidence >= 85 ? 'Excellent' :
    averageConfidence >= 75 ? 'High' :
    averageConfidence >= 65 ? 'Good' :
    averageConfidence >= 50 ? 'Moderate' : 'Low';

  const confidenceColor = 
    averageConfidence >= 85 ? '#10B981' :
    averageConfidence >= 75 ? '#3B82F6' :
    averageConfidence >= 65 ? '#8B5CF6' :
    averageConfidence >= 50 ? '#F59E0B' : '#EF4444';

  // Prepare radial chart data
  const radialData = [
    {
      name: 'Confidence',
      value: averageConfidence,
      fill: confidenceColor
    }
  ];

  // Prepare breakdown data
  const breakdownData = confidenceBreakdown.length > 0 ? confidenceBreakdown : [
    { category: 'High Confidence', confidence: 85, count: Math.floor(averageConfidence >= 85 ? 60 : 20), impact: 'high' as const },
    { category: 'Medium Confidence', confidence: 70, count: Math.floor(averageConfidence >= 70 ? 25 : 45), impact: 'medium' as const },
    { category: 'Low Confidence', confidence: 55, count: Math.floor(averageConfidence < 70 ? 35 : 15), impact: 'low' as const },
  ];

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-lg">
          <p className="font-medium text-sm">{data.category || label}</p>
          <p className="text-sm text-blue-600">
            Confidence: {data.confidence || data.value}%
          </p>
          {data.count && (
            <p className="text-sm text-green-600">
              Count: {data.count}
            </p>
          )}
        </div>
      );
    }
    return null;
  };

  const getIcon = () => {
    if (averageConfidence >= 85) return <Award className="h-6 w-6 text-green-600" />;
    if (averageConfidence >= 75) return <Target className="h-6 w-6 text-blue-600" />;
    if (averageConfidence >= 65) return <TrendingUp className="h-6 w-6 text-purple-600" />;
    return <AlertCircle className="h-6 w-6 text-orange-600" />;
  };

  return (
    <div className={`bg-white rounded-lg shadow p-6 ${className}`}>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
        <div className="flex items-center space-x-2">
          {getIcon()}
          <span className={`text-lg font-bold`} style={{ color: confidenceColor }}>
            {averageConfidence.toFixed(1)}%
          </span>
        </div>
      </div>

      {type === 'radial' && (
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <RadialBarChart 
              cx="50%" 
              cy="50%" 
              innerRadius="60%" 
              outerRadius="90%" 
              data={radialData}
              startAngle={90}
              endAngle={-270}
            >
              <RadialBar
                dataKey="value"
                cornerRadius={10}
                fill={confidenceColor}
              />
              <text 
                x="50%" 
                y="50%" 
                textAnchor="middle" 
                dominantBaseline="middle" 
                className="text-2xl font-bold"
                fill={confidenceColor}
              >
                {averageConfidence.toFixed(0)}%
              </text>
              <text 
                x="50%" 
                y="60%" 
                textAnchor="middle" 
                dominantBaseline="middle" 
                className="text-sm"
                fill="#6B7280"
              >
                {confidenceLevel}
              </text>
            </RadialBarChart>
          </ResponsiveContainer>
        </div>
      )}

      {type === 'pie' && (
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={breakdownData}
                cx="50%"
                cy="50%"
                outerRadius={100}
                fill="#8884d8"
                dataKey="count"
                label={({ payload }: any) => payload ? `${payload.category}: ${payload.confidence}%` : ''}
              >
                {breakdownData.map((entry, index) => (
                  <Cell 
                    key={`cell-${index}`} 
                    fill={CONFIDENCE_COLORS[entry.impact] || RADIAL_COLORS[index % RADIAL_COLORS.length]} 
                  />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      )}

      {type === 'bar' && (
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={breakdownData} margin={{ top: 5, right: 20, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis 
                dataKey="category" 
                tick={{ fontSize: 12 }}
                angle={-45}
                textAnchor="end"
                height={80}
              />
              <YAxis 
                tick={{ fontSize: 12 }}
                label={{ value: 'Count', angle: -90, position: 'insideLeft' }}
              />
              <Tooltip content={<CustomTooltip />} />
              <Bar 
                dataKey="count" 
                radius={[4, 4, 0, 0]}
                fill="#3B82F6"
              >
                {breakdownData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={CONFIDENCE_COLORS[entry.impact] || '#3B82F6'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Confidence interpretation */}
      <div className="mt-4 p-4 bg-gray-50 rounded-lg">
        <h4 className="text-sm font-medium text-gray-900 mb-2">Confidence Interpretation</h4>
        <div className="space-y-2 text-sm text-gray-600">
          <div className="flex items-center justify-between">
            <span>Overall Level:</span>
            <span className="font-medium" style={{ color: confidenceColor }}>
              {confidenceLevel}
            </span>
          </div>
          <div className="text-xs">
            {averageConfidence >= 85 && "Extremely reliable predictions with strong historical backing."}
            {averageConfidence >= 75 && averageConfidence < 85 && "High quality insights with good predictive accuracy."}
            {averageConfidence >= 65 && averageConfidence < 75 && "Solid analysis with reasonable confidence levels."}
            {averageConfidence >= 50 && averageConfidence < 65 && "Moderate confidence - use as general guidance."}
            {averageConfidence < 50 && "Lower confidence - additional validation recommended."}
          </div>
        </div>
      </div>

      {/* Breakdown summary */}
      {breakdownData.length > 0 && (
        <div className="mt-4 grid grid-cols-3 gap-4 pt-4 border-t border-gray-200">
          {breakdownData.map((item, index) => (
            <div key={index} className="text-center">
              <p className="text-xs text-gray-500">{item.category}</p>
              <p className="text-lg font-semibold" style={{ color: CONFIDENCE_COLORS[item.impact] }}>
                {item.count}
              </p>
              <p className="text-xs text-gray-400">{item.confidence}% avg</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}