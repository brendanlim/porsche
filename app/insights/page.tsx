'use client';

import { useState, useEffect, useCallback } from 'react';
import { RefreshCw, TrendingUp, BarChart3 } from 'lucide-react';
import { MetricsDashboard } from '@/components/insights/dashboard/MetricsDashboard';
import { TimeRangeSelector } from '@/components/insights/dashboard/TimeRangeSelector';
import { DashboardGrid, GridSection, ChartCard } from '@/components/insights/dashboard/DashboardGrid';
import { ModelComparisonChart } from '@/components/insights/charts/ModelComparisonChart';
import { PriceVsMileageScatter } from '@/components/insights/charts/PriceVsMileageScatter';
import { VolumeAnalysisChart } from '@/components/insights/charts/VolumeAnalysisChart';
import { PriceDistributionChart } from '@/components/insights/charts/PriceDistributionChart';

interface DashboardData {
  kpis: {
    totalSales: number;
    averagePrice: number;
    medianPrice: number;
    totalVolume: number;
    averageDaysToSell: number;
    topModel: string | null;
    topTrim: string | null;
    priceChange30d: number;
    volumeChange30d: number;
  };
  recentSales: Array<{
    id: string;
    model: string;
    trim: string;
    year: number;
    price: number;
    mileage: number;
    soldDate: string;
    vin: string;
    color: string;
  }>;
  modelDistribution: Array<{
    model: string;
    count: number;
    percentage: number;
    avgPrice: number;
  }>;
  trimDistribution: Array<{
    trim: string;
    count: number;
    avgPrice: number;
  }>;
  priceRanges: Array<{
    range: string;
    count: number;
  }>;
  dailyVolume: Array<{
    date: string;
    count: number;
    volume: number;
    avgPrice: number;
  }>;
  monthlyTrends: Array<{
    month: string;
    sales: number;
    avgPrice: number;
    totalVolume: number;
  }>;
}

interface ModelAnalyticsData {
  priceVsMileage: Array<{
    mileage: number;
    price: number;
    trim: string;
    year: number;
  }>;
}

export default function InsightsPage() {
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [modelAnalytics, setModelAnalytics] = useState<ModelAnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [timeRange, setTimeRange] = useState('30d');
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());

  const fetchDashboardData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch dashboard data
      const dashboardResponse = await fetch(`/api/analytics/dashboard?range=${timeRange}`);
      const dashboardJson = await dashboardResponse.json();

      if (!dashboardResponse.ok) {
        throw new Error(dashboardJson.error || 'Failed to fetch dashboard data');
      }

      setDashboardData(dashboardJson);

      // Fetch 911 analytics for price vs mileage scatter plot
      const modelResponse = await fetch(`/api/analytics/911?range=${timeRange}`);
      const modelJson = await modelResponse.json();

      if (modelResponse.ok && modelJson.priceVsMileage) {
        setModelAnalytics({ priceVsMileage: modelJson.priceVsMileage });
      }

      setLastUpdated(new Date());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      console.error('Dashboard fetch error:', err);
    } finally {
      setLoading(false);
    }
  }, [timeRange]);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="w-full px-4 sm:px-6 lg:px-8">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-1/4 mb-8"></div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 mb-8">
              {[...Array(7)].map((_, i) => (
                <div key={i} className="bg-white rounded-lg shadow p-6">
                  <div className="h-4 bg-gray-200 rounded w-24 mb-3"></div>
                  <div className="h-8 bg-gray-200 rounded w-32 mb-2"></div>
                  <div className="h-3 bg-gray-200 rounded w-20"></div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="w-full px-4 sm:px-6 lg:px-8">
          <div className="bg-red-50 border border-red-200 rounded-lg p-6">
            <h2 className="text-lg font-semibold text-red-900 mb-2">Error Loading Dashboard</h2>
            <p className="text-red-700">{error}</p>
            <button
              onClick={fetchDashboardData}
              className="mt-4 bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors"
            >
              Try Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!dashboardData) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="w-full px-4 sm:px-6 lg:px-8">
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
            <h2 className="text-lg font-semibold text-yellow-900 mb-2">No Data Available</h2>
            <p className="text-yellow-700">No market data is available for the selected time range.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="w-full px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 flex items-center">
                <BarChart3 className="h-8 w-8 text-blue-600 mr-3" />
                Market Analytics Dashboard
              </h1>
              <p className="text-lg text-gray-600 mt-2">
                Real-time analysis of Porsche sports car market data
              </p>
            </div>
            <div className="flex items-center gap-4">
              <TimeRangeSelector value={timeRange} onChange={setTimeRange} />
              <button
                onClick={fetchDashboardData}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh
              </button>
            </div>
          </div>
          <div className="mt-2 text-sm text-gray-500">
            Last updated: {lastUpdated.toLocaleString()}
          </div>
        </div>

        <DashboardGrid>
          {/* KPI Metrics */}
          <GridSection fullWidth columns={1}>
            <MetricsDashboard data={dashboardData.kpis} />
          </GridSection>

          {/* Volume Analysis and Model Comparison */}
          <GridSection fullWidth columns={2}>
            <ChartCard
              title="Sales Volume Trends"
              description="Daily sales activity and market volume"
            >
              <VolumeAnalysisChart data={dashboardData.dailyVolume} type="area" />
            </ChartCard>

            <ChartCard
              title="Model Performance"
              description="Sales volume and average price by model"
            >
              <ModelComparisonChart data={dashboardData.modelDistribution} />
            </ChartCard>
          </GridSection>

          {/* Price Distribution and Scatter Plot */}
          <GridSection fullWidth columns={2}>
            <ChartCard
              title="Price Distribution"
              description="Market segmentation by price range"
            >
              <PriceDistributionChart
                data={dashboardData.priceRanges.map(r => ({
                  range: r.range,
                  count: r.count,
                  avgPrice: 0 // Not used in pie chart
                }))}
                type="pie"
              />
            </ChartCard>

            {modelAnalytics?.priceVsMileage && (
              <ChartCard
                title="Price vs Mileage Analysis"
                description="Price depreciation patterns across mileage"
              >
                <PriceVsMileageScatter
                  data={modelAnalytics.priceVsMileage}
                  height={300}
                />
              </ChartCard>
            )}
          </GridSection>

          {/* Trim Analysis */}
          <GridSection fullWidth columns={1}>
            <ChartCard
              title="Top Trims by Average Price"
              description="Premium trim levels and their market values"
            >
              <ModelComparisonChart
                data={dashboardData.trimDistribution.map(t => ({
                  model: t.trim,
                  count: t.count,
                  avgPrice: t.avgPrice
                }))}
                height={400}
              />
            </ChartCard>
          </GridSection>

          {/* Monthly Trends */}
          <GridSection fullWidth columns={1}>
            <ChartCard
              title="Monthly Market Trends"
              description="Long-term market performance and volume analysis"
            >
              <VolumeAnalysisChart
                data={dashboardData.monthlyTrends.map(m => ({
                  date: m.month,
                  count: m.sales,
                  volume: m.totalVolume,
                  avgPrice: m.avgPrice
                }))}
                type="line"
                height={350}
              />
            </ChartCard>
          </GridSection>

          {/* Recent Sales Table */}
          <GridSection fullWidth columns={1}>
            <ChartCard
              title="Recent Sales"
              description="Latest transactions in the market"
              noPadding
            >
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Vehicle
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Price
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Mileage
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Color
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Sold Date
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {dashboardData.recentSales.map((sale) => (
                      <tr key={sale.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {sale.year} {sale.model} {sale.trim}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          ${sale.price.toLocaleString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {sale.mileage ? `${sale.mileage.toLocaleString()} mi` : 'N/A'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {sale.color || 'N/A'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {new Date(sale.soldDate).toLocaleDateString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </ChartCard>
          </GridSection>
        </DashboardGrid>

        {/* Footer */}
        <div className="mt-12 bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center">
            <TrendingUp className="h-5 w-5 text-blue-600 mr-2" />
            <p className="text-sm text-blue-800">
              <strong>Data-Driven Insights:</strong> All analytics are based on actual market transactions from multiple sources.
              Data is updated regularly to reflect current market conditions.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}