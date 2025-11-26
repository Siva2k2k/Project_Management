import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  BarChart,
  Bar,
  PieChart,
  Pie,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import { dashboardService } from '../../services/dashboardService';
import type { DashboardData } from '../../services/dashboardService';
import { AlertCircle, TrendingUp, CheckCircle, Clock } from 'lucide-react';

const STATUS_COLORS: Record<string, string> = {
  Red: '#ef4444',
  Amber: '#f59e0b',
  Green: '#10b981',
};

export function CEODashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const result = await dashboardService.getCEODashboard();
      setData(result);
      setError(null);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load dashboard data');
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
      <div className="pl-16 lg:pl-0">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">CEO Dashboard</h1>
        <p className="text-gray-600 dark:text-gray-400 mt-1">
          Organization-wide project overview and metrics
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Total Projects</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                {data.totalProjects}
              </p>
            </div>
            <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/20 rounded-lg flex items-center justify-center">
              <TrendingUp className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Active Projects</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                {data.activeProjects}
              </p>
            </div>
            <div className="w-12 h-12 bg-green-100 dark:bg-green-900/20 rounded-lg flex items-center justify-center">
              <Clock className="w-6 h-6 text-green-600 dark:text-green-400" />
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Completed</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
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
              <p className="text-sm text-gray-600 dark:text-gray-400">At Risk</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                {data.atRiskProjects}
              </p>
            </div>
            <div className="w-12 h-12 bg-red-100 dark:bg-red-900/20 rounded-lg flex items-center justify-center">
              <AlertCircle className="w-6 h-6 text-red-600 dark:text-red-400" />
            </div>
          </div>
        </div>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Projects by Status */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Projects by Status
          </h2>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={data.projectsByStatus}
                dataKey="count"
                nameKey="status"
                cx="50%"
                cy="50%"
                outerRadius={100}
                label
              >
                {data.projectsByStatus.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={STATUS_COLORS[entry.status] || '#6b7280'} />
                ))}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Effort by Week */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Effort Trend (Last 12 Weeks)
          </h2>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={data.effortByWeek}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-gray-200 dark:stroke-gray-700" />
              <XAxis 
                dataKey="week" 
                tick={{ fill: 'currentColor' }}
                className="text-gray-600 dark:text-gray-400"
              />
              <YAxis 
                tick={{ fill: 'currentColor' }}
                className="text-gray-600 dark:text-gray-400"
              />
              <Tooltip 
                contentStyle={{
                  backgroundColor: 'var(--tooltip-bg)',
                  border: '1px solid var(--tooltip-border)',
                  borderRadius: '0.375rem',
                }}
              />
              <Legend />
              <Line type="monotone" dataKey="hours" stroke="#8b5cf6" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Project Progress - Full Width with Horizontal Scroll */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
          <div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              Project Progress
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">Completion percentage by project</p>
          </div>
          <div className="flex items-center gap-4 text-sm">
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-sm bg-emerald-500"></span>
              <span className="text-gray-600 dark:text-gray-400">≥80%</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-sm bg-amber-500"></span>
              <span className="text-gray-600 dark:text-gray-400">50-79%</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-sm bg-red-500"></span>
              <span className="text-gray-600 dark:text-gray-400">&lt;50%</span>
            </div>
          </div>
        </div>
        <div className="overflow-x-auto">
          <div style={{ minWidth: `${Math.max(600, data.projectsSummary.length * 70)}px` }}>
            <ResponsiveContainer width="100%" height={320}>
              <BarChart
                data={data.projectsSummary}
                margin={{ top: 10, right: 20, left: 30, bottom: 70 }}
                onClick={(chartData) => {
                  if (chartData && chartData.activePayload && chartData.activePayload[0]) {
                    const projectId = chartData.activePayload[0].payload._id;
                    if (projectId) navigate(`/projects/${projectId}`);
                  }
                }}
                style={{ cursor: 'pointer' }}
              >
                <CartesianGrid strokeDasharray="3 3" vertical={false} className="stroke-gray-200 dark:stroke-gray-700" />
                <XAxis
                  dataKey="project_name"
                  angle={-45}
                  textAnchor="end"
                  height={90}
                  interval={0}
                  tick={{ fontSize: 11, fill: 'currentColor' }}
                  axisLine={{ stroke: '#e5e7eb' }}
                  tickLine={false}
                />
                <YAxis
                  domain={[0, 100]}
                  tickFormatter={(value) => `${value}%`}
                  tick={{ fontSize: 11, fill: 'currentColor' }}
                  axisLine={false}
                  tickLine={false}
                  width={45}
                />
                <Tooltip
                  formatter={(value: number) => [`${value}%`, 'Progress']}
                  contentStyle={{
                    backgroundColor: 'rgba(255,255,255,0.95)',
                    border: 'none',
                    borderRadius: '8px',
                    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                  }}
                  cursor={{ fill: 'rgba(0,0,0,0.05)' }}
                />
                <Bar
                  dataKey="scope_completed"
                  radius={[4, 4, 0, 0]}
                  maxBarSize={50}
                  style={{ cursor: 'pointer' }}
                >
                  {data.projectsSummary.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      style={{ cursor: 'pointer' }}
                      onClick={() => navigate(`/projects/${entry._id}`)}
                      fill={
                        entry.scope_completed >= 80
                          ? '#10b981'
                          : entry.scope_completed >= 50
                          ? '#f59e0b'
                          : '#ef4444'
                      }
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Budget Utilization - Full Width with Horizontal Scroll */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
          <div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              Budget Utilization
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">Estimated vs Actual budget comparison</p>
          </div>
          <div className="flex items-center gap-4 text-sm">
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-sm bg-emerald-500"></span>
              <span className="text-gray-600 dark:text-gray-400">Estimated</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-sm bg-blue-500"></span>
              <span className="text-gray-600 dark:text-gray-400">Actual</span>
            </div>
          </div>
        </div>
        <div className="overflow-x-auto">
          <div style={{ minWidth: `${Math.max(600, data.budgetUtilization.length * 90)}px`, paddingLeft: '20px' }}>
            <ResponsiveContainer width="100%" height={320}>
              <BarChart
                data={data.budgetUtilization}
                margin={{ top: 10, right: 20, left: 20, bottom: 70 }}
                onClick={(chartData) => {
                  if (chartData && chartData.activePayload && chartData.activePayload[0]) {
                    const projectName = chartData.activePayload[0].payload.project;
                    // Find the project by name in projectsSummary to get the ID
                    const project = data.projectsSummary.find(p => p.project_name === projectName);
                    if (project) navigate(`/projects/${project._id}`);
                  }
                }}
                style={{ cursor: 'pointer' }}
              >
                <CartesianGrid strokeDasharray="3 3" vertical={false} className="stroke-gray-200 dark:stroke-gray-700" />
                <XAxis
                  dataKey="project"
                  angle={-45}
                  textAnchor="end"
                  height={90}
                  interval={0}
                  tick={{ fontSize: 11, fill: 'currentColor' }}
                  axisLine={{ stroke: '#e5e7eb' }}
                  tickLine={false}
                />
                <YAxis
                  tickFormatter={(value) => value >= 1000 ? `$${(value / 1000).toFixed(0)}k` : `$${value}`}
                  tick={{ fontSize: 11, fill: 'currentColor' }}
                  axisLine={false}
                  tickLine={false}
                  width={55}
                />
                <Tooltip
                  formatter={(value: number) => [`$${value.toLocaleString()}`, '']}
                  contentStyle={{
                    backgroundColor: 'rgba(255,255,255,0.95)',
                    border: 'none',
                    borderRadius: '8px',
                    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                  }}
                  cursor={{ fill: 'rgba(0,0,0,0.05)' }}
                />
                <Bar dataKey="estimated" fill="#10b981" radius={[4, 4, 0, 0]} maxBarSize={40} style={{ cursor: 'pointer' }}>
                  {data.budgetUtilization.map((entry, index) => {
                    const project = data.projectsSummary.find(p => p.project_name === entry.project);
                    return (
                      <Cell
                        key={`est-${index}`}
                        style={{ cursor: 'pointer' }}
                        onClick={() => project && navigate(`/projects/${project._id}`)}
                        fill="#10b981"
                      />
                    );
                  })}
                </Bar>
                <Bar dataKey="actual" fill="#3b82f6" radius={[4, 4, 0, 0]} maxBarSize={40} style={{ cursor: 'pointer' }}>
                  {data.budgetUtilization.map((entry, index) => {
                    const project = data.projectsSummary.find(p => p.project_name === entry.project);
                    return (
                      <Cell
                        key={`act-${index}`}
                        style={{ cursor: 'pointer' }}
                        onClick={() => project && navigate(`/projects/${project._id}`)}
                        fill="#3b82f6"
                      />
                    );
                  })}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Projects Table */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">All Projects</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Project Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Customer
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Progress
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Type
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {data.projectsSummary.map((project) => (
                <tr key={project._id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                    {project.project_name}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                    {project.customer}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium"
                      style={{
                        backgroundColor: STATUS_COLORS[project.overall_status] + '20',
                        color: STATUS_COLORS[project.overall_status],
                      }}
                    >
                      {project.overall_status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                    <div className="flex items-center">
                      <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 mr-2">
                        <div
                          className="bg-blue-600 h-2 rounded-full"
                          style={{ width: `${project.scope_completed}%` }}
                        />
                      </div>
                      <span>{project.scope_completed}%</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                    {project.project_type}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <button
                      onClick={() => navigate(`/projects/${project._id}`)}
                      className="text-blue-600 dark:text-blue-400 hover:underline"
                    >
                      View Details
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
