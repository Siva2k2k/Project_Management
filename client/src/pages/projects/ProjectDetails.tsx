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
  BarChart,
  Bar,
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

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
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
      <div className="flex items-center justify-between pl-16 lg:pl-0">
        <div className="flex items-center space-x-4">
          <Button variant="outline" onClick={() => navigate('/projects')}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              {project.project_name}
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              {project.customer?.customer_name || 'N/A'} • Managed by {project.assigned_manager?.name || 'Unassigned'}
            </p>
          </div>
        </div>
        <div className="flex items-center space-x-3">
          <span
            className="inline-flex items-center px-4 py-2 rounded-full text-sm font-medium"
            style={{
              backgroundColor: STATUS_COLORS[project.overall_status] + '20',
              color: STATUS_COLORS[project.overall_status],
            }}
          >
            {project.overall_status} Status
          </span>
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

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Duration</p>
              <p className="text-sm font-medium text-gray-900 dark:text-white mt-1">
                {formatDate(project.start_date)}
              </p>
              <p className="text-sm font-medium text-gray-900 dark:text-white">
                {formatDate(project.end_date)}
              </p>
            </div>
            <div className="w-12 h-12 bg-orange-100 dark:bg-orange-900/20 rounded-lg flex items-center justify-center">
              <Calendar className="w-6 h-6 text-orange-600 dark:text-orange-400" />
            </div>
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
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Effort by Resource */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Cumulative Effort by Resource
          </h2>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={drillDownData.effortByResource}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="week" />
              <YAxis />
              <Tooltip />
              <Legend />
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
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="week" />
              <YAxis />
              <Tooltip formatter={(value: any) => `$${value.toLocaleString()}`} />
              <Legend />
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
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="week" />
                <YAxis domain={[0, 100]} />
                <Tooltip />
                <Legend />
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
