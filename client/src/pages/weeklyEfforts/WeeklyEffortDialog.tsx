import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { X, Plus, Trash2 } from 'lucide-react';
import { SimpleDialog } from '../../components/ui/Dialog';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Label } from '../../components/ui/Label';
import weeklyEffortService from '../../services/weeklyEffortService';
import weeklyMetricsService from '../../services/weeklyMetricsService';
import projectService from '../../services/projectService';
import type { Project } from '../../services/projectService';
import resourceService from '../../services/resourceService';
import { getCurrentWeekRange, getPreviousWeekRange, calculateEndDate, formatDateForInput, toISODateString } from '../../lib/dateUtils';

interface ResourceEffortEntry {
  resource: string;
  hours: number;
}

interface WeeklyEffortFormData {
  project: string;
  week_start_date: string;
  week_end_date: string;
  scope_completed: number;
  comments: string;
  resources: ResourceEffortEntry[];
}

interface WeeklyEffortDialogProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  prefilledProject?: string;
  prefilledWeek?: { start: string; end: string } | null;
  editMode?: {
    projectId: string;
    weekStartDate: string;
    weekEndDate: string;
  } | null;
}

export function WeeklyEffortDialog({ open, onClose, onSuccess, prefilledProject, prefilledWeek, editMode }: WeeklyEffortDialogProps) {
  const [loading, setLoading] = useState(false);
  const [projects, setProjects] = useState<Project[]>([]);
  const [resources, setResources] = useState<any[]>([]);
  const [resourceEntries, setResourceEntries] = useState<ResourceEffortEntry[]>([
    { resource: '', hours: 0 }
  ]);
  const [existingMetricsId, setExistingMetricsId] = useState<string | null>(null);
  const [existingEffortIds, setExistingEffortIds] = useState<Map<string, string>>(new Map());
  const [isCurrentWeek, setIsCurrentWeek] = useState(true);
  const [isPrefilledWeek, setIsPrefilledWeek] = useState(false);
  const [projectCurrentScope, setProjectCurrentScope] = useState<number | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors },
  } = useForm<WeeklyEffortFormData>();

  const weekStartDate = watch('week_start_date');

  useEffect(() => {
    if (open) {
      fetchProjects();
      fetchResources();

      if (editMode) {
        // Edit mode - load existing efforts and metrics
        loadExistingData(editMode.projectId, editMode.weekStartDate);
      } else {
        // Create mode - use prefilled data or defaults
        const currentWeek = getCurrentWeekRange();
        const weekStart = prefilledWeek?.start || '';
        const weekEnd = prefilledWeek?.end || '';
        
        // Check if this is a prefilled week (current or previous)
        setIsPrefilledWeek(!!prefilledWeek);
        
        // Check if custom week mode (no prefilled week - always past week) or current week
        if (!prefilledWeek) {
          setIsCurrentWeek(false); // Custom mode is for past weeks only
        } else if (prefilledWeek.start === currentWeek.start) {
          setIsCurrentWeek(true);
        } else {
          setIsCurrentWeek(false);
        }
        
        // Fetch project's current scope if creating entry with prefilled project
        if (prefilledProject) {
          fetchProjectScope(prefilledProject);
        } else {
          setProjectCurrentScope(null);
        }

        reset({
          project: prefilledProject || '',
          week_start_date: weekStart,
          week_end_date: weekEnd,
          scope_completed: 0,
          comments: '',
        });
        setResourceEntries([{ resource: '', hours: 0 }]);
        setExistingMetricsId(null);
        setExistingEffortIds(new Map());
      }
    }
  }, [open, editMode, prefilledProject, prefilledWeek, reset]);

  // Auto-calculate week_end_date when week_start_date changes
  useEffect(() => {
    if (weekStartDate && !editMode) {
      const endDateStr = calculateEndDate(weekStartDate, 6);
      setValue('week_end_date', endDateStr);
      
      // Check if selected week is current week (for scope disabling)
      if (!isPrefilledWeek) {
        const currentWeek = getCurrentWeekRange();
        setIsCurrentWeek(weekStartDate === currentWeek.start);
      }
    }
  }, [weekStartDate, editMode, setValue, isPrefilledWeek]);

  const fetchProjects = async () => {
    try {
      const response = await projectService.getAll({ limit: 100 });
      setProjects(response.data);
    } catch (error) {
      console.error('Failed to fetch projects:', error);
    }
  };

  const fetchResources = async () => {
    try {
      const response = await resourceService.getAll({ limit: 100 });
      setResources(response.data);
    } catch (error) {
      console.error('Failed to fetch resources:', error);
    }
  };

  const fetchProjectScope = async (projectId: string) => {
    try {
      const projectResponse = await projectService.getById(projectId);
      
      if (projectResponse) {
        setProjectCurrentScope(projectResponse.scope_completed || 0);
      } else {
        setProjectCurrentScope(null);
      }
    } catch (error) {
      console.error('Failed to fetch project scope:', error);
      setProjectCurrentScope(null);
    }
  };

  const loadExistingData = async (projectId: string, weekStartDate: string) => {
    try {
      setLoading(true);

      // Fetch weekly metrics for this project and week
      const metricsResponse = await weeklyMetricsService.getAll({
        project: projectId,
        week_start_date: weekStartDate,
        limit: 1,
      });

      // Fetch weekly efforts for this project and week
      const effortsResponse = await weeklyEffortService.getAll({
        project: projectId,
        week_start_date: weekStartDate,
        limit: 100,
      });

      const metrics = metricsResponse.data[0];
      const efforts = effortsResponse.data;

      if (metrics) {
        setExistingMetricsId(metrics._id);
        
        // Check if this is the current week
        const currentWeek = getCurrentWeekRange();
        const isEditingCurrentWeek = metrics.week_start_date.split('T')[0] === currentWeek.start;
        setIsCurrentWeek(isEditingCurrentWeek);
        
        reset({
          project: projectId,
          week_start_date: formatDateForInput(metrics.week_start_date),
          week_end_date: formatDateForInput(metrics.week_end_date),
          scope_completed: metrics.scope_completed,
          comments: metrics.comments || '',
        });
      }

      if (efforts && efforts.length > 0) {
        const effortMap = new Map<string, string>();
        const entries = efforts.map((effort: any) => {
          effortMap.set(effort.resource._id || effort.resource, effort._id);
          return {
            resource: effort.resource._id || effort.resource,
            hours: effort.hours,
          };
        });
        setResourceEntries(entries);
        setExistingEffortIds(effortMap);
      } else {
        setResourceEntries([{ resource: '', hours: 0 }]);
      }
    } catch (error) {
      console.error('Failed to load existing data:', error);
      alert('Failed to load existing data');
    } finally {
      setLoading(false);
    }
  };

  const addResourceEntry = () => {
    setResourceEntries([...resourceEntries, { resource: '', hours: 0 }]);
  };

  const removeResourceEntry = (index: number) => {
    if (resourceEntries.length > 1) {
      setResourceEntries(resourceEntries.filter((_, i) => i !== index));
    }
  };

  const updateResourceEntry = (index: number, field: 'resource' | 'hours', value: string | number) => {
    const updated = [...resourceEntries];
    updated[index] = {
      ...updated[index],
      [field]: field === 'hours' ? Number(value) : value
    };
    setResourceEntries(updated);
  };

  const calculateTotalHours = () => {
    return resourceEntries.reduce((sum, entry) => sum + (entry.hours || 0), 0);
  };

  // Filter to allow only Mondays in date picker
  const handleWeekStartDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedDate = e.target.value;
    if (!selectedDate) {
      setValue('week_start_date', '');
      return;
    }

    const date = new Date(selectedDate + 'T00:00:00');
    const dayOfWeek = date.getDay();

    // If selected date is not Monday, adjust to nearest Monday
    if (dayOfWeek !== 1) {
      const daysToSubtract = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
      date.setDate(date.getDate() - daysToSubtract);
      const mondayDate = toISODateString(date);
      setValue('week_start_date', mondayDate);
    } else {
      setValue('week_start_date', selectedDate);
    }
  };

  // Get max date for custom week selection (before previous week)
  const getMaxSelectableDate = () => {
    const previousWeek = getPreviousWeekRange();
    const maxDate = new Date(previousWeek.start);
    maxDate.setDate(maxDate.getDate() - 1); // Day before previous week Monday
    return toISODateString(maxDate);
  };

  const onSubmit = async (data: WeeklyEffortFormData) => {
    try {
      setLoading(true);

      // Validate resource entries
      const validEntries = resourceEntries.filter(entry => entry.resource && entry.hours > 0);
      if (validEntries.length === 0) {
        alert('Please add at least one resource with hours');
        return;
      }

      if (editMode && existingMetricsId) {
        // Update mode
        // 1. Handle weekly efforts - update existing, create new, delete removed
        const currentResourceIds = new Set(validEntries.map(e => e.resource));
        const existingResourceIds = new Set(existingEffortIds.keys());

        // Update or create efforts
        const effortPromises = validEntries.map(entry => {
          const existingEffortId = existingEffortIds.get(entry.resource);
          if (existingEffortId) {
            // Update existing effort
            return weeklyEffortService.update(existingEffortId, {
              hours: entry.hours,
            });
          } else {
            // Create new effort
            return weeklyEffortService.create({
              project: data.project,
              resource: entry.resource,
              hours: entry.hours,
              week_start_date: data.week_start_date,
              week_end_date: data.week_end_date,
            });
          }
        });

        // Delete removed efforts
        const deletePromises = Array.from(existingResourceIds)
          .filter(resourceId => !currentResourceIds.has(resourceId))
          .map(resourceId => {
            const effortId = existingEffortIds.get(resourceId);
            return effortId ? weeklyEffortService.delete(effortId) : Promise.resolve();
          });

        await Promise.all([...effortPromises, ...deletePromises]);

        // 2. Update weekly metrics
        await weeklyMetricsService.update(existingMetricsId, {
          rollup_hours: calculateTotalHours(),
          scope_completed: data.scope_completed,
          comments: data.comments,
        });
      } else {
        // Create mode
        // Create weekly efforts for each resource
        const effortPromises = validEntries.map(entry =>
          weeklyEffortService.create({
            project: data.project,
            resource: entry.resource,
            hours: entry.hours,
            week_start_date: data.week_start_date,
            week_end_date: data.week_end_date,
          })
        );

        await Promise.all(effortPromises);

        // Create weekly metrics entry
        await weeklyMetricsService.create({
          project: data.project,
          week_start_date: data.week_start_date,
          week_end_date: data.week_end_date,
          rollup_hours: calculateTotalHours(),
          scope_completed: data.scope_completed,
          comments: data.comments,
        });
      }

      onSuccess();
    } catch (error: any) {
      console.error('Failed to save weekly effort:', error);
      alert(error.response?.data?.message || 'Failed to save weekly effort');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SimpleDialog open={open} onClose={onClose}>
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
            {editMode ? 'Edit Weekly Effort' : 'Log Weekly Effort'}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-500 dark:hover:text-gray-300"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-6">
          {/* Project Current Progress - Show in create mode with prefilled project */}
          {!editMode && prefilledProject && projectCurrentScope !== null && (
            <div className="bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-semibold text-green-900 dark:text-green-300">
                  Project Current Progress
                </h3>
                <span className="text-lg font-bold text-green-700 dark:text-green-400">
                  {projectCurrentScope}%
                </span>
              </div>
              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3 overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-300 bg-gradient-to-r from-green-500 to-emerald-500"
                  style={{ width: `${projectCurrentScope}%` }}
                />
              </div>
              <p className="text-xs text-green-600 dark:text-green-400 mt-2">
                Current project scope before this week's update
              </p>
            </div>
          )}

          {/* Header Section - Project, Week, Scope, Comments */}
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
            <h3 className="text-lg font-semibold text-blue-900 dark:text-blue-300 mb-4">
              Week Summary
            </h3>

            {/* Project */}
            <div className="mb-4">
              <Label htmlFor="project">Project *</Label>
              <select
                id="project"
                {...register('project', { required: 'Project is required' })}
                disabled={!!editMode || !!prefilledProject}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:bg-gray-100 disabled:dark:bg-gray-700 disabled:cursor-not-allowed"
              >
                <option value="">Select project</option>
                {projects.map((project) => (
                  <option key={project._id} value={project._id}>
                    {project.project_name}
                  </option>
                ))}
              </select>
              {errors.project && (
                <p className="text-red-500 text-sm mt-1">{errors.project.message}</p>
              )}
            </div>

            {/* Week Range */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div>
                <Label htmlFor="week_start_date">Week Start Date (Monday) *</Label>
                <Input
                  id="week_start_date"
                  type="date"
                  {...register('week_start_date', { required: 'Week start date is required' })}
                  onChange={handleWeekStartDateChange}
                  disabled={!!editMode || isPrefilledWeek}
                  max={!editMode && !isPrefilledWeek ? getMaxSelectableDate() : undefined}
                  className={editMode || isPrefilledWeek ? 'bg-gray-100 dark:bg-gray-700 cursor-not-allowed' : ''}
                />
                {errors.week_start_date && (
                  <p className="text-red-500 text-sm mt-1">{errors.week_start_date.message}</p>
                )}
                {!editMode && !isPrefilledWeek && (
                  <p className="text-gray-500 dark:text-gray-400 text-xs mt-1">Select a Monday before previous week</p>
                )}
              </div>

              <div>
                <Label htmlFor="week_end_date">Week End Date (Sunday) *</Label>
                <Input
                  id="week_end_date"
                  type="date"
                  {...register('week_end_date', { required: 'Week end date is required' })}
                  disabled
                  className="bg-gray-100 dark:bg-gray-700 cursor-not-allowed"
                />
                {errors.week_end_date && (
                  <p className="text-red-500 text-sm mt-1">{errors.week_end_date.message}</p>
                )}
                <p className="text-gray-500 dark:text-gray-400 text-xs mt-1">Auto-calculated (6 days after start)</p>
              </div>
            </div>

            {/* Scope Completed */}
            <div className="mb-4">
              <Label htmlFor="scope_completed">Scope Completed (%) *</Label>
              <Input
                id="scope_completed"
                type="number"
                min="0"
                max="100"
                step="1"
                {...register('scope_completed', {
                  required: 'Scope completed is required',
                  valueAsNumber: true,
                  min: { value: 0, message: 'Scope completed must be at least 0' },
                  max: { value: 100, message: 'Scope completed cannot exceed 100' },
                })}
                placeholder="0"
                disabled={!isCurrentWeek}
                className={!isCurrentWeek ? 'bg-gray-100 dark:bg-gray-700 cursor-not-allowed' : ''}
              />
              {errors.scope_completed && (
                <p className="text-red-500 text-sm mt-1">{errors.scope_completed.message}</p>
              )}
              {!isCurrentWeek && weekStartDate && (
                <p className="text-amber-600 dark:text-amber-400 text-xs mt-1">⚠️ Scope cannot be updated for past weeks</p>
              )}
            </div>

            {/* Comments */}
            <div>
              <Label htmlFor="comments">Comments</Label>
              <textarea
                id="comments"
                {...register('comments')}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                placeholder="Add any comments about this week's progress..."
              />
            </div>

            {/* Total Hours Display */}
            <div className="mt-4 p-3 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-blue-900 dark:text-blue-300">
                  Total Hours (Calculated):
                </span>
                <span className="text-xl font-bold text-blue-700 dark:text-blue-400">
                  {calculateTotalHours()} hrs
                </span>
              </div>
            </div>
          </div>

          {/* Detail Section - Resources and Hours */}
          <div className="bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Resource Efforts
              </h3>
              <Button
                type="button"
                size="sm"
                onClick={addResourceEntry}
                className="flex items-center gap-1"
              >
                <Plus className="w-4 h-4" />
                Add Resource
              </Button>
            </div>

            <div className="space-y-3">
              {resourceEntries.map((entry, index) => (
                <div
                  key={index}
                  className="flex items-start gap-3 bg-white dark:bg-gray-800 p-3 rounded-lg border border-gray-200 dark:border-gray-700"
                >
                  <div className="flex-1">
                    <Label htmlFor={`resource-${index}`}>Resource *</Label>
                    <select
                      id={`resource-${index}`}
                      value={entry.resource}
                      onChange={(e) => updateResourceEntry(index, 'resource', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">Select resource</option>
                      {resources.map((resource) => (
                        <option key={resource._id} value={resource._id}>
                          {resource.resource_name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="w-32">
                    <Label htmlFor={`hours-${index}`}>Hours *</Label>
                    <Input
                      id={`hours-${index}`}
                      type="number"
                      min="0"
                      step="0.5"
                      value={entry.hours}
                      onChange={(e) => updateResourceEntry(index, 'hours', e.target.value)}
                      placeholder="0"
                    />
                  </div>

                  <div className="pt-6">
                    <button
                      type="button"
                      onClick={() => removeResourceEntry(index)}
                      disabled={resourceEntries.length === 1}
                      className="p-2 text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 disabled:opacity-30 disabled:cursor-not-allowed"
                      title="Remove resource"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {resourceEntries.length === 0 && (
              <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                <p>No resources added yet. Click "Add Resource" to get started.</p>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200 dark:border-gray-700">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Saving...' : editMode ? 'Update Entry' : 'Create Entry'}
            </Button>
          </div>
        </form>
      </div>
    </SimpleDialog>
  );
}
