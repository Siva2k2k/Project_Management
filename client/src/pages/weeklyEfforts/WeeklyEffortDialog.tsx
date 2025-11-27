import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { X, Plus, Trash2 } from 'lucide-react';
import { SimpleDialog } from '../../components/ui/Dialog';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Label } from '../../components/ui/Label';
import weeklyEffortService from '../../services/weeklyEffortService';
import weeklyMetricsService from '../../services/weeklyMetricsService';
import resourceService from '../../services/resourceService';
import projectService from '../../services/projectService';
import type { Project } from '../../services/projectService';
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
  // CSV import states
  const [csvReviewOpen, setCsvReviewOpen] = useState(false);
  const [csvPendingAdds, setCsvPendingAdds] = useState<any[]>([]); // resources found globally but not assigned
  const [csvUnknownEmails, setCsvUnknownEmails] = useState<string[]>([]); // emails not found anywhere
  const [csvParsedRows, setCsvParsedRows] = useState<Array<{ email: string; hours: number }>>([]);
  const [csvSelectedToAdd, setCsvSelectedToAdd] = useState<boolean[]>([]); // track which pending resources are selected
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
  const selectedProject = watch('project');

  useEffect(() => {
    if (open) {
      fetchProjects();

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

  // Populate resources from selected project
  useEffect(() => {
    if (selectedProject && !editMode) {
      loadProjectResources(selectedProject);
    }
  }, [selectedProject, editMode]);

  const fetchProjects = async () => {
    try {
      const response = await projectService.getAll({ limit: 100 });
      setProjects(response.data);
    } catch (error) {
      console.error('Failed to fetch projects:', error);
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

  const loadProjectResources = async (projectId: string) => {
    try {
      const projectResponse = await projectService.getById(projectId);
      
      if (projectResponse) {
        // Set project scope if available
        if (projectResponse.scope_completed !== undefined) {
          setProjectCurrentScope(projectResponse.scope_completed);
        }
        
        // Load project-specific resources into the resources dropdown
        if (projectResponse.resources && projectResponse.resources.length > 0) {
          setResources(projectResponse.resources);
          // Populate resource entries with project's assigned resources
          const entries = projectResponse.resources.map((resource: any) => ({
            resource: resource._id,
            hours: 0,
          }));
          setResourceEntries(entries);
        } else {
          // No resources assigned to project, clear resources and keep default empty entry
          setResources([]);
          setResourceEntries([{ resource: '', hours: 0 }]);
        }
      }
    } catch (error) {
      console.error('Failed to load project resources:', error);
      setResources([]);
      setResourceEntries([{ resource: '', hours: 0 }]);
    }
  };

  const loadExistingData = async (projectId: string, weekStartDate: string) => {
    try {
      setLoading(true);

      // Fetch all data in parallel
      const [projectResponse, metricsResponse, effortsResponse] = await Promise.all([
        projectService.getById(projectId),
        weeklyMetricsService.getAll({
          project: projectId,
          week_start_date: weekStartDate,
          limit: 1,
        }),
        weeklyEffortService.getAll({
          project: projectId,
          week_start_date: weekStartDate,
          limit: 100,
        }),
      ]);

      const metrics = metricsResponse.data[0];
      const efforts = effortsResponse.data;

      // Load project resources for the dropdown
      const projectResources = projectResponse?.resources || [];
      setResources(projectResources);

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
        const entries = efforts
          .filter((effort: any) => effort.resource) // Filter out efforts with deleted resources
          .map((effort: any) => {
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

      console.log('Edit mode loaded:', {
        projectResources: projectResources.length,
        efforts: efforts?.length || 0,
        resourceEntries: efforts?.map((e) => ({
          resourceId: typeof e.resource === 'object' ? e.resource._id : e.resource,
          resourceName: typeof e.resource === 'object' ? e.resource.resource_name : 'N/A',
          hours: e.hours
        }))
      });
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

  // Helper: Parse CSV file into structured data
  const parseCsvRows = (text: string): Array<{ email: string; hours: number }> => {
    const lines = text.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
    const rows: Array<{ email: string; hours: number }> = [];

    for (const line of lines) {
      const parts = line.split(',').map(p => p.trim());
      if (parts.length < 2) continue;
      
      const email = parts[0].toLowerCase();
      const hours = Number(parts[1]);
      
      if (email && !isNaN(hours) && hours > 0) {
        rows.push({ email, hours });
      }
    }

    return rows;
  };

  // Helper: Build email to resource mapping
  const buildResourceEmailMap = (resourceList: any[]): Record<string, any> => {
    const byEmail: Record<string, any> = {};
    resourceList.forEach((r: any) => {
      if (r.email) {
        byEmail[r.email.toLowerCase()] = r;
      }
    });
    return byEmail;
  };

  // Helper: Search for resources not in current project
  const searchMissingResources = async (
    rows: Array<{ email: string; hours: number }>,
    byEmail: Record<string, any>
  ): Promise<{ foundGlobal: Record<string, any>; unknowns: string[] }> => {
    const needSearch = rows
      .map(row => row.email)
      .filter(email => !byEmail[email]);

    const foundGlobal: Record<string, any> = {};
    const unknowns: string[] = [];

    for (const email of needSearch) {
      try {
        const res = await resourceService.search(email);
        const match = (res || []).find((r: any) => r.email && r.email.toLowerCase() === email);
        
        if (match) {
          foundGlobal[email] = match;
        } else {
          unknowns.push(email);
        }
      } catch (e) {
        unknowns.push(email);
      }
    }

    return { foundGlobal, unknowns };
  };

  // CSV upload handling
  const handleCsvUpload = async (file: File) => {
    const text = await file.text();
    const rows = parseCsvRows(text);
    const byEmail = buildResourceEmailMap(resources);
    const { foundGlobal, unknowns } = await searchMissingResources(rows, byEmail);

    // Prepare pending adds list (resources found globally but not in project)
    const adds = Object.values(foundGlobal).filter(
      resource => !byEmail[resource.email.toLowerCase()]
    );

    setCsvParsedRows(rows);
    setCsvPendingAdds(adds);
    setCsvUnknownEmails(unknowns);
    setCsvSelectedToAdd(adds.map(() => true));
    setCsvReviewOpen(true);
  };

  // Helper: Add selected resources from CSV to project resources
  const addSelectedCsvResources = (): any[] => {
    const newResources = [...resources];
    csvPendingAdds.forEach((r, idx) => {
      if (csvSelectedToAdd[idx]) {
        newResources.push(r);
      }
    });
    return newResources;
  };

  // Helper: Merge CSV hours into resource entries
  const mergeHoursFromCsv = (
    byEmail: Record<string, any>,
    currentEntries: ResourceEffortEntry[]
  ): ResourceEffortEntry[] => {
    const updated = [...currentEntries];

    for (const row of csvParsedRows) {
      const resource = byEmail[row.email];
      if (!resource) continue;

      const existingIdx = updated.findIndex(e => e.resource === resource._id);
      
      if (existingIdx >= 0) {
        updated[existingIdx] = {
          ...updated[existingIdx],
          hours: (updated[existingIdx].hours || 0) + row.hours,
        };
      } else {
        updated.push({ resource: resource._id, hours: row.hours });
      }
    }

    return updated;
  };

  // Helper: Clear CSV import state
  const clearCsvImportState = () => {
    setCsvReviewOpen(false);
    setCsvPendingAdds([]);
    setCsvUnknownEmails([]);
    setCsvParsedRows([]);
    setCsvSelectedToAdd([]);
  };

  const applyCsvImport = () => {
    const newResources = addSelectedCsvResources();
    const byEmail = buildResourceEmailMap(newResources);
    const updated = mergeHoursFromCsv(byEmail, resourceEntries);

    setResources(newResources);
    setResourceEntries(updated);
    clearCsvImportState();
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

  // Helper: Validate resource entries before submission
  const validateResourceEntries = (entries: ResourceEffortEntry[]): ResourceEffortEntry[] => {
    return entries.filter(entry => entry.resource && entry.hours > 0);
  };

  // Helper: Update or create efforts in edit mode
  const updateOrCreateEfforts = (
    validEntries: ResourceEffortEntry[],
    data: WeeklyEffortFormData
  ): Promise<any>[] => {
    return validEntries.map(entry => {
      const existingEffortId = existingEffortIds.get(entry.resource);
      
      if (existingEffortId) {
        return weeklyEffortService.update(existingEffortId, {
          hours: entry.hours,
        });
      }
      
      return weeklyEffortService.create({
        project: data.project,
        resource: entry.resource,
        hours: entry.hours,
        week_start_date: data.week_start_date,
        week_end_date: data.week_end_date,
      });
    });
  };

  // Helper: Delete removed efforts in edit mode
  const deleteRemovedEfforts = (currentResourceIds: Set<string>): Promise<any>[] => {
    const existingResourceIds = new Set(existingEffortIds.keys());
    const removedResourceIds = Array.from(existingResourceIds)
      .filter(resourceId => !currentResourceIds.has(resourceId));

    return removedResourceIds.map(resourceId => {
      const effortId = existingEffortIds.get(resourceId);
      return effortId ? weeklyEffortService.delete(effortId) : Promise.resolve();
    });
  };

  // Helper: Handle update mode
  const handleUpdateMode = async (
    validEntries: ResourceEffortEntry[],
    data: WeeklyEffortFormData
  ) => {
    const currentResourceIds = new Set(validEntries.map(e => e.resource));
    const effortPromises = updateOrCreateEfforts(validEntries, data);
    const deletePromises = deleteRemovedEfforts(currentResourceIds);

    await Promise.all([...effortPromises, ...deletePromises]);

    await weeklyMetricsService.update(existingMetricsId!, {
      rollup_hours: calculateTotalHours(),
      scope_completed: data.scope_completed,
      comments: data.comments,
    });
  };

  // Helper: Handle create mode
  const handleCreateMode = async (
    validEntries: ResourceEffortEntry[],
    data: WeeklyEffortFormData
  ) => {
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

    await weeklyMetricsService.create({
      project: data.project,
      week_start_date: data.week_start_date,
      week_end_date: data.week_end_date,
      rollup_hours: calculateTotalHours(),
      scope_completed: data.scope_completed,
      comments: data.comments,
    });
  };

  const onSubmit = async (data: WeeklyEffortFormData) => {
    try {
      setLoading(true);

      const validEntries = validateResourceEntries(resourceEntries);
      if (validEntries.length === 0) {
        alert('Please add at least one resource with hours');
        setLoading(false);
        return;
      }

      if (editMode && existingMetricsId) {
        await handleUpdateMode(validEntries, data);
      } else {
        await handleCreateMode(validEntries, data);
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
          {/* Minimal Project Progress Indicator (inline) */}
          {!editMode && prefilledProject && projectCurrentScope !== null && (
            <div className="flex items-center gap-2 text-sm text-green-700 dark:text-green-400">
              <span className="inline-flex items-center px-2 py-1 rounded-md bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800">
                Current scope: <span className="ml-1 font-semibold">{projectCurrentScope}%</span>
              </span>
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
              <div className="flex items-center justify-between">
                <Label htmlFor="scope_completed">Scope Completed (%) *</Label>
                {/* Inline mini progress (right of label) */}
                {!editMode && prefilledProject && projectCurrentScope !== null && (
                  <span className="text-xs text-green-700 dark:text-green-400">Prev: {projectCurrentScope}%</span>
                )}
              </div>
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

            {/* Comments */}
            <div className="mt-4">
              <Label htmlFor="comments">Comments</Label>
              <textarea
                id="comments"
                rows={3}
                {...register('comments')}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                placeholder="Add any comments about this week's progress..."
              />
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

            {/* CSV Upload */}
            <div className="mb-4 flex items-center gap-3">
              <input
                id="csv-file"
                type="file"
                accept=".csv"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleCsvUpload(file);
                  e.currentTarget.value = '';
                }}
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => document.getElementById('csv-file')?.click()}
              >
                Upload CSV (email,hours)
              </Button>
              <span className="text-xs text-gray-500 dark:text-gray-400">Adds hours to matching resources by email</span>
            </div>

            {!editMode && selectedProject && resourceEntries.length > 1 && resourceEntries.some(e => e.resource) && (
              <div className="mb-3 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                <p className="text-sm text-blue-700 dark:text-blue-300">
                  ✓ Resources auto-populated from project assignments. Simply enter hours for each resource.
                </p>
              </div>
            )}

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
        {/* CSV Review Dialog */}
        {csvReviewOpen && (
          <SimpleDialog open={csvReviewOpen} onClose={() => setCsvReviewOpen(false)}>
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-xl w-full">
              <div className="p-6 border-b border-gray-200 dark:border-gray-700">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">CSV Import Review</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">Parsed {csvParsedRows.length} rows.</p>
              </div>
              <div className="p-6 space-y-4">
                {/* Success summary */}
                {csvPendingAdds.length === 0 && csvUnknownEmails.length === 0 && csvParsedRows.length > 0 && (
                  <div className="py-2">
                    <p className="text-green-700 dark:text-green-400 text-sm font-medium">All emails matched existing project resources. Imported hours will be added to matching entries.</p>
                  </div>
                )}
                {/* Pending adds */}
                {csvPendingAdds.length > 0 && (
                  <div>
                    <p className="text-sm font-medium text-gray-900 dark:text-white mb-2">Resources not assigned to this project:</p>
                    <p className="text-xs text-gray-600 dark:text-gray-400 mb-2">Select to add them to the project and apply hours.</p>
                    {csvPendingAdds.map((r, idx) => (
                      <div key={r._id} className="flex items-center justify-between py-1">
                        <div>
                          <span className="text-sm text-gray-900 dark:text-white">{r.resource_name}</span>
                          <span className="ml-2 text-xs text-gray-600 dark:text-gray-400">{r.email}</span>
                        </div>
                        <input
                          type="checkbox"
                          checked={csvSelectedToAdd[idx]}
                          onChange={(e) => {
                            const updated = [...csvSelectedToAdd];
                            updated[idx] = e.target.checked;
                            setCsvSelectedToAdd(updated);
                          }}
                          aria-label={`Add ${r.resource_name}`}
                          className="w-4 h-4"
                        />
                      </div>
                    ))}
                  </div>
                )}
                {/* Unknown emails */}
                {csvUnknownEmails.length > 0 && (
                  <div className="mt-2">
                    <p className="text-sm font-medium text-red-700 dark:text-red-400">Unknown emails (not found in Resources):</p>
                    <ul className="list-disc ml-5 text-sm text-red-700 dark:text-red-400">
                      {csvUnknownEmails.map(email => (
                        <li key={email}>{email}</li>
                      ))}
                    </ul>
                  </div>
                )}
                {/* No valid rows */}
                {csvParsedRows.length === 0 && (
                  <div className="py-2">
                    <p className="text-sm text-red-700 dark:text-red-400">No valid rows found in CSV. Please use format: <code>email,hours</code> per line.</p>
                  </div>
                )}
              </div>
              <div className="p-6 border-t border-gray-200 dark:border-gray-700 flex justify-end gap-2">
                <Button variant="outline" onClick={() => setCsvReviewOpen(false)}>Cancel</Button>
                <Button onClick={applyCsvImport}>Apply</Button>
              </div>
            </div>
          </SimpleDialog>
        )}
      </div>
    </SimpleDialog>
  );
}
