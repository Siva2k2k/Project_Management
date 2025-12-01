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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/Select';
import { X } from 'lucide-react';

interface ProjectOption {
  _id: string;
  project_name: string;
  customer?: { customer_name: string };
}

export function TrendsDashboard() {
  const [data, setData] = useState<TrendData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [timeRange, setTimeRange] = useState<number>(30);
  const [projects, setProjects] = useState<ProjectOption[]>([]);
  const [selectedProject, setSelectedProject] = useState<string | null>(null);

  useEffect(() => {
    fetchProjectList();
    fetchData();
  }, []);

  useEffect(() => {
    fetchData();
  }, [timeRange, selectedProject]);

  const fetchProjectList = async () => {
    try {
      const projectList = await dashboardService.getProjectList();
      setProjects(projectList);
    } catch (err: any) {
      console.error('Failed to load project list:', err);
    }
  };

  const fetchData = async () => {
    try {
      setLoading(true);
      const result = await dashboardService.getTrends({ 
        timeRange, 
        projectId: selectedProject || undefined 
      });
      setData(result);
      setError(null);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load trends data');
    } finally {
      setLoading(false);
    }
  };

  const handleProjectChange = (projectId: string) => {
    setSelectedProject(projectId);
  };

  const clearProjectSelection = () => {
    setSelectedProject(null);
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
      <div className="pl-16 lg:pl-0">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Trends Dashboard</h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              {selectedProject ? 'Project-Specific' : 'Overall'} trends over time
            </p>
          </div>
          
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
            {/* Project Selection Dropdown */}
            <div className="flex items-center gap-2 min-w-0">
              <Select value={selectedProject || ''} onValueChange={handleProjectChange}>
                <SelectTrigger className="w-64">
                  <SelectValue placeholder="Select a project for specific trends" />
                </SelectTrigger>
                <SelectContent>
                  {projects.map((project) => (
                    <SelectItem key={project._id} value={project._id}>
                      <div className="flex flex-col">
                        <span className="font-medium">{project.project_name}</span>
                        {project.customer && (
                          <span className="text-xs text-gray-500 dark:text-gray-400">
                            {project.customer.customer_name}
                          </span>
                        )}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {selectedProject && (
                <button
                  onClick={clearProjectSelection}
                  className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md transition-colors"
                  title="Clear selection to view overall trends"
                >
                  <X className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                </button>
              )}
            </div>

            {/* Time Range Selection */}
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
            {selectedProject ? 'For selected project' : 'Across all projects'}
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
          {selectedProject 
            ? 'Hours logged by resources in selected project over time'
            : 'Total hours logged by all resources across all projects over time'
          }
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
            <Tooltip 
              content={({ active, payload, label }) => {
                if (active && payload && payload.length > 0) {
                  const data = payload[0].payload;
                  const breakdown = data.breakdown || {};
                  const breakdownKeys = Object.keys(breakdown);
                  
                  return (
                    <div className="bg-gray-800 border border-gray-600 rounded-lg p-3 shadow-lg">
                      <p className="text-white font-medium mb-2">{`Date: ${label}`}</p>
                      <p className="text-white mb-2">{`Total Hours: ${data.hours.toLocaleString()}`}</p>
                      {breakdownKeys.length > 0 && (
                        <div>
                          <p className="text-gray-300 text-sm font-medium mb-1">
                            {selectedProject ? 'Resource Breakdown:' : 'Project Breakdown:'}
                          </p>
                          {breakdownKeys.map(key => (
                            <p key={key} className="text-gray-300 text-sm">
                              {key}: {breakdown[key].toLocaleString()} hrs
                            </p>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                }
                return null;
              }}
            />
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
