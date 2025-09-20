export function InsightsLoadingState() {
  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="animate-pulse space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center space-x-3">
              <div className="h-8 w-8 bg-gray-200 rounded"></div>
              <div className="h-8 bg-gray-200 rounded w-48"></div>
            </div>
            <div className="flex items-center space-x-4">
              <div className="h-4 bg-gray-200 rounded w-32"></div>
              <div className="h-10 bg-gray-200 rounded w-24"></div>
            </div>
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center">
                  <div className="p-2 bg-gray-200 rounded-lg">
                    <div className="h-6 w-6 bg-gray-300 rounded"></div>
                  </div>
                  <div className="ml-4 flex-1">
                    <div className="h-4 bg-gray-200 rounded w-20 mb-2"></div>
                    <div className="h-8 bg-gray-200 rounded w-16"></div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Filter Bar */}
          <div className="bg-white rounded-lg shadow p-4 mb-8">
            <div className="flex flex-wrap items-center gap-4">
              <div>
                <div className="h-4 bg-gray-200 rounded w-20 mb-2"></div>
                <div className="h-10 bg-gray-200 rounded w-32"></div>
              </div>
              <div>
                <div className="h-4 bg-gray-200 rounded w-16 mb-2"></div>
                <div className="h-10 bg-gray-200 rounded w-24"></div>
              </div>
            </div>
          </div>

          {/* Insight Cards */}
          <div className="space-y-6">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="bg-white rounded-lg shadow-lg border border-gray-200 overflow-hidden">
                {/* Header */}
                <div className="p-6 border-b border-gray-200">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-2">
                        <div className="h-6 bg-gray-200 rounded-full w-16"></div>
                        <div className="h-6 bg-gray-200 rounded-full w-20"></div>
                      </div>
                      <div className="h-6 bg-gray-200 rounded w-3/4 mb-2"></div>
                      <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                    </div>
                    <div className="ml-4">
                      <div className="h-6 bg-gray-200 rounded w-24"></div>
                    </div>
                  </div>
                </div>

                {/* Content */}
                <div className="p-6 space-y-6">
                  {/* Key Findings */}
                  <div>
                    <div className="h-5 bg-gray-200 rounded w-32 mb-3"></div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {[...Array(4)].map((_, j) => (
                        <div key={j} className="bg-gray-50 rounded-lg p-3">
                          <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                          <div className="h-3 bg-gray-200 rounded w-full mb-2"></div>
                          <div className="h-5 bg-gray-200 rounded w-20"></div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Trending Models */}
                  <div>
                    <div className="h-5 bg-gray-200 rounded w-32 mb-3"></div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      {[...Array(3)].map((_, j) => (
                        <div key={j} className="bg-gray-50 rounded-lg p-3">
                          <div className="h-4 bg-gray-200 rounded w-2/3 mb-2"></div>
                          <div className="space-y-1">
                            <div className="h-3 bg-gray-200 rounded w-full"></div>
                            <div className="h-3 bg-gray-200 rounded w-full"></div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Recommendations */}
                  <div>
                    <div className="h-5 bg-gray-200 rounded w-40 mb-3"></div>
                    <div className="space-y-3">
                      {[...Array(2)].map((_, j) => (
                        <div key={j} className="border border-gray-200 rounded-lg p-3">
                          <div className="flex items-center space-x-2 mb-2">
                            <div className="h-6 bg-gray-200 rounded-full w-12"></div>
                            <div className="h-4 bg-gray-200 rounded w-24"></div>
                          </div>
                          <div className="h-4 bg-gray-200 rounded w-full mb-2"></div>
                          <div className="flex justify-between">
                            <div className="h-3 bg-gray-200 rounded w-16"></div>
                            <div className="h-3 bg-gray-200 rounded w-20"></div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export function MetricsLoadingState() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
      {[...Array(4)].map((_, i) => (
        <div key={i} className="bg-white rounded-lg shadow p-6 animate-pulse">
          <div className="flex items-center">
            <div className="p-2 bg-gray-200 rounded-lg">
              <div className="h-6 w-6 bg-gray-300 rounded"></div>
            </div>
            <div className="ml-4 flex-1">
              <div className="h-4 bg-gray-200 rounded w-20 mb-2"></div>
              <div className="h-8 bg-gray-200 rounded w-16"></div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

export function InsightCardSkeleton() {
  return (
    <div className="bg-white rounded-lg shadow-lg border border-gray-200 overflow-hidden animate-pulse">
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center space-x-2 mb-2">
              <div className="h-6 bg-gray-200 rounded-full w-16"></div>
              <div className="h-6 bg-gray-200 rounded-full w-20"></div>
            </div>
            <div className="h-6 bg-gray-200 rounded w-3/4 mb-2"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2"></div>
          </div>
          <div className="ml-4">
            <div className="h-6 bg-gray-200 rounded w-24"></div>
          </div>
        </div>
      </div>
      <div className="p-6">
        <div className="space-y-4">
          <div className="h-4 bg-gray-200 rounded w-full"></div>
          <div className="h-4 bg-gray-200 rounded w-3/4"></div>
          <div className="h-4 bg-gray-200 rounded w-1/2"></div>
        </div>
      </div>
    </div>
  );
}