import { Shield, CheckCircle, AlertTriangle, XCircle } from 'lucide-react';

interface ConfidenceIndicatorProps {
  score?: number;
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
}

export function ConfidenceIndicator({ score, size = 'md', showLabel = true }: ConfidenceIndicatorProps) {
  if (!score) {
    return (
      <div className="flex items-center text-gray-500">
        <Shield className={`${size === 'sm' ? 'h-4 w-4' : size === 'lg' ? 'h-6 w-6' : 'h-5 w-5'} mr-1`} />
        {showLabel && <span className="text-sm">Unknown</span>}
      </div>
    );
  }

  const percentage = Math.round(score * 100);
  
  const getConfig = () => {
    if (percentage >= 90) {
      return {
        icon: CheckCircle,
        color: 'text-green-600',
        bgColor: 'bg-green-100',
        label: `${percentage}% (Very High)`,
        textColor: 'text-green-800'
      };
    }
    if (percentage >= 75) {
      return {
        icon: Shield,
        color: 'text-blue-600',
        bgColor: 'bg-blue-100',
        label: `${percentage}% (High)`,
        textColor: 'text-blue-800'
      };
    }
    if (percentage >= 60) {
      return {
        icon: AlertTriangle,
        color: 'text-yellow-600',
        bgColor: 'bg-yellow-100',
        label: `${percentage}% (Medium)`,
        textColor: 'text-yellow-800'
      };
    }
    return {
      icon: XCircle,
      color: 'text-red-600',
      bgColor: 'bg-red-100',
      label: `${percentage}% (Low)`,
      textColor: 'text-red-800'
    };
  };

  const config = getConfig();
  const Icon = config.icon;

  return (
    <div className={`flex items-center ${config.color}`}>
      <Icon className={`${size === 'sm' ? 'h-4 w-4' : size === 'lg' ? 'h-6 w-6' : 'h-5 w-5'} mr-1`} />
      {showLabel && (
        <span className={`${size === 'sm' ? 'text-xs' : 'text-sm'} font-medium`}>
          {config.label}
        </span>
      )}
    </div>
  );
}

export function ConfidenceBadge({ score }: { score?: number }) {
  if (!score) return null;

  const percentage = Math.round(score * 100);
  
  const getConfig = () => {
    if (percentage >= 90) return { bg: 'bg-green-100', text: 'text-green-800', label: 'Very High' };
    if (percentage >= 75) return { bg: 'bg-blue-100', text: 'text-blue-800', label: 'High' };
    if (percentage >= 60) return { bg: 'bg-yellow-100', text: 'text-yellow-800', label: 'Medium' };
    return { bg: 'bg-red-100', text: 'text-red-800', label: 'Low' };
  };

  const config = getConfig();

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.bg} ${config.text}`}>
      {percentage}% {config.label}
    </span>
  );
}