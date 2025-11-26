import { useEffect, useState } from 'react';
import { dashboardService } from '../../services/dashboardService';
import type { KPIData } from '../../services/dashboardService';
import { TrendingUp, TrendingDown, AlertCircle, CheckCircle, DollarSign, Users } from 'lucide-react';

export function KPIDashboard() {
  const [data, setData] = useState<KPIData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const result = await dashboardService.getKPIs();
      setData(result);
      setError(null);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load KPI data');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 dark:bg-red-900/20 p-4 rounded-lg">
        <p className="text-red-600 dark:text-red-400">{error}</p>
      </div>
    );
  }

  if (!data) return null;

  const getVarianceColor = (variance: number) => {
    if (variance < 0) return 'text-green-600 dark:text-green-400';
    if (variance > 10) return 'text-red-600 dark:text-red-400';
    return 'text-yellow-600 dark:text-yellow-400';
  };

  const getVarianceIcon = (variance: number) => {
    if (variance < 0) return <TrendingDown className="w-5 h-5" />;
    return <TrendingUp className="w-5 h-5" />;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="pl-16 lg:pl-0">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">KPI Dashboard</h1>
        <p className="text-gray-600 dark:text-gray-400 mt-1">
          Key Performance Indicators and Metrics
        </p>
      </div>

      {/* Project Overview */}
      <div>
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
          Project Overview
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Total Projects</p>
                <p className="text-3xl font-bold text-gray-900 dark:text-white mt-2">
                  {data.totalProjects}
                </p>
              </div>
              <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/20 rounded-lg flex items-center justify-center">
                <CheckCircle className="w-6 h-6 text-blue-600 dark:text-blue-400" />
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Active Projects</p>
                <p className="text-3xl font-bold text-gray-900 dark:text-white mt-2">
                  {data.activeProjects}
                </p>
              </div>
              <div className="w-12 h-12 bg-green-100 dark:bg-green-900/20 rounded-lg flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-green-600 dark:text-green-400" />
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Completed Projects</p>
                <p className="text-3xl font-bold text-gray-900 dark:text-white mt-2">
                  {data.completedProjects}
                </p>
              </div>
              <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900/20 rounded-lg flex items-center justify-center">
                <CheckCircle className="w-6 h-6 text-purple-600 dark:text-purple-400" />
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">At Risk Projects</p>
                <p className="text-3xl font-bold text-gray-900 dark:text-white mt-2">
                  {data.atRiskProjects}
                </p>
              </div>
              <div className="w-12 h-12 bg-red-100 dark:bg-red-900/20 rounded-lg flex items-center justify-center">
                <AlertCircle className="w-6 h-6 text-red-600 dark:text-red-400" />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Performance Metrics */}
      <div>
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
          Performance Metrics
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* Project Health Score */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">
                  Project Health Score
                </p>
                <div className="flex items-baseline">
                  <p className="text-3xl font-bold text-gray-900 dark:text-white">
                    {data.projectHealthScore.toFixed(1)}%
                  </p>
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                  Percentage of projects in Green status
                </p>
              </div>
              <div
                className={`flex items-center ${
                  data.projectHealthScore >= 70
                    ? 'text-green-600 dark:text-green-400'
                    : data.projectHealthScore >= 50
                    ? 'text-yellow-600 dark:text-yellow-400'
                    : 'text-red-600 dark:text-red-400'
                }`}
              >
                <TrendingUp className="w-5 h-5" />
              </div>
            </div>
            <div className="mt-4">
              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                <div
                  className={`h-2 rounded-full ${
                    data.projectHealthScore >= 70
                      ? 'bg-green-600'
                      : data.projectHealthScore >= 50
                      ? 'bg-yellow-600'
                      : 'bg-red-600'
                  }`}
                  style={{ width: `${data.projectHealthScore}%` }}
                />
              </div>
            </div>
          </div>

          {/* Budget Variance */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Budget Variance</p>
                <div className="flex items-baseline">
                  <p className={`text-3xl font-bold ${getVarianceColor(data.budgetVariance)}`}>
                    {data.budgetVariance > 0 ? '+' : ''}
                    {data.budgetVariance.toFixed(1)}%
                  </p>
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                  Actual vs. estimated budget
                </p>
              </div>
              <div className={getVarianceColor(data.budgetVariance)}>
                {getVarianceIcon(data.budgetVariance)}
              </div>
            </div>
            <div className="mt-4">
              <DollarSign className="w-8 h-8 text-gray-400" />
            </div>
          </div>

          {/* Schedule Variance */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Schedule Variance</p>
                <div className="flex items-baseline">
                  <p className={`text-3xl font-bold ${getVarianceColor(data.scheduleVariance)}`}>
                    {data.scheduleVariance > 0 ? '+' : ''}
                    {data.scheduleVariance.toFixed(1)}%
                  </p>
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                  Actual vs. estimated effort
                </p>
              </div>
              <div className={getVarianceColor(data.scheduleVariance)}>
                {getVarianceIcon(data.scheduleVariance)}
              </div>
            </div>
            <div className="mt-4">
              <TrendingUp className="w-8 h-8 text-gray-400" />
            </div>
          </div>

          {/* Resource Utilization */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">
                  Resource Utilization
                </p>
                <div className="flex items-baseline">
                  <p className="text-3xl font-bold text-gray-900 dark:text-white">
                    {data.resourceUtilization.toFixed(1)}%
                  </p>
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                  Average resource capacity used
                </p>
              </div>
              <div className="text-blue-600 dark:text-blue-400">
                <Users className="w-5 h-5" />
              </div>
            </div>
            <div className="mt-4">
              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                <div
                  className="bg-blue-600 h-2 rounded-full"
                  style={{ width: `${Math.min(data.resourceUtilization, 100)}%` }}
                />
              </div>
            </div>
          </div>

          {/* On-Time Completion Rate */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">
                  On-Time Completion Rate
                </p>
                <div className="flex items-baseline">
                  <p className="text-3xl font-bold text-gray-900 dark:text-white">
                    {data.onTimeCompletionRate.toFixed(1)}%
                  </p>
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                  Projects completed on schedule
                </p>
              </div>
              <div
                className={`${
                  data.onTimeCompletionRate >= 80
                    ? 'text-green-600 dark:text-green-400'
                    : data.onTimeCompletionRate >= 60
                    ? 'text-yellow-600 dark:text-yellow-400'
                    : 'text-red-600 dark:text-red-400'
                }`}
              >
                <CheckCircle className="w-5 h-5" />
              </div>
            </div>
            <div className="mt-4">
              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                <div
                  className={`h-2 rounded-full ${
                    data.onTimeCompletionRate >= 80
                      ? 'bg-green-600'
                      : data.onTimeCompletionRate >= 60
                      ? 'bg-yellow-600'
                      : 'bg-red-600'
                  }`}
                  style={{ width: `${data.onTimeCompletionRate}%` }}
                />
              </div>
            </div>
          </div>

          {/* Overall Completion Rate */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">
                  Overall Completion Rate
                </p>
                <div className="flex items-baseline">
                  <p className="text-3xl font-bold text-gray-900 dark:text-white">
                    {data.overallCompletionRate.toFixed(1)}%
                  </p>
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                  Percentage of completed projects
                </p>
              </div>
              <div className="text-purple-600 dark:text-purple-400">
                <CheckCircle className="w-5 h-5" />
              </div>
            </div>
            <div className="mt-4">
              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                <div
                  className="bg-purple-600 h-2 rounded-full"
                  style={{ width: `${data.overallCompletionRate}%` }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Insights */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Insights</h2>
        <div className="space-y-3">
          {data.projectHealthScore < 50 && (
            <div className="flex items-start space-x-3 p-3 bg-red-50 dark:bg-red-900/20 rounded-lg">
              <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-red-900 dark:text-red-100">
                  Low Project Health Score
                </p>
                <p className="text-sm text-red-700 dark:text-red-300 mt-1">
                  More than 50% of projects are not in Green status. Consider reviewing project
                  risks and resource allocation.
                </p>
              </div>
            </div>
          )}

          {data.budgetVariance > 10 && (
            <div className="flex items-start space-x-3 p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
              <AlertCircle className="w-5 h-5 text-yellow-600 dark:text-yellow-400 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-yellow-900 dark:text-yellow-100">
                  Budget Overrun
                </p>
                <p className="text-sm text-yellow-700 dark:text-yellow-300 mt-1">
                  Projects are exceeding estimated budgets by {data.budgetVariance.toFixed(1)}%.
                  Review cost management strategies.
                </p>
              </div>
            </div>
          )}

          {data.onTimeCompletionRate < 70 && (
            <div className="flex items-start space-x-3 p-3 bg-orange-50 dark:bg-orange-900/20 rounded-lg">
              <AlertCircle className="w-5 h-5 text-orange-600 dark:text-orange-400 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-orange-900 dark:text-orange-100">
                  Schedule Delays
                </p>
                <p className="text-sm text-orange-700 dark:text-orange-300 mt-1">
                  Only {data.onTimeCompletionRate.toFixed(1)}% of projects are completed on time.
                  Consider timeline reassessment.
                </p>
              </div>
            </div>
          )}

          {data.projectHealthScore >= 70 &&
            data.budgetVariance <= 10 &&
            data.onTimeCompletionRate >= 70 && (
              <div className="flex items-start space-x-3 p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-green-900 dark:text-green-100">
                    Excellent Performance
                  </p>
                  <p className="text-sm text-green-700 dark:text-green-300 mt-1">
                    All key metrics are within healthy ranges. Keep up the good work!
                  </p>
                </div>
              </div>
            )}
        </div>
      </div>
    </div>
  );
}
