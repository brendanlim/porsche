import { AlertTriangle, RefreshCw, Brain, Wifi, Server } from 'lucide-react';

interface ErrorStateProps {
  error: string;
  onRetry: () => void;
  type?: 'network' | 'server' | 'data' | 'general';
}

export function ErrorState({ error, onRetry, type = 'general' }: ErrorStateProps) {
  const getConfig = () => {
    switch (type) {
      case 'network':
        return {
          icon: Wifi,
          title: 'Connection Error',
          description: 'Unable to connect to our servers. Please check your internet connection.',
          color: 'blue'
        };
      case 'server':
        return {
          icon: Server,
          title: 'Server Error',
          description: 'Our servers are experiencing issues. Please try again in a few moments.',
          color: 'red'
        };
      case 'data':
        return {
          icon: Brain,
          title: 'Data Processing Error',
          description: 'There was an issue processing the market insights data.',
          color: 'yellow'
        };
      default:
        return {
          icon: AlertTriangle,
          title: 'Error Loading Insights',
          description: 'Something went wrong while loading the market insights.',
          color: 'red'
        };
    }
  };

  const config = getConfig();
  const Icon = config.icon;

  const containerClass = config.color === 'blue' ? 'bg-blue-50 border-blue-200' :
                        config.color === 'yellow' ? 'bg-yellow-50 border-yellow-200' :
                        'bg-red-50 border-red-200';
  
  const iconClass = config.color === 'blue' ? 'text-blue-600' :
                   config.color === 'yellow' ? 'text-yellow-600' :
                   'text-red-600';
  
  const titleClass = config.color === 'blue' ? 'text-blue-900' :
                    config.color === 'yellow' ? 'text-yellow-900' :
                    'text-red-900';
  
  const textClass = config.color === 'blue' ? 'text-blue-700' :
                   config.color === 'yellow' ? 'text-yellow-700' :
                   'text-red-700';
  
  const subtextClass = config.color === 'blue' ? 'text-blue-600' :
                      config.color === 'yellow' ? 'text-yellow-600' :
                      'text-red-600';
  
  const buttonClass = config.color === 'blue' ? 'bg-blue-600 hover:bg-blue-700' :
                     config.color === 'yellow' ? 'bg-yellow-600 hover:bg-yellow-700' :
                     'bg-red-600 hover:bg-red-700';

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className={`${containerClass} border rounded-lg p-8 text-center max-w-md mx-auto`}>
          <Icon className={`h-16 w-16 ${iconClass} mx-auto mb-4`} />
          <h3 className={`text-xl font-semibold ${titleClass} mb-2`}>
            {config.title}
          </h3>
          <p className={`${textClass} mb-2`}>
            {config.description}
          </p>
          <p className={`text-sm ${subtextClass} mb-6`}>
            {error}
          </p>
          <button
            onClick={onRetry}
            className={`${buttonClass} text-white px-6 py-3 rounded-lg transition-colors flex items-center mx-auto`}
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Try Again
          </button>
        </div>
      </div>
    </div>
  );
}

export function NoDataState({ onRefresh }: { onRefresh: () => void }) {
  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-8 text-center max-w-md mx-auto">
          <Brain className="h-16 w-16 text-blue-600 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-blue-900 mb-2">
            Insights Coming Soon
          </h3>
          <p className="text-blue-700 mb-2">
            Our AI is analyzing market data to generate comprehensive insights.
          </p>
          <p className="text-sm text-blue-600 mb-6">
            Check back soon for the latest market intelligence and trends analysis.
          </p>
          <button
            onClick={onRefresh}
            className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors flex items-center mx-auto"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Check for Updates
          </button>
        </div>
      </div>
    </div>
  );
}

interface InlineErrorProps {
  error: string;
  onRetry?: () => void;
  className?: string;
}

export function InlineError({ error, onRetry, className = '' }: InlineErrorProps) {
  return (
    <div className={`bg-red-50 border border-red-200 rounded-lg p-4 ${className}`}>
      <div className="flex items-center">
        <AlertTriangle className="h-5 w-5 text-red-600 mr-3 flex-shrink-0" />
        <div className="flex-1">
          <p className="text-sm text-red-800">{error}</p>
        </div>
        {onRetry && (
          <button
            onClick={onRetry}
            className="ml-3 text-red-600 hover:text-red-700 text-sm font-medium flex items-center"
          >
            <RefreshCw className="h-4 w-4 mr-1" />
            Retry
          </button>
        )}
      </div>
    </div>
  );
}

export function PartialError({ 
  message, 
  onDismiss, 
  onRetry 
}: { 
  message: string; 
  onDismiss?: () => void; 
  onRetry?: () => void; 
}) {
  return (
    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
      <div className="flex items-start">
        <AlertTriangle className="h-5 w-5 text-yellow-600 mr-3 flex-shrink-0 mt-0.5" />
        <div className="flex-1">
          <h4 className="text-sm font-medium text-yellow-800 mb-1">
            Partial Data Available
          </h4>
          <p className="text-sm text-yellow-700">{message}</p>
        </div>
        <div className="ml-3 flex space-x-2">
          {onRetry && (
            <button
              onClick={onRetry}
              className="text-yellow-600 hover:text-yellow-700 text-sm font-medium"
            >
              Retry
            </button>
          )}
          {onDismiss && (
            <button
              onClick={onDismiss}
              className="text-yellow-600 hover:text-yellow-700 text-sm font-medium"
            >
              Dismiss
            </button>
          )}
        </div>
      </div>
    </div>
  );
}