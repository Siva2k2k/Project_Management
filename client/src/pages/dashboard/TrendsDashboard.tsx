import { useEffect, useState } from 'react';
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { dashboardService } from '../../services/dashboardService';
import type { TrendData } from '../../services/dashboardService';

export function TrendsDashboard() {
  const [data, setData] = useState<TrendData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [timeRange, setTimeRange] = useState<number>(30);

  useEffect(() => {
    fetchData();
  }, [timeRange]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const result = await dashboardService.getTrends({ timeRange });
      setData(result);
      setError(null);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load trends data');
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between pl-16 lg:pl-0">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Trends Dashboard</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Track project trends over time
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <label className="text-sm text-gray-600 dark:text-gray-400">Time Range:</label>
          <select
            value={timeRange}
            onChange={(e) => setTimeRange(Number(e.target.value))}
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value={7}>Last 7 days</option>
            <option value={30}>Last 30 days</option>
            <option value={60}>Last 60 days</option>
            <option value={90}>Last 90 days</option>
          </select>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">
            Total Effort (Period)
          </h3>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">
            {data.effortTrend.reduce((sum, item) => sum + item.hours, 0).toLocaleString()} hrs
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            Across all projects
          </p>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">
            Total Cost (Period)
          </h3>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">
            $
            {data.budgetTrend.length > 0
              ? data.budgetTrend[data.budgetTrend.length - 1].cost.toLocaleString()
              : '0'}
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            Cumulative spending
          </p>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">
            Average Weekly Effort
          </h3>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">
            {data.effortTrend.length > 0
              ? Math.round(
                  data.effortTrend.reduce((sum, item) => sum + item.hours, 0) /
                    data.effortTrend.length
                ).toLocaleString()
              : '0'}{' '}
            hrs
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            Per week average
          </p>
        </div>
      </div>

      {/* Budget Burn-down */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Budget Burn-down
        </h2>
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
          Cumulative cost over time
        </p>
        <ResponsiveContainer width="100%" height={400}>
          <LineChart data={data.budgetTrend}>
            <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
            <XAxis dataKey="date" stroke="#9ca3af" />
            <YAxis stroke="#9ca3af" />
            <Tooltip
              formatter={(value: any) => `$${value.toLocaleString()}`}
              contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151' }}
              labelStyle={{ color: '#f3f4f6' }}
              itemStyle={{ color: '#f3f4f6' }}
            />
            <Legend wrapperStyle={{ color: '#9ca3af' }} />
            <Line
              type="monotone"
              dataKey="cost"
              stroke="#ef4444"
              strokeWidth={3}
              name="Cumulative Cost"
              dot={{ r: 4 }}
              activeDot={{ r: 6 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Scope Completion Trend */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Scope Completion Trend
        </h2>
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
          Project scope completion over time
        </p>
        {data.scopeTrend && data.scopeTrend.length > 0 ? (
          <ResponsiveContainer width="100%" height={400}>
            <LineChart data={data.scopeTrend}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis dataKey="date" stroke="#9ca3af" />
              <YAxis domain={[0, 100]} stroke="#9ca3af" />
              <Tooltip contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151' }} labelStyle={{ color: '#f3f4f6' }} itemStyle={{ color: '#f3f4f6' }} />
              <Legend wrapperStyle={{ color: '#9ca3af' }} />
              <Line
                type="monotone"
                dataKey="scope_completed"
                stroke="#10b981"
                strokeWidth={2}
                name="Scope Completed (%)"
                dot={{ r: 3 }}
              />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <div className="flex items-center justify-center h-64 text-gray-500 dark:text-gray-400">
            <p>No scope update data available for the selected time range</p>
          </div>
        )}
      </div>

      {/* Effort Trend */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Weekly Effort Trend
        </h2>
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
          Total hours logged by all resources over time
        </p>
        <ResponsiveContainer width="100%" height={400}>
          <AreaChart data={data.effortTrend}>
            <defs>
              <linearGradient id="colorHours" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.8} />
                <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
            <XAxis dataKey="date" stroke="#9ca3af" />
            <YAxis stroke="#9ca3af" />
            <Tooltip contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151' }} labelStyle={{ color: '#f3f4f6' }} itemStyle={{ color: '#f3f4f6' }} />
            <Legend wrapperStyle={{ color: '#9ca3af' }} />
            <Area
              type="monotone"
              dataKey="hours"
              stroke="#8b5cf6"
              fillOpacity={1}
              fill="url(#colorHours)"
              name="Hours"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
