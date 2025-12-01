import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Calendar,
  DollarSign,
  Clock,
  CheckCircle,
  Edit,
  Trash2,
} from 'lucide-react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import projectService from '../../services/projectService';
import type { Project } from '../../services/projectService';
import { dashboardService } from '../../services/dashboardService';
import type { ProjectDrillDownData } from '../../services/dashboardService';
import { Button } from '../../components/ui/Button';
import { ProjectDialog } from './ProjectDialog';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { formatDate } from '../../lib/dateUtils';

const STATUS_COLORS: Record<string, string> = {
  Red: '#ef4444',
  Amber: '#f59e0b',
  Green: '#10b981',
};

export function ProjectDetails() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [project, setProject] = useState<Project | null>(null);
  const [drillDownData, setDrillDownData] = useState<ProjectDrillDownData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

  useEffect(() => {
    if (id) {
      fetchProjectDetails();
    }
  }, [id]);

  const fetchProjectDetails = async () => {
    if (!id) return;

    try {
      setLoading(true);
      const [projectData, drillDown] = await Promise.all([
        projectService.getById(id),
        dashboardService.getProjectDrillDown(id),
      ]);
      setProject(projectData);
      setDrillDownData(drillDown);
      setError(null);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load project details');
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const handleEdit = () => {
    setIsEditDialogOpen(true);
  };

  const handleDelete = async () => {
    if (!id) return;

    try {
      await projectService.delete(id);
      navigate('/projects');
    } catch (err: any) {
      console.error('Failed to delete project:', err);
      alert(err.response?.data?.message || 'Failed to delete project');
    }
  };

  const handleEditSuccess = () => {
    setIsEditDialogOpen(false);
    if (id) {
      fetchProjectDetails();
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error || !project || !drillDownData) {
    return (
      <div className="bg-red-50 dark:bg-red-900/20 p-4 rounded-lg">
        <p className="text-red-600 dark:text-red-400">{error || 'Project not found'}</p>
        <Button onClick={() => navigate('/projects')} className="mt-4">
          Back to Projects
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="pl-14 sm:pl-20 lg:pl-0">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          {/* Left: Back + Title + Meta */}
          <div className="flex items-start gap-3">
            {/* Back button: show on large screens on the left, hide on mobile */}
            <Button
              variant="outline"
              onClick={() => navigate('/projects')}
              className="h-9 px-3 hidden lg:inline-flex"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
            <div className="min-w-0">
              <h1 className="text-2xl lg:text-3xl font-bold text-gray-900 dark:text-white leading-tight">
                {project.project_name}
              </h1>
              <div className="mt-1 flex flex-wrap items-center gap-2">
                <p className="text-sm text-gray-600 dark:text-gray-400 truncate">
                  {project.customer?.customer_name || 'N/A'} • Managed by {project.assigned_manager?.name || 'Unassigned'}
                </p>
                <span
                  className="inline-flex items-center px-2.5 py-1 rounded-full text-xs md:text-sm font-medium"
                  style={{
                    backgroundColor: STATUS_COLORS[project.overall_status] + '20',
                    color: STATUS_COLORS[project.overall_status],
                  }}
                >
                  {project.overall_status} Status
                </span>
              </div>
            </div>
          </div>

          {/* Right: Actions */}
          <div className="flex items-center gap-2 mt-2 lg:mt-0">
            {/* Back button: move to actions on mobile to avoid overlapping hamburger */}
            <Button
              variant="outline"
              onClick={() => navigate('/projects')}
              className="h-9 px-3 inline-flex lg:hidden"
              title="Back"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
            <Button
              variant="outline"
              size="icon"
              onClick={handleEdit}
              title="Edit Project"
              className="text-green-600 dark:text-green-400 hover:text-green-900 dark:hover:text-green-300"
            >
              <Edit className="w-4 h-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              onClick={() => setIsDeleteDialogOpen(true)}
              title="Delete Project"
              className="text-red-600 dark:text-red-400 hover:text-red-900 dark:hover:text-red-300"
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Scope Completed</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                {project.scope_completed}%
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                {project.scope_completed} / 100
              </p>
            </div>
            <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/20 rounded-lg flex items-center justify-center">
              <CheckCircle className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            </div>
          </div>
          <div className="mt-4">
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
              <div
                className="bg-blue-600 h-2 rounded-full"
                style={{ width: `${project.scope_completed}%` }}
              />
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <p className="text-sm text-gray-600 dark:text-gray-400">Total Effort</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                {drillDownData.effortPercentage}%
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                {drillDownData.totalEffortHours.toLocaleString()} / {project.estimated_effort} hrs
              </p>
            </div>
            <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900/20 rounded-lg flex items-center justify-center">
              <Clock className="w-6 h-6 text-purple-600 dark:text-purple-400" />
            </div>
          </div>
          <div className="mt-4">
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
              <div
                className="bg-purple-600 h-2 rounded-full"
                style={{ width: `${Math.min(drillDownData.effortPercentage, 100)}%` }}
              />
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <p className="text-sm text-gray-600 dark:text-gray-400">Actual Cost</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                {drillDownData.costPercentage}%
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                {formatCurrency(drillDownData.actualCost)} / {formatCurrency(project.estimated_budget)}
              </p>
            </div>
            <div className="w-12 h-12 bg-green-100 dark:bg-green-900/20 rounded-lg flex items-center justify-center">
              <DollarSign className="w-6 h-6 text-green-600 dark:text-green-400" />
            </div>
          </div>
          <div className="mt-4">
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
              <div
                className="bg-green-600 h-2 rounded-full"
                style={{ width: `${Math.min(drillDownData.costPercentage, 100)}%` }}
              />
            </div>
          </div>
        </div>

        <div className="relative group">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 cursor-help">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                {(() => {
                  const startDate = new Date(project.start_date);
                  const endDate = new Date(project.end_date);
                  const currentDate = new Date();
                  
                  const totalDays = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
                  const elapsedDays = Math.max(0, Math.ceil((currentDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)));
                  const elapsedPercentage = Math.min((elapsedDays / totalDays) * 100, 100);
                  
                  return (
                    <>
                      <p className="text-sm text-gray-600 dark:text-gray-400">Duration Progress</p>
                      <p className="text-2xl font-bold text-gray-900 dark:text-white mt-2">
                        {elapsedPercentage.toFixed(1)}%
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        {elapsedDays} of {totalDays} days
                      </p>
                      <div className="mt-3 relative">
                        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1.5">
                          <div
                            className="bg-orange-600 h-2 rounded-full transition-all duration-500"
                            style={{ width: `${elapsedPercentage}%` }}
                          />
                        </div>
                        {/* Current date indicator */}
                        <div 
                          className="absolute top-0 transform -translate-x-1/2"
                          style={{ left: `${Math.min(elapsedPercentage, 100)}%` }}
                        >
                          <div className="w-0.5 h-4 bg-red-500 relative">
                            <div className="absolute -top-0.5 -left-0.5 w-1.5 h-1.5 bg-red-500 rounded-full"></div>
                          </div>
                        </div>
                      </div>
                    </>
                  );
                })()}
              </div>
              <div className="w-12 h-12 bg-orange-100 dark:bg-orange-900/20 rounded-lg flex items-center justify-center">
                <Calendar className="w-6 h-6 text-orange-600 dark:text-orange-400" />
              </div>
            </div>
          </div>
          
          {/* Tooltip */}
          <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-gray-900 text-white text-xs rounded-lg shadow-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-10">
            <div className="text-center">
              <div className="font-medium mb-1">Project Timeline</div>
              <div>Start: {formatDate(project.start_date)}</div>
              <div>End: {formatDate(project.end_date)}</div>
              <div>Today: {formatDate(new Date().toISOString())}</div>
            </div>
            {/* Tooltip arrow */}
            <div className="absolute top-full left-1/2 transform -translate-x-1/2 border-4 border-transparent border-t-gray-900"></div>
          </div>
        </div>
      </div>

      {/* Status Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">
            Scope Status
          </h3>
          <span
            className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium"
            style={{
              backgroundColor: STATUS_COLORS[project.scope_status] + '20',
              color: STATUS_COLORS[project.scope_status],
            }}
          >
            {project.scope_status}
          </span>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">
            Quality Status
          </h3>
          <span
            className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium"
            style={{
              backgroundColor: STATUS_COLORS[project.quality_status] + '20',
              color: STATUS_COLORS[project.quality_status],
            }}
          >
            {project.quality_status}
          </span>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">
            Budget Status
          </h3>
          <span
            className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium"
            style={{
              backgroundColor: STATUS_COLORS[project.budget_status] + '20',
              color: STATUS_COLORS[project.budget_status],
            }}
          >
            {project.budget_status}
          </span>
        </div>
      </div>

      {/* Charts */}
      {/* Effort Trend (Full Width) - Weekly hours sum */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Effort Trend (Weekly)
        </h2>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart
            data={(() => {
              const byWeek = drillDownData.effortByResource || [];
              const result: { week: string; hours: number; [key: string]: any }[] = [];
              
              // Convert cumulative data to weekly data
              for (let i = 0; i < byWeek.length; i++) {
                const currentRow = byWeek[i];
                const previousRow = i > 0 ? byWeek[i - 1] : null;
                const weekLabel = currentRow.week;
                
                const resourceBreakdown: { week: string; hours: number; [key: string]: any } = { 
                  week: weekLabel, 
                  hours: 0 
                };
                
                let weeklyTotal = 0;
                Object.keys(currentRow)
                  .filter((k) => k !== 'week')
                  .forEach(resourceName => {
                    const currentHours = Number(currentRow[resourceName]) || 0;
                    const previousHours = previousRow ? (Number(previousRow[resourceName]) || 0) : 0;
                    const weeklyHours = currentHours - previousHours; // Calculate actual weekly hours
                    
                    resourceBreakdown[resourceName] = weeklyHours;
                    weeklyTotal += weeklyHours;
                  });
                
                resourceBreakdown.hours = weeklyTotal;
                result.push(resourceBreakdown);
              }
              
              return result;
            })()}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
            <XAxis dataKey="week" stroke="#9ca3af" />
            <YAxis stroke="#9ca3af" />
            <Tooltip 
              content={({ active, payload, label }) => {
                if (active && payload && payload.length > 0) {
                  const data = payload[0].payload;
                  const resources = Object.keys(data).filter(k => k !== 'week' && k !== 'hours');
                  
                  return (
                    <div className="bg-gray-800 border border-gray-600 rounded-lg p-3 shadow-lg">
                      <p className="text-white font-medium mb-2">{`Week: ${label}`}</p>
                      <p className="text-white mb-2">{`Total Hours: ${data.hours.toLocaleString()}`}</p>
                      {resources.length > 0 && (
                        <div>
                          <p className="text-gray-300 text-sm font-medium mb-1">Resource Breakdown:</p>
                          {resources.map(resource => (
                            <p key={resource} className="text-gray-300 text-sm">
                              {resource}: {data[resource].toLocaleString()} hrs
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
            <Line type="monotone" dataKey="hours" stroke="#8b5cf6" strokeWidth={2} name="Weekly Hours" />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Cumulative Effort Trend: sum of worked hours (running total) */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Cumulative Effort Trend
          </h2>
          <ResponsiveContainer width="100%" height={300}>
            {
              // Compute cumulative totals from effortByResource
            }
            <LineChart
              data={(() => {
                const byWeek = drillDownData.effortByResource || [];
                const result: { week: string; total: number }[] = [];
                let running = 0;
                for (const row of byWeek) {
                  const weekLabel = row.week;
                  const sum = Object.keys(row)
                    .filter((k) => k !== 'week')
                    .reduce((s, k) => s + (Number(row[k]) || 0), 0);
                  running += sum;
                  result.push({ week: weekLabel, total: running });
                }
                return result;
              })()}
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="week" stroke="#9ca3af" />
              <YAxis stroke="#9ca3af" />
              <Tooltip formatter={(value: any) => `${value.toLocaleString()} hrs`} contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151' }} labelStyle={{ color: '#f3f4f6' }} itemStyle={{ color: '#f3f4f6' }} />
              <Legend wrapperStyle={{ color: '#9ca3af' }} />
              <Line type="monotone" dataKey="total" stroke="#3b82f6" strokeWidth={2} name="Cumulative Hours" />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Effort by Resource */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Effort by Resource
          </h2>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={drillDownData.effortByResource}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis dataKey="week" stroke="#9ca3af" />
              <YAxis stroke="#9ca3af" />
              <Tooltip contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151' }} labelStyle={{ color: '#f3f4f6' }} itemStyle={{ color: '#f3f4f6' }} />
              <Legend wrapperStyle={{ color: '#9ca3af' }} />
              {drillDownData.effortByResource.length > 0 &&
                Object.keys(drillDownData.effortByResource[0])
                  .filter((key) => key !== 'week')
                  .map((resourceName, index) => {
                    const colors = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];
                    return (
                      <Line
                        key={resourceName}
                        type="monotone"
                        dataKey={resourceName}
                        stroke={colors[index % colors.length]}
                        strokeWidth={2}
                        name={resourceName}
                      />
                    );
                  })}
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Budget Trend */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Budget vs Actual
          </h2>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={drillDownData.budgetTrend}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis dataKey="week" stroke="#9ca3af" />
              <YAxis stroke="#9ca3af" />
              <Tooltip formatter={(value: any) => `$${value.toLocaleString()}`} contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151' }} labelStyle={{ color: '#f3f4f6' }} itemStyle={{ color: '#f3f4f6' }} />
              <Legend wrapperStyle={{ color: '#9ca3af' }} />
              <Line
                type="monotone"
                dataKey="estimated"
                stroke="#10b981"
                strokeWidth={2}
                name="Estimated"
              />
              <Line
                type="monotone"
                dataKey="actual"
                stroke="#ef4444"
                strokeWidth={2}
                name="Actual"
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Scope Trend */}
        {drillDownData.scopeTrend && drillDownData.scopeTrend.length > 0 && (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Scope Progress Over Time
            </h2>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={drillDownData.scopeTrend}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis dataKey="week" stroke="#9ca3af" />
                <YAxis domain={[0, 100]} stroke="#9ca3af" />
                <Tooltip contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151' }} labelStyle={{ color: '#f3f4f6' }} itemStyle={{ color: '#f3f4f6' }} />
                <Legend wrapperStyle={{ color: '#9ca3af' }} />
                <Line
                  type="monotone"
                  dataKey="scope_completed"
                  stroke="#8b5cf6"
                  strokeWidth={2}
                  name="Scope Completed (%)"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* Milestones */}
      {project.milestones && project.milestones.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
          <div className="p-6 border-b border-gray-200 dark:border-gray-700">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Milestones</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Description
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Estimated Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Completed Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Scope Completed
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {drillDownData.milestones.map((milestone, index) => (
                  <tr key={index}>
                    <td className="px-6 py-4 text-sm text-gray-900 dark:text-white">
                      {milestone.description}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                      {formatDate(milestone.estimated_date)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                      {milestone.completed_date
                        ? formatDate(milestone.completed_date)
                        : '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                      {milestone.scope_completed}%
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          milestone.status === 'Completed'
                            ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400'
                            : milestone.status === 'Delayed'
                            ? 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400'
                            : 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400'
                        }`}
                      >
                        {milestone.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Edit Project Dialog */}
      <ProjectDialog
        open={isEditDialogOpen}
        onClose={() => setIsEditDialogOpen(false)}
        onSuccess={handleEditSuccess}
        project={project}
      />

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        open={isDeleteDialogOpen}
        onClose={() => setIsDeleteDialogOpen(false)}
        onConfirm={handleDelete}
        title="Delete Project"
        description={`Are you sure you want to delete "${project?.project_name}"? This action cannot be undone and will remove all associated data.`}
        confirmText="Delete"
        variant="destructive"
      />
    </div>
  );
}
