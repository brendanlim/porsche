import { 
  BarChart3, 
  Target, 
  Zap, 
  Activity, 
  DollarSign, 
  Clock,
  Users,
  TrendingUp,
  Calendar,
  Database
} from 'lucide-react';

interface MetricCardProps {
  title: string;
  value: string | number;
  icon: React.ElementType;
  iconColor: string;
  iconBgColor: string;
  subtitle?: string;
  trend?: {
    value: number;
    direction: 'up' | 'down';
  };
}

export function MetricCard({ 
  title, 
  value, 
  icon: Icon, 
  iconColor, 
  iconBgColor, 
  subtitle,
  trend 
}: MetricCardProps) {
  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex items-center">
        <div className={`p-2 ${iconBgColor} rounded-lg`}>
          <Icon className={`h-6 w-6 ${iconColor}`} />
        </div>
        <div className="ml-4 flex-1">
          <p className="text-sm font-medium text-gray-500">{title}</p>
          <div className="flex items-baseline space-x-2">
            <p className="text-2xl font-bold text-gray-900">{value}</p>
            {trend && (
              <span className={`text-sm font-medium ${
                trend.direction === 'up' ? 'text-green-600' : 'text-red-600'
              }`}>
                {trend.direction === 'up' ? '+' : ''}{trend.value}%
              </span>
            )}
          </div>
          {subtitle && (
            <p className="text-xs text-gray-500 mt-1">{subtitle}</p>
          )}
        </div>
      </div>
    </div>
  );
}

interface InsightMetricsProps {
  totalInsights: number;
  totalPredictions: number;
  activeModels: number;
  avgConfidence: number;
  dataPoints?: number;
  lastUpdate?: Date;
}

export function InsightMetrics({ 
  totalInsights, 
  totalPredictions, 
  activeModels, 
  avgConfidence,
  dataPoints,
  lastUpdate
}: InsightMetricsProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
      <MetricCard
        title="Total Insights"
        value={totalInsights.toLocaleString()}
        icon={BarChart3}
        iconColor="text-blue-600"
        iconBgColor="bg-blue-100"
        subtitle={`${totalPredictions} predictions included`}
      />

      <MetricCard
        title="Active Predictions"
        value={totalPredictions}
        icon={Target}
        iconColor="text-green-600"
        iconBgColor="bg-green-100"
        subtitle="Monitoring accuracy"
      />

      <MetricCard
        title="Models Tracked"
        value={activeModels}
        icon={Zap}
        iconColor="text-yellow-600"
        iconBgColor="bg-yellow-100"
        subtitle="Across all Porsche lines"
      />

      <MetricCard
        title="Avg Confidence"
        value={`${Math.round(avgConfidence)}%`}
        icon={Activity}
        iconColor="text-purple-600"
        iconBgColor="bg-purple-100"
        subtitle={avgConfidence >= 75 ? "High accuracy" : avgConfidence >= 60 ? "Good accuracy" : "Improving"}
      />

      {dataPoints && (
        <MetricCard
          title="Data Points"
          value={dataPoints.toLocaleString()}
          icon={Database}
          iconColor="text-indigo-600"
          iconBgColor="bg-indigo-100"
          subtitle="Analyzed this period"
        />
      )}

      {lastUpdate && (
        <MetricCard
          title="Last Updated"
          value={lastUpdate.toLocaleTimeString()}
          icon={Clock}
          iconColor="text-gray-600"
          iconBgColor="bg-gray-100"
          subtitle={lastUpdate.toLocaleDateString()}
        />
      )}
    </div>
  );
}

interface QuickStatsProps {
  stats: Array<{
    label: string;
    value: string | number;
    change?: number;
    trend?: 'up' | 'down' | 'stable';
  }>;
}

export function QuickStats({ stats }: QuickStatsProps) {
  return (
    <div className="bg-white rounded-lg shadow p-6 mb-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Market Overview</h3>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {stats.map((stat, index) => (
          <div key={index} className="text-center">
            <div className="text-2xl font-bold text-gray-900">{stat.value}</div>
            <div className="text-sm text-gray-500">{stat.label}</div>
            {stat.change !== undefined && (
              <div className={`text-xs font-medium mt-1 ${
                stat.change > 0 ? 'text-green-600' : 
                stat.change < 0 ? 'text-red-600' : 'text-gray-600'
              }`}>
                {stat.change > 0 ? '+' : ''}{stat.change}%
                {stat.trend && (
                  <span className="ml-1">
                    {stat.trend === 'up' ? '↗' : stat.trend === 'down' ? '↘' : '→'}
                  </span>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}