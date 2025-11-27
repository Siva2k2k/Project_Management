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
  ProjectStatus,
  HourlyRateSource,
} from '../../services/projectService';
import type { Project, CreateProjectInput } from '../../services/projectService';
import customerService from '../../services/customerService';
import userService from '../../services/userService';
import resourceService from '../../services/resourceService';
import { useAuth } from '../../context/AuthContext';
import { UserRole } from '../../types';

interface ProjectDialogProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  project?: Project | null;
}

export function ProjectDialog({ open, onClose, onSuccess, project }: ProjectDialogProps) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [customers, setCustomers] = useState<any[]>([]);
  const [managers, setManagers] = useState<any[]>([]);
  const [resources, setResources] = useState<any[]>([]);
  const [selectedResources, setSelectedResources] = useState<string[]>([]);
  // Using a simple multi-select dropdown for resource assignment
  const [query, setQuery] = useState('');
  const [options, setOptions] = useState<any[]>([]);
  const [searching, setSearching] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<CreateProjectInput>();

  useEffect(() => {
    if (open) {
      // Load data first, then reset form
      const loadData = async () => {
        // Load customers and managers immediately, resources loaded on-demand via search
        await Promise.all([
          fetchCustomers(),
          fetchManagers(),
        ]);
        
        // If editing, load project's existing resources for display
        if (project?.resources && project.resources.length > 0) {
          setResources(project.resources);
          setOptions(project.resources);
        }

        if (project) {
          // Extract resource IDs from project
          const resourceIds = project.resources?.map(r => r._id) || [];
          setSelectedResources(resourceIds);
          
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
            project_status: project.project_status,
            hourly_rate: project.hourly_rate,
            hourly_rate_source: project.hourly_rate_source,
          });
        } else {
          setSelectedResources([]);
          reset({
            project_type: ProjectType.FIXED_PRICE,
            scope_completed: 0,
            overall_status: RAGStatus.GREEN,
            scope_status: RAGStatus.GREEN,
            quality_status: RAGStatus.GREEN,
            budget_status: RAGStatus.GREEN,
            project_status: ProjectStatus.ACTIVE,
            hourly_rate_source: HourlyRateSource.RESOURCE,
            // Auto-select manager if the logged-in user is a Manager
            assigned_manager: user?.role === UserRole.MANAGER ? user._id : '',
          });
        }
      };

      loadData();
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
      // If user is a Manager, they can only assign projects to themselves
      if (user?.role === UserRole.MANAGER) {
        setManagers([user]);
      } else {
        // Admin and CEO can see all managers
        const response = await userService.listUsers({ limit: 100 });
        setManagers(response.data.filter((u: any) => ['Manager', 'Admin', 'CEO'].includes(u.role)));
      }
    } catch (error) {
      console.error('Failed to fetch managers:', error);
    }
  };

  const handleSearchChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const q = e.target.value;
    setQuery(q);
    
    // If query is empty or too short, load active resources as default
    if (q.trim().length === 0) {
      setOptions([]);
      return;
    }
    
    if (q.trim().length < 2) {
      // Show existing resources if available
      setOptions(resources);
      return;
    }
    
    try {
      setSearching(true);
      const result = await resourceService.search(q.trim());
      setOptions(result);
      // Cache fetched resources for reuse
      setResources(prev => {
        const newResources = [...prev];
        result.forEach((r: any) => {
          if (!newResources.find(existing => existing._id === r._id)) {
            newResources.push(r);
          }
        });
        return newResources;
      });
    } catch (err) {
      console.error('Search resources failed:', err);
    } finally {
      setSearching(false);
    }
  };

  const addResource = (id: string) => {
    setSelectedResources(prev => (prev.includes(id) ? prev : [...prev, id]));
  };

  const removeResource = (id: string) => {
    setSelectedResources(prev => prev.filter(rid => rid !== id));
  };

  const onSubmit = async (data: CreateProjectInput) => {
    try {
      setLoading(true);
      
      // Clean up the data - remove NaN values and add resources
      const cleanedData = {
        ...data,
        resources: selectedResources,
        hourly_rate: (!data.hourly_rate || isNaN(data.hourly_rate as number)) ? undefined : data.hourly_rate,
      };
      
      console.log('Submitting project data:', cleanedData);
      if (project) {
        await projectService.update(project._id, cleanedData);
      } else {
        await projectService.create(cleanedData);
      }
      onSuccess();
    } catch (error: any) {
      console.error('Failed to save project:', error);
      console.error('Error response:', error.response?.data);
      
      let errorMessage = 'Failed to save project';
      
      if (error.response?.data?.errors && Array.isArray(error.response.data.errors)) {
        console.log('Validation errors:', error.response.data.errors);
        errorMessage = error.response.data.errors
          .map((e: any) => `${e.field || 'Unknown'}: ${e.message}`)
          .join('\n');
      } else if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      }
      
      alert(errorMessage);
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

          {/* Resources Assignment */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Assign Resources</h3>
            <Label htmlFor="resource_search">Search Resources</Label>
            <Input
              id="resource_search"
              value={query}
              onChange={handleSearchChange}
              placeholder="Type to search by name or email..."
            />
            <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="border border-gray-300 dark:border-gray-600 rounded-lg p-2 bg-white dark:bg-gray-800 max-h-48 overflow-y-auto">
                {searching ? (
                  <p className="text-sm text-gray-500 dark:text-gray-400 px-2">Searching...</p>
                ) : query.length === 0 ? (
                  <p className="text-sm text-gray-500 dark:text-gray-400 px-2">Start typing to search resources</p>
                ) : options.length === 0 ? (
                  <p className="text-sm text-gray-500 dark:text-gray-400 px-2">No resources found for "{query}"</p>
                ) : (
                  options.map((r) => (
                    <button
                      key={r._id}
                      type="button"
                      onClick={() => addResource(r._id)}
                      className="w-full text-left px-3 py-2 rounded hover:bg-gray-100 dark:hover:bg-gray-700"
                    >
                      <span className="text-sm font-medium text-gray-900 dark:text-white">{r.resource_name}</span>
                      <span className="block text-xs text-gray-500 dark:text-gray-400">{r.email} • {r.currency} {r.per_hour_rate}/hr</span>
                    </button>
                  ))
                )}
              </div>
              <div>
                <p className="text-sm text-gray-700 dark:text-gray-300 mb-2">Selected</p>
                <div className="flex flex-wrap gap-2">
                  {selectedResources.length === 0 ? (
                    <p className="text-sm text-gray-500 dark:text-gray-400">No resources selected</p>
                  ) : (
                    selectedResources.map((id) => {
                      const r = resources.find((x) => x._id === id) || options.find((x) => x._id === id);
                      return (
                        <span key={id} className="inline-flex items-center gap-2 px-2 py-1 rounded-full border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-900 text-gray-800 dark:text-gray-200">
                          {r ? r.resource_name : id}
                          <button type="button" onClick={() => removeResource(id)} className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200">×</button>
                        </span>
                      );
                    })
                  )}
                </div>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">{selectedResources.length} resource(s) selected</p>
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
                  step="0.01"
                  {...register('scope_completed', { valueAsNumber: true })}
                  placeholder="0"
                />
              </div>

              <div>
                <Label htmlFor="project_status">Project Status</Label>
                <select
                  id="project_status"
                  {...register('project_status')}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value={ProjectStatus.ACTIVE}>Active</option>
                  <option value={ProjectStatus.COMPLETED}>Completed</option>
                  <option value={ProjectStatus.DEFERRED}>Deferred</option>
                </select>
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

          {/* Hourly Rate Configuration */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Hourly Rate Configuration
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="hourly_rate_source">Hourly Rate Source</Label>
                <select
                  id="hourly_rate_source"
                  {...register('hourly_rate_source')}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value={HourlyRateSource.RESOURCE}>Resource Level</option>
                  <option value={HourlyRateSource.PROJECT}>Project Level</option>
                  <option value={HourlyRateSource.ORGANIZATION}>Organization Level</option>
                </select>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  Resource: Use each resource's hourly rate | Project: Use project-specific rate | Organization: Use organization default rate
                </p>
              </div>

              <div>
                <Label htmlFor="hourly_rate">Project Hourly Rate (Optional)</Label>
                <Input
                  id="hourly_rate"
                  type="number"
                  step="0.01"
                  min="0"
                  {...register('hourly_rate', { valueAsNumber: true })}
                  placeholder="Only required if using Project Level rate"
                />
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  Required only when 'Hourly Rate Source' is set to 'Project Level'
                </p>
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
