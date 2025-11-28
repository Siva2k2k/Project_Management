import { useEffect, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '../../components/ui/Dialog';
import { Button } from '../../components/ui/Button';
import weeklyEffortService, { type WeeklyEffort } from '../../services/weeklyEffortService';
import { formatDate } from '../../lib/dateUtils';

interface ResourceBreakdownDialogProps {
  open: boolean;
  onClose: () => void;
  projectId: string;
  weekStartDate: string;
  weekEndDate: string;
  projectName: string;
}

export function ResourceBreakdownDialog({
  open,
  onClose,
  projectId,
  weekStartDate,
  weekEndDate,
  projectName,
}: ResourceBreakdownDialogProps) {
  const [loading, setLoading] = useState(false);
  const [efforts, setEfforts] = useState<WeeklyEffort[]>([]);

  useEffect(() => {
    const fetchEfforts = async () => {
      try {
        setLoading(true);
        const response = await weeklyEffortService.getAll({
          project: projectId,
          week_start_date: weekStartDate,
          limit: 100, // Fetch all for the week
        });
        setEfforts(response.data);
      } catch (error) {
        console.error('Failed to fetch resource breakdown:', error);
      } finally {
        setLoading(false);
      }
    };

    if (open && projectId && weekStartDate) {
      fetchEfforts();
    }
  }, [open, projectId, weekStartDate]);

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Resource Breakdown - {projectName}</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4 mt-4">
          <div className="flex justify-between items-center text-sm text-gray-500 dark:text-gray-400">
            <span>Week: {formatDate(weekStartDate)} - {formatDate(weekEndDate)}</span>
          </div>

          <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-900/50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Resource Name
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Email
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Hours
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {loading ? (
                  <tr>
                    <td colSpan={3} className="px-6 py-4 text-center text-sm text-gray-500">
                      Loading...
                    </td>
                  </tr>
                ) : efforts.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="px-6 py-4 text-center text-sm text-gray-500">
                      No resource efforts found for this week.
                    </td>
                  </tr>
                ) : (
                  efforts.map((effort) => (
                    <tr key={effort._id}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                        {effort.resource.resource_name}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                        {effort.resource.email}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-900 dark:text-white font-medium">
                        {effort.hours}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
              {efforts.length > 0 && (
                <tfoot className="bg-gray-50 dark:bg-gray-900/50">
                  <tr>
                    <td colSpan={2} className="px-6 py-3 text-right text-sm font-medium text-gray-900 dark:text-white">
                      Total Hours
                    </td>
                    <td className="px-6 py-3 text-right text-sm font-bold text-blue-600 dark:text-blue-400">
                      {efforts.reduce((sum, e) => sum + e.hours, 0)}
                    </td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>

          <div className="flex justify-end pt-4">
            <Button variant="outline" onClick={onClose}>
              Close
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
