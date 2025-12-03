import { useEffect, useState, useMemo } from 'react';
import { Eye, Edit2, Plus, Calendar, DollarSign, Clock, Target, Activity, Users } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Pagination } from '../../components/ui/Pagination';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../components/ui/Select';
import { WeeklyEffortDialog } from './WeeklyEffortDialog';
import { ResourceBreakdownDialog } from './ResourceBreakdownDialog';
import projectService, { type Project } from '../../services/projectService';
import weeklyMetricsService, { type WeeklyMetrics } from '../../services/weeklyMetricsService';
import weeklyEffortService from '../../services/weeklyEffortService';
import { getCurrentWeekRange, getPreviousWeekRange, formatDate } from '../../lib/dateUtils';
import { useAuth } from '../../context/AuthContext';
import { UserRole } from '../../types';

export function WeeklyEffortsList() {
  const { user } = useAuth();
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string>('');
  const [metrics, setMetrics] = useState<WeeklyMetrics[]>([]);
  const [loading, setLoading] = useState(false);
  const [metricsLoading, setMetricsLoading] = useState(false);
  const [resourceCounts, setResourceCounts] = useState<{ [key: string]: number }>({});
  const [page, setPage] = useState(1);
  const limit = 10;
  
  // Dialog states
  const [isEntryDialogOpen, setIsEntryDialogOpen] = useState(false);
  const [isBreakdownDialogOpen, setIsBreakdownDialogOpen] = useState(false);
  const [dialogProps, setDialogProps] = useState<{
    prefilledProject?: string;
    prefilledWeek?: { start: string; end: string } | null;
    editMode?: { projectId: string; weekStartDate: string; weekEndDate: string } | null;
  }>({});
  const [breakdownProps, setBreakdownProps] = useState<{
    projectId: string;
    weekStartDate: string;
    weekEndDate: string;
    projectName: string;
  } | null>(null);

  // Current/Previous week ranges
  const currentWeek = useMemo(() => getCurrentWeekRange(), []);
  const previousWeek = useMemo(() => getPreviousWeekRange(), []);

  useEffect(() => {
    fetchProjects();
  }, []);

  useEffect(() => {
    if (selectedProjectId) {
      fetchProjectMetrics(selectedProjectId);
      setPage(1); // Reset to first page when project changes
    } else {
      setMetrics([]);
    }
  }, [selectedProjectId]);

  const fetchProjects = async (preserveSelection: boolean = false) => {
    try {
      setLoading(true);
      const params: any = { limit: 100 };
      if (user?.role === UserRole.MANAGER) {
        params.assigned_manager = user._id;
      }
      const response = await projectService.getAll(params);
      setProjects(response.data);
      
      // Select first project by default if no project is currently selected and not preserving selection
      if (!preserveSelection && response.data.length > 0 && !selectedProjectId) {
        setSelectedProjectId(response.data[0]._id);
      }
    } catch (error) {
      console.error('Failed to fetch projects:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchProjectMetrics = async (projectId: string) => {
    try {
      setMetricsLoading(true);
      const response = await weeklyMetricsService.getByProject(projectId, {
        limit: 100,
        sort: 'week_start_date',
        order: 'desc'
      });
      setMetrics(response.data);
    } catch (error) {
      console.error('Failed to fetch metrics:', error);
    } finally {
      setMetricsLoading(false);
    }
  };

  const selectedProject = useMemo(() => 
    projects.find(p => p._id === selectedProjectId), 
    [projects, selectedProjectId]
  );

  // Group metrics
  const { currentWeekMetric, previousWeekMetric, totalPastMetrics, paginatedPastMetrics } = useMemo<{
    currentWeekMetric: WeeklyMetrics | null;
    previousWeekMetric: WeeklyMetrics | null;
    totalPastMetrics: number;
    paginatedPastMetrics: WeeklyMetrics[];
  }>(() => {
    let current: WeeklyMetrics | null = null;
    let previous: WeeklyMetrics | null = null;
    const past: WeeklyMetrics[] = [];

    metrics.forEach(m => {
      // Compare dates (using simple string comparison as they are ISO dates)
      // We need to be careful with timezones, but usually these are YYYY-MM-DD
      const metricStart = m.week_start_date.split('T')[0];
      const currentStart = currentWeek.start.split('T')[0];
      const previousStart = previousWeek.start.split('T')[0];

      if (metricStart === currentStart) {
        current = m;
      } else if (metricStart === previousStart) {
        previous = m;
      } else {
        past.push(m);
      }
    });

    // Paginate past metrics
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    const paginated = past.slice(startIndex, endIndex);

    return { 
      currentWeekMetric: current, 
      previousWeekMetric: previous, 
      totalPastMetrics: past.length,
      paginatedPastMetrics: paginated
    };
  }, [metrics, currentWeek, previousWeek, page, limit]);

  // Calculate Summary Cards
  const summary = useMemo(() => {
    if (!selectedProject) return null;

    const totalEffort = metrics.reduce((sum, m) => sum + (m.rollup_hours || 0), 0);
    const hourlyRate = selectedProject.hourly_rate || 0;
    const actualCost = totalEffort * hourlyRate;
    
    // Duration calculation
    const start = new Date(selectedProject.start_date);
    const end = new Date(selectedProject.end_date);
    const durationMs = end.getTime() - start.getTime();
    const durationDays = Math.ceil(durationMs / (1000 * 60 * 60 * 24));
    const durationWeeks = Math.ceil(durationDays / 7);

    return {
      scopeCompleted: selectedProject.scope_completed || 0,
      totalEffort,
      actualCost,
      duration: `${durationWeeks} Weeks (${durationDays} Days)`
    };
  }, [selectedProject, metrics]);

  // Handlers
  const handleAddEntry = (weekType: 'current' | 'previous' | 'past') => {
    if (!selectedProjectId) return;

    let week = null;
    if (weekType === 'current') week = currentWeek;
    if (weekType === 'previous') week = previousWeek;

    setDialogProps({
      prefilledProject: selectedProjectId,
      prefilledWeek: week,
      editMode: null
    });
    setIsEntryDialogOpen(true);
  };

  const handleEditEntry = (metric: WeeklyMetrics) => {
    setDialogProps({
      editMode: {
        projectId: typeof metric.project === 'object' ? metric.project._id : metric.project,
        weekStartDate: metric.week_start_date,
        weekEndDate: metric.week_end_date
      }
    });
    setIsEntryDialogOpen(true);
  };

  const handleViewBreakdown = (metric: WeeklyMetrics) => {
    if (!selectedProject) return;
    setBreakdownProps({
      projectId: selectedProject._id,
      projectName: selectedProject.project_name,
      weekStartDate: metric.week_start_date,
      weekEndDate: metric.week_end_date
    });
    setIsBreakdownDialogOpen(true);
  };

  const handleDialogSuccess = () => {
    setIsEntryDialogOpen(false);
    if (selectedProjectId) {
      fetchProjectMetrics(selectedProjectId);
      // Also refresh project details to update scope if changed, but preserve selection
      fetchProjects(true); 
    }
  };

  useEffect(() => {
    const fetchResourceCounts = async () => {
      const counts: { [key: string]: number } = {};
      
      if (currentWeekMetric && selectedProjectId) {
        try {
          const response = await weeklyEffortService.getAll({
            project: selectedProjectId,
            week_start_date: currentWeekMetric.week_start_date,
            limit: 100
          });
          counts[currentWeekMetric.week_start_date] = response.data.length;
        } catch (err) {
          console.error("Error fetching current week efforts", err);
        }
      }

      if (previousWeekMetric && selectedProjectId) {
        try {
          const response = await weeklyEffortService.getAll({
            project: selectedProjectId,
            week_start_date: previousWeekMetric.week_start_date,
            limit: 100
          });
          counts[previousWeekMetric.week_start_date] = response.data.length;
        } catch (err) {
          console.error("Error fetching previous week efforts", err);
        }
      }
      
      setResourceCounts(prev => ({ ...prev, ...counts }));
    };

    fetchResourceCounts();
  }, [currentWeekMetric, previousWeekMetric, selectedProjectId]);

  if (loading && projects.length === 0) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8 p-6 max-w-7xl mx-auto">
      {/* Header & Project Selector */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Weekly Efforts</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">Track and manage project progress</p>
        </div>
        <div className="w-full md:w-72">
          <label className="block text-sm font-bold text-black-700 dark:text-gray-300 mb-2">
            Project Name
          </label>
          <Select
            value={selectedProjectId}
            onValueChange={setSelectedProjectId}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select a Project" />
            </SelectTrigger>
            <SelectContent>
              {projects.map(p => (
                <SelectItem key={p._id} value={p._id}>{p.project_name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {selectedProject && summary ? (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6 border border-gray-100 dark:border-gray-700">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Scope Completed</h3>
                <Target className="h-5 w-5 text-blue-500" />
              </div>
              <div className="flex items-baseline">
                <span className="text-2xl font-bold text-gray-900 dark:text-white">{summary.scopeCompleted}%</span>
                <span className="ml-2 text-sm text-gray-500">of total scope</span>
              </div>
              <div className="mt-3 w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1.5">
                <div 
                  className="bg-blue-500 h-1.5 rounded-full transition-all duration-500" 
                  style={{ width: `${Math.min(summary.scopeCompleted, 100)}%` }}
                ></div>
              </div>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6 border border-gray-100 dark:border-gray-700">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Total Effort</h3>
                <Activity className="h-5 w-5 text-green-500" />
              </div>
              <div className="flex items-baseline">
                <span className="text-2xl font-bold text-gray-900 dark:text-white">{summary.totalEffort}</span>
                <span className="ml-2 text-sm text-gray-500">hours</span>
              </div>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6 border border-gray-100 dark:border-gray-700">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Actual Cost</h3>
                <DollarSign className="h-5 w-5 text-amber-500" />
              </div>
              <div className="flex items-baseline">
                <span className="text-2xl font-bold text-gray-900 dark:text-white">
                  ${summary.actualCost.toLocaleString()}
                </span>
              </div>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6 border border-gray-100 dark:border-gray-700">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Duration</h3>
                <Clock className="h-5 w-5 text-purple-500" />
              </div>
              <div className="flex items-baseline">
                <span className="text-xl font-bold text-gray-900 dark:text-white">{summary.duration}</span>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap gap-4 justify-center md:justify-start bg-gray-50 dark:bg-gray-800/50 p-4 rounded-xl border border-gray-200 dark:border-gray-700">
            {currentWeekMetric ? (
               <div className="bg-white dark:bg-gray-800 px-3 py-2 h-[52px] rounded-lg border border-gray-200 dark:border-gray-700 flex items-center gap-3 shadow-sm">
                  <div className="p-1.5 bg-blue-100 dark:bg-blue-900/30 rounded-md">
                    <Users className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">Current Week</p>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-gray-900 dark:text-white">
                        {resourceCounts[currentWeekMetric.week_start_date] || 0} Res
                      </span>
                      <span className="text-xs text-gray-300 dark:text-gray-600">•</span>
                      <span className="text-sm font-semibold text-gray-900 dark:text-white">
                        {currentWeekMetric.rollup_hours} Hrs
                      </span>
                    </div>
                  </div>
               </div>
            ) : (
              <Button 
                onClick={() => handleAddEntry('current')}
                className="bg-blue-600 hover:bg-blue-700 text-white shadow-md h-[52px]"
              >
                <Plus className="h-4 w-4 mr-2" />
                Current Week Entry
              </Button>
            )}

            {previousWeekMetric ? (
               <div className="bg-white dark:bg-gray-800 px-3 py-2 h-[52px] rounded-lg border border-gray-200 dark:border-gray-700 flex items-center gap-3 shadow-sm">
                  <div className="p-1.5 bg-purple-100 dark:bg-purple-900/30 rounded-md">
                    <Users className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">Previous Week</p>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-gray-900 dark:text-white">
                        {resourceCounts[previousWeekMetric.week_start_date] || 0} Res
                      </span>
                      <span className="text-xs text-gray-300 dark:text-gray-600">•</span>
                      <span className="text-sm font-semibold text-gray-900 dark:text-white">
                        {previousWeekMetric.rollup_hours} Hrs
                      </span>
                    </div>
                  </div>
               </div>
            ) : (
              <Button 
                variant="outline"
                onClick={() => handleAddEntry('previous')}
                className="bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 h-[52px]"
              >
                <Plus className="h-4 w-4 mr-2" />
                Previous Week Entry
              </Button>
            )}

            <Button 
              variant="outline"
              onClick={() => handleAddEntry('past')}
              className="bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200 h-[52px]"
            >
              <Calendar className="h-4 w-4 mr-2" />
              Past Weeks Entry
            </Button>
          </div>

          {/* Weekly Efforts Table */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead className="bg-gray-50 dark:bg-gray-900/50">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Week</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">End Date</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Scope %</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Highlights</th>
                    <th className="px-6 py-4 text-right text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  {metricsLoading ? (
                    <tr>
                      <td colSpan={5} className="px-6 py-12 text-center text-gray-500">
                        <div className="flex justify-center items-center">
                          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mr-2"></div>
                          Loading metrics...
                        </div>
                      </td>
                    </tr>
                  ) : metrics.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-6 py-12 text-center text-gray-500">
                        No weekly efforts recorded yet. Start by adding an entry.
                      </td>
                    </tr>
                  ) : (
                    <>
                      {/* Current Week Row */}
                      {currentWeekMetric && (
                        <tr className="bg-blue-50/50 dark:bg-blue-900/10">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                              <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200 mr-2">
                                Current
                              </span>
                              <span className="text-sm font-medium text-gray-900 dark:text-white">
                                {formatDate(currentWeekMetric.week_start_date)}
                              </span>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                            {formatDate(currentWeekMetric.week_end_date)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                              <span className="text-sm font-medium text-gray-900 dark:text-white">{currentWeekMetric.scope_completed}%</span>
                              <div className="ml-2 w-16 bg-gray-200 dark:bg-gray-700 rounded-full h-1">
                                <div 
                                  className="bg-blue-500 h-1 rounded-full" 
                                  style={{ width: `${Math.min(currentWeekMetric.scope_completed, 100)}%` }}
                                ></div>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400 max-w-xs truncate">
                            {currentWeekMetric.comments || '-'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                            <div className="flex justify-end space-x-2">
                              <Button size="sm" variant="ghost" onClick={() => handleViewBreakdown(currentWeekMetric)}>
                                <Eye className="h-4 w-4" />
                              </Button>
                              <Button size="sm" variant="ghost" onClick={() => handleEditEntry(currentWeekMetric)}>
                                <Edit2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      )}

                      {/* Previous Week Row */}
                      {previousWeekMetric && (
                        <tr className="bg-gray-50/50 dark:bg-gray-800/50">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                              <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300 mr-2">
                                Previous
                              </span>
                              <span className="text-sm font-medium text-gray-900 dark:text-white">
                                {formatDate(previousWeekMetric.week_start_date)}
                              </span>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                            {formatDate(previousWeekMetric.week_end_date)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                              <span className="text-sm font-medium text-gray-900 dark:text-white">{previousWeekMetric.scope_completed}%</span>
                              <div className="ml-2 w-16 bg-gray-200 dark:bg-gray-700 rounded-full h-1">
                                <div 
                                  className="bg-gray-500 h-1 rounded-full" 
                                  style={{ width: `${Math.min(previousWeekMetric.scope_completed, 100)}%` }}
                                ></div>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400 max-w-xs truncate">
                            {previousWeekMetric.comments || '-'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                            <div className="flex justify-end space-x-2">
                              <Button size="sm" variant="ghost" onClick={() => handleViewBreakdown(previousWeekMetric)}>
                                <Eye className="h-4 w-4" />
                              </Button>
                              <Button size="sm" variant="ghost" onClick={() => handleEditEntry(previousWeekMetric)}>
                                <Edit2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      )}

                      {/* Past Weeks Rows */}
                      {paginatedPastMetrics.map((metric) => (
                        <tr key={metric._id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className="text-sm font-medium text-gray-900 dark:text-white">
                              {formatDate(metric.week_start_date)}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                            {formatDate(metric.week_end_date)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                              <span className="text-sm font-medium text-gray-900 dark:text-white">{metric.scope_completed}%</span>
                              <div className="ml-2 w-16 bg-gray-200 dark:bg-gray-700 rounded-full h-1">
                                <div 
                                  className="bg-gray-400 h-1 rounded-full" 
                                  style={{ width: `${Math.min(metric.scope_completed, 100)}%` }}
                                ></div>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400 max-w-xs truncate">
                            {metric.comments || '-'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                            <div className="flex justify-end space-x-2">
                              <Button size="sm" variant="ghost" onClick={() => handleViewBreakdown(metric)}>
                                <Eye className="h-4 w-4" />
                              </Button>
                              <Button size="sm" variant="ghost" onClick={() => handleEditEntry(metric)}>
                                <Edit2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Pagination */}
          {totalPastMetrics > limit && (
            <Pagination
              currentPage={page}
              totalPages={Math.ceil(totalPastMetrics / limit)}
              totalItems={totalPastMetrics}
              itemsPerPage={limit}
              onPageChange={setPage}
            />
          )}
        </>
      ) : (
        <div className="text-center py-20 bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="mx-auto h-12 w-12 text-gray-400">
            <Activity className="h-12 w-12" />
          </div>
          <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">No Project Selected</h3>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Select a project from the dropdown to view weekly efforts.</p>
        </div>
      )}

      {/* Dialogs */}
      <WeeklyEffortDialog
        open={isEntryDialogOpen}
        onClose={() => setIsEntryDialogOpen(false)}
        onSuccess={handleDialogSuccess}
        {...dialogProps}
      />

      {breakdownProps && (
        <ResourceBreakdownDialog
          open={isBreakdownDialogOpen}
          onClose={() => setIsBreakdownDialogOpen(false)}
          {...breakdownProps}
        />
      )}
    </div>
  );
}
