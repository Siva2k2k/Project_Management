import { useEffect, useState } from 'react';
import { Plus, ChevronRight, ChevronDown } from 'lucide-react';
import weeklyEffortService from '../../services/weeklyEffortService';
import projectService from '../../services/projectService';
import type { Project } from '../../services/projectService';
import { Button } from '../../components/ui/Button';
import { WeeklyEffortDialog } from './WeeklyEffortDialog';

interface ProjectWeekData {
  project: Project;
  currentWeekData: any[];
  previousWeekData: any[];
  hasCurrentWeekData: boolean;
  hasPreviousWeekData: boolean;
}

export function WeeklyEffortsList() {
  const [projectsData, setProjectsData] = useState<ProjectWeekData[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedProjects, setExpandedProjects] = useState<Set<string>>(new Set());
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [selectedWeek, setSelectedWeek] = useState<{ start: string; end: string } | null>(null);
  const [editMode, setEditMode] = useState<{ projectId: string; weekStartDate: string; weekEndDate: string } | null>(null);
  const [currentWeekStart, setCurrentWeekStart] = useState('');
  const [currentWeekEnd, setCurrentWeekEnd] = useState('');
  const [previousWeekStart, setPreviousWeekStart] = useState('');
  const [previousWeekEnd, setPreviousWeekEnd] = useState('');

  useEffect(() => {
    calculateWeeks();
  }, []);

  useEffect(() => {
    if (currentWeekStart) {
      fetchProjectsData();
    }
  }, [currentWeekStart]);

  const calculateWeeks = () => {
    const now = new Date();
    const dayOfWeek = now.getDay();

    // Current week (Sunday to Saturday)
    const currentStart = new Date(now);
    currentStart.setDate(now.getDate() - dayOfWeek);
    currentStart.setHours(0, 0, 0, 0);

    const currentEnd = new Date(currentStart);
    currentEnd.setDate(currentStart.getDate() + 6);
    currentEnd.setHours(23, 59, 59, 999);

    // Previous week
    const previousStart = new Date(currentStart);
    previousStart.setDate(currentStart.getDate() - 7);

    const previousEnd = new Date(previousStart);
    previousEnd.setDate(previousStart.getDate() + 6);
    previousEnd.setHours(23, 59, 59, 999);

    setCurrentWeekStart(currentStart.toISOString().split('T')[0]);
    setCurrentWeekEnd(currentEnd.toISOString().split('T')[0]);
    setPreviousWeekStart(previousStart.toISOString().split('T')[0]);
    setPreviousWeekEnd(previousEnd.toISOString().split('T')[0]);
  };

  const fetchProjectsData = async () => {
    try {
      setLoading(true);

      // Fetch all active projects
      const projectsResponse = await projectService.getAll({ limit: 100 });
      const projects = projectsResponse.data;
      console.log('Fetched projects:', projects.length);

      // Fetch weekly efforts for current and previous weeks
      const currentWeekEfforts = await weeklyEffortService.getAll({
        week_start_date: currentWeekStart,
        limit: 1000,
      });
      console.log('Current week efforts:', currentWeekEfforts.data.length, currentWeekEfforts.data);

      const previousWeekEfforts = await weeklyEffortService.getAll({
        week_start_date: previousWeekStart,
        limit: 1000,
      });
      console.log('Previous week efforts:', previousWeekEfforts.data.length, previousWeekEfforts.data);

      // Organize data by project
      const projectsData: ProjectWeekData[] = projects.map((project) => {
        const currentWeekData = currentWeekEfforts.data.filter((e: any) => {
          const projectId = typeof e.project === 'object' ? e.project._id : e.project;
          return projectId === project._id || projectId.toString() === project._id.toString();
        });
        const previousWeekData = previousWeekEfforts.data.filter((e: any) => {
          const projectId = typeof e.project === 'object' ? e.project._id : e.project;
          return projectId === project._id || projectId.toString() === project._id.toString();
        });

        return {
          project,
          currentWeekData,
          previousWeekData,
          hasCurrentWeekData: currentWeekData.length > 0,
          hasPreviousWeekData: previousWeekData.length > 0,
        };
      });

      console.log('Processed projects data:', projectsData);
      setProjectsData(projectsData);
    } catch (error) {
      console.error('Failed to fetch projects data:', error);
      alert('Failed to fetch weekly efforts data. Check console for details.');
    } finally {
      setLoading(false);
    }
  };

  const handleAddWeeklyEffort = (project: Project, weekStart: string, weekEnd: string) => {
    setSelectedProject(project);
    setSelectedWeek({ start: weekStart, end: weekEnd });
    setEditMode(null);
    setIsDialogOpen(true);
  };

  const handleEditWeeklyEffort = (projectId: string, weekStart: string, weekEnd: string) => {
    setEditMode({
      projectId,
      weekStartDate: weekStart,
      weekEndDate: weekEnd,
    });
    setSelectedProject(null);
    setSelectedWeek(null);
    setIsDialogOpen(true);
  };

  const toggleProject = (projectId: string) => {
    const newExpanded = new Set(expandedProjects);
    if (newExpanded.has(projectId)) {
      newExpanded.delete(projectId);
    } else {
      newExpanded.add(projectId);
    }
    setExpandedProjects(newExpanded);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const formatWeekRange = (start: string, end: string) => {
    return `${formatDate(start)} - ${formatDate(end)}`;
  };

  const getTotalHours = (weekData: any[]) => {
    return weekData.reduce((sum, entry) => sum + entry.hours, 0);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Weekly Efforts</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Track weekly progress for all projects
          </p>
        </div>
      </div>

      {/* Week Info */}
      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <p className="text-sm font-medium text-blue-900 dark:text-blue-300">Current Week</p>
            <p className="text-lg font-semibold text-blue-700 dark:text-blue-400">
              {currentWeekStart && formatWeekRange(currentWeekStart, currentWeekEnd)}
            </p>
          </div>
          <div>
            <p className="text-sm font-medium text-blue-900 dark:text-blue-300">Previous Week</p>
            <p className="text-lg font-semibold text-blue-700 dark:text-blue-400">
              {previousWeekStart && formatWeekRange(previousWeekStart, previousWeekEnd)}
            </p>
          </div>
        </div>
      </div>

      {/* Projects List */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        ) : projectsData.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-500 dark:text-gray-400">No projects found</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-200 dark:divide-gray-700">
            {projectsData.map((data) => {
              const isExpanded = expandedProjects.has(data.project._id);

              return (
                <div key={data.project._id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                  {/* Project Header Row */}
                  <div className="px-6 py-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3 flex-1">
                        <button
                          onClick={() => toggleProject(data.project._id)}
                          className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                        >
                          {isExpanded ? (
                            <ChevronDown className="w-5 h-5" />
                          ) : (
                            <ChevronRight className="w-5 h-5" />
                          )}
                        </button>
                        <div className="flex-1">
                          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                            {data.project.project_name}
                          </h3>
                          <p className="text-sm text-gray-500 dark:text-gray-400">
                            {data.project.customer.customer_name}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center space-x-6">
                        {/* Current Week Status */}
                        <div className="text-center min-w-[200px]">
                          <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                            Current Week
                          </p>
                          {data.hasCurrentWeekData ? (
                            <button
                              onClick={() => handleEditWeeklyEffort(data.project._id, currentWeekStart, currentWeekEnd)}
                              className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400 hover:bg-green-200 dark:hover:bg-green-900/30 transition-colors cursor-pointer"
                              title="Click to edit"
                            >
                              {data.currentWeekData.length} entries • {getTotalHours(data.currentWeekData)} hrs
                            </button>
                          ) : (
                            <Button
                              size="sm"
                              onClick={() => handleAddWeeklyEffort(data.project, currentWeekStart, currentWeekEnd)}
                            >
                              <Plus className="w-4 h-4 mr-1" />
                              Add Entry
                            </Button>
                          )}
                        </div>

                        {/* Previous Week Status */}
                        <div className="text-center min-w-[200px]">
                          <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                            Previous Week
                          </p>
                          {data.hasPreviousWeekData ? (
                            <button
                              onClick={() => handleEditWeeklyEffort(data.project._id, previousWeekStart, previousWeekEnd)}
                              className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors cursor-pointer"
                              title="Click to edit"
                            >
                              {data.previousWeekData.length} entries • {getTotalHours(data.previousWeekData)} hrs
                            </button>
                          ) : (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleAddWeeklyEffort(data.project, previousWeekStart, previousWeekEnd)}
                            >
                              <Plus className="w-4 h-4 mr-1" />
                              Add Entry
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Expanded Details */}
                  {isExpanded && (
                    <div className="px-6 pb-4 bg-gray-50 dark:bg-gray-800/50">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Current Week Details */}
                        <div>
                          <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
                            Current Week Details
                          </h4>
                          {data.currentWeekData.length > 0 ? (
                            <div className="space-y-2">
                              {data.currentWeekData.map((entry: any) => (
                                <div
                                  key={entry._id}
                                  className="bg-white dark:bg-gray-800 rounded-lg p-3 border border-gray-200 dark:border-gray-700"
                                >
                                  <div className="flex items-center justify-between">
                                    <span className="font-medium text-gray-900 dark:text-white">
                                      {typeof entry.resource === 'object' ? entry.resource.resource_name : 'Unknown Resource'}
                                    </span>
                                    <span className="text-sm font-semibold text-blue-600 dark:text-blue-400">
                                      {entry.hours} hours
                                    </span>
                                  </div>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <p className="text-sm text-gray-500 dark:text-gray-400 italic">
                              No entries for this week
                            </p>
                          )}
                        </div>

                        {/* Previous Week Details */}
                        <div>
                          <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
                            Previous Week Details
                          </h4>
                          {data.previousWeekData.length > 0 ? (
                            <div className="space-y-2">
                              {data.previousWeekData.map((entry: any) => (
                                <div
                                  key={entry._id}
                                  className="bg-white dark:bg-gray-800 rounded-lg p-3 border border-gray-200 dark:border-gray-700"
                                >
                                  <div className="flex items-center justify-between">
                                    <span className="font-medium text-gray-900 dark:text-white">
                                      {typeof entry.resource === 'object' ? entry.resource.resource_name : 'Unknown Resource'}
                                    </span>
                                    <span className="text-sm font-semibold text-blue-600 dark:text-blue-400">
                                      {entry.hours} hours
                                    </span>
                                  </div>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <p className="text-sm text-gray-500 dark:text-gray-400 italic">
                              No entries for this week
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Create/Edit Dialog */}
      <WeeklyEffortDialog
        open={isDialogOpen}
        onClose={() => {
          setIsDialogOpen(false);
          setSelectedProject(null);
          setSelectedWeek(null);
          setEditMode(null);
        }}
        onSuccess={() => {
          setIsDialogOpen(false);
          setSelectedProject(null);
          setSelectedWeek(null);
          setEditMode(null);
          fetchProjectsData();
        }}
        prefilledProject={selectedProject?._id}
        prefilledWeek={selectedWeek}
        editMode={editMode}
      />
    </div>
  );
}
