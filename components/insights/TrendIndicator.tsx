import { ArrowUp, ArrowDown, Minus, TrendingUp, TrendingDown } from 'lucide-react';

interface TrendIndicatorProps {
  direction: 'up' | 'down' | 'stable' | string;
  value?: number;
  size?: 'sm' | 'md' | 'lg';
  showArrow?: boolean;
  showValue?: boolean;
  unit?: string;
}

export function TrendIndicator({ 
  direction, 
  value, 
  size = 'md', 
  showArrow = true, 
  showValue = true,
  unit = '%'
}: TrendIndicatorProps) {
  const getConfig = () => {
    switch (direction) {
      case 'up':
        return {
          icon: showArrow ? ArrowUp : TrendingUp,
          color: 'text-green-600',
          bgColor: 'bg-green-100',
          textColor: 'text-green-800'
        };
      case 'down':
        return {
          icon: showArrow ? ArrowDown : TrendingDown,
          color: 'text-red-600',
          bgColor: 'bg-red-100',
          textColor: 'text-red-800'
        };
      default:
        return {
          icon: Minus,
          color: 'text-gray-600',
          bgColor: 'bg-gray-100',
          textColor: 'text-gray-800'
        };
    }
  };

  const config = getConfig();
  const Icon = config.icon;
  
  const iconSize = size === 'sm' ? 'h-3 w-3' : size === 'lg' ? 'h-5 w-5' : 'h-4 w-4';
  const textSize = size === 'sm' ? 'text-xs' : size === 'lg' ? 'text-base' : 'text-sm';

  return (
    <div className="flex items-center space-x-1">
      <Icon className={`${iconSize} ${config.color}`} />
      {showValue && value !== undefined && (
        <span className={`${textSize} font-medium ${config.color}`}>
          {value > 0 ? '+' : ''}{value}{unit}
        </span>
      )}
    </div>
  );
}

export function TrendBadge({ direction, value, unit = '%' }: { 
  direction: 'up' | 'down' | 'stable' | string; 
  value?: number; 
  unit?: string;
}) {
  const getConfig = () => {
    switch (direction) {
      case 'up':
        return { bg: 'bg-green-100', text: 'text-green-800', icon: ArrowUp };
      case 'down':
        return { bg: 'bg-red-100', text: 'text-red-800', icon: ArrowDown };
      default:
        return { bg: 'bg-gray-100', text: 'text-gray-800', icon: Minus };
    }
  };

  const config = getConfig();
  const Icon = config.icon;

  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${config.bg} ${config.text}`}>
      <Icon className="h-3 w-3 mr-1" />
      {value !== undefined && (
        <>
          {value > 0 ? '+' : ''}{value}{unit}
        </>
      )}
      {value === undefined && direction}
    </span>
  );
}