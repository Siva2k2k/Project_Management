import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { X } from 'lucide-react';
import { SimpleDialog } from '../../components/ui/Dialog';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Label } from '../../components/ui/Label';
import projectService, {
  ProjectType,
  RAGStatus,
} from '../../services/projectService';
import type { Project, CreateProjectInput } from '../../services/projectService';
import customerService from '../../services/customerService';
import userService from '../../services/userService';

interface ProjectDialogProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  project?: Project | null;
}

export function ProjectDialog({ open, onClose, onSuccess, project }: ProjectDialogProps) {
  const [loading, setLoading] = useState(false);
  const [customers, setCustomers] = useState<any[]>([]);
  const [managers, setManagers] = useState<any[]>([]);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<CreateProjectInput>();

  useEffect(() => {
    if (open) {
      fetchCustomers();
      fetchManagers();

      if (project) {
        reset({
          project_name: project.project_name,
          start_date: project.start_date.split('T')[0],
          end_date: project.end_date.split('T')[0],
          project_type: project.project_type,
          estimated_effort: project.estimated_effort,
          estimated_budget: project.estimated_budget,
          estimated_resources: project.estimated_resources,
          scope_completed: project.scope_completed,
          overall_status: project.overall_status,
          scope_status: project.scope_status,
          quality_status: project.quality_status,
          budget_status: project.budget_status,
          assigned_manager: project.assigned_manager._id,
          customer: project.customer._id,
        });
      } else {
        reset({
          project_type: ProjectType.FIXED_PRICE,
          scope_completed: 0,
          overall_status: RAGStatus.GREEN,
          scope_status: RAGStatus.GREEN,
          quality_status: RAGStatus.GREEN,
          budget_status: RAGStatus.GREEN,
        });
      }
    }
  }, [open, project, reset]);

  const fetchCustomers = async () => {
    try {
      const response = await customerService.getAll({ limit: 100 });
      setCustomers(response.data);
    } catch (error) {
      console.error('Failed to fetch customers:', error);
    }
  };

  const fetchManagers = async () => {
    try {
      const response = await userService.listUsers({ limit: 100 });
      setManagers(response.data.filter((u: any) => ['Manager', 'Admin', 'CEO'].includes(u.role)));
    } catch (error) {
      console.error('Failed to fetch managers:', error);
    }
  };

  const onSubmit = async (data: CreateProjectInput) => {
    try {
      setLoading(true);
      if (project) {
        await projectService.update(project._id, data);
      } else {
        await projectService.create(data);
      }
      onSuccess();
    } catch (error: any) {
      console.error('Failed to save project:', error);
      alert(error.response?.data?.message || 'Failed to save project');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SimpleDialog open={open} onClose={onClose}>
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
            {project ? 'Edit Project' : 'Create New Project'}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-500 dark:hover:text-gray-300"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-6">
          {/* Basic Information */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Basic Information
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="project_name">Project Name *</Label>
                <Input
                  id="project_name"
                  {...register('project_name', { required: 'Project name is required' })}
                  placeholder="Enter project name"
                />
                {errors.project_name && (
                  <p className="text-red-500 text-sm mt-1">{errors.project_name.message}</p>
                )}
              </div>

              <div>
                <Label htmlFor="customer">Customer *</Label>
                <select
                  id="customer"
                  {...register('customer', { required: 'Customer is required' })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select customer</option>
                  {customers.map((customer) => (
                    <option key={customer._id} value={customer._id}>
                      {customer.customer_name}
                    </option>
                  ))}
                </select>
                {errors.customer && (
                  <p className="text-red-500 text-sm mt-1">{errors.customer.message}</p>
                )}
              </div>

              <div>
                <Label htmlFor="assigned_manager">Assigned Manager *</Label>
                <select
                  id="assigned_manager"
                  {...register('assigned_manager', { required: 'Manager is required' })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select manager</option>
                  {managers.map((manager) => (
                    <option key={manager._id} value={manager._id}>
                      {manager.name} ({manager.role})
                    </option>
                  ))}
                </select>
                {errors.assigned_manager && (
                  <p className="text-red-500 text-sm mt-1">{errors.assigned_manager.message}</p>
                )}
              </div>

              <div>
                <Label htmlFor="project_type">Project Type *</Label>
                <select
                  id="project_type"
                  {...register('project_type', { required: 'Project type is required' })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value={ProjectType.FIXED_PRICE}>Fixed Price</option>
                  <option value={ProjectType.TIME_MATERIAL}>Time & Material</option>
                </select>
              </div>

              <div>
                <Label htmlFor="start_date">Start Date *</Label>
                <Input
                  id="start_date"
                  type="date"
                  {...register('start_date', { required: 'Start date is required' })}
                />
                {errors.start_date && (
                  <p className="text-red-500 text-sm mt-1">{errors.start_date.message}</p>
                )}
              </div>

              <div>
                <Label htmlFor="end_date">End Date *</Label>
                <Input
                  id="end_date"
                  type="date"
                  {...register('end_date', { required: 'End date is required' })}
                />
                {errors.end_date && (
                  <p className="text-red-500 text-sm mt-1">{errors.end_date.message}</p>
                )}
              </div>
            </div>
          </div>

          {/* Estimates */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Estimates
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label htmlFor="estimated_effort">Estimated Effort (hours) *</Label>
                <Input
                  id="estimated_effort"
                  type="number"
                  min="0"
                  {...register('estimated_effort', {
                    required: 'Estimated effort is required',
                    valueAsNumber: true,
                  })}
                  placeholder="0"
                />
                {errors.estimated_effort && (
                  <p className="text-red-500 text-sm mt-1">{errors.estimated_effort.message}</p>
                )}
              </div>

              <div>
                <Label htmlFor="estimated_budget">Estimated Budget ($) *</Label>
                <Input
                  id="estimated_budget"
                  type="number"
                  min="0"
                  step="0.01"
                  {...register('estimated_budget', {
                    required: 'Estimated budget is required',
                    valueAsNumber: true,
                  })}
                  placeholder="0.00"
                />
                {errors.estimated_budget && (
                  <p className="text-red-500 text-sm mt-1">{errors.estimated_budget.message}</p>
                )}
              </div>

              <div>
                <Label htmlFor="estimated_resources">Estimated Resources *</Label>
                <Input
                  id="estimated_resources"
                  type="number"
                  min="1"
                  {...register('estimated_resources', {
                    required: 'Estimated resources is required',
                    valueAsNumber: true,
                  })}
                  placeholder="1"
                />
                {errors.estimated_resources && (
                  <p className="text-red-500 text-sm mt-1">{errors.estimated_resources.message}</p>
                )}
              </div>
            </div>
          </div>

          {/* Status */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Status
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <Label htmlFor="scope_completed">Scope Completed (%)</Label>
                <Input
                  id="scope_completed"
                  type="number"
                  min="0"
                  max="100"
                  {...register('scope_completed', { valueAsNumber: true })}
                  placeholder="0"
                />
              </div>

              <div>
                <Label htmlFor="overall_status">Overall Status</Label>
                <select
                  id="overall_status"
                  {...register('overall_status')}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value={RAGStatus.GREEN}>Green</option>
                  <option value={RAGStatus.AMBER}>Amber</option>
                  <option value={RAGStatus.RED}>Red</option>
                </select>
              </div>

              <div>
                <Label htmlFor="scope_status">Scope Status</Label>
                <select
                  id="scope_status"
                  {...register('scope_status')}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value={RAGStatus.GREEN}>Green</option>
                  <option value={RAGStatus.AMBER}>Amber</option>
                  <option value={RAGStatus.RED}>Red</option>
                </select>
              </div>

              <div>
                <Label htmlFor="quality_status">Quality Status</Label>
                <select
                  id="quality_status"
                  {...register('quality_status')}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value={RAGStatus.GREEN}>Green</option>
                  <option value={RAGStatus.AMBER}>Amber</option>
                  <option value={RAGStatus.RED}>Red</option>
                </select>
              </div>

              <div>
                <Label htmlFor="budget_status">Budget Status</Label>
                <select
                  id="budget_status"
                  {...register('budget_status')}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value={RAGStatus.GREEN}>Green</option>
                  <option value={RAGStatus.AMBER}>Amber</option>
                  <option value={RAGStatus.RED}>Red</option>
                </select>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200 dark:border-gray-700">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Saving...' : project ? 'Update Project' : 'Create Project'}
            </Button>
          </div>
        </form>
      </div>
    </SimpleDialog>
  );
}
