import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../../components/ui';
import type { AuditLog } from '../../types';

interface AuditLogViewDialogProps {
  auditLog: AuditLog;
  open: boolean;
  onClose: () => void;
}

export function AuditLogViewDialog({ auditLog, open, onClose }: AuditLogViewDialogProps) {
  const formatDate = (dateString: string) => {
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    }).format(new Date(dateString));
  };

  const renderValue = (value: any): string => {
    if (value === null || value === undefined) {
      return 'null';
    }
    if (typeof value === 'object') {
      return JSON.stringify(value, null, 2);
    }
    return String(value);
  };

  const getChangedFields = () => {
    const fields = new Set<string>();

    if (auditLog.previous_data) {
      Object.keys(auditLog.previous_data).forEach((key) => fields.add(key));
    }

    if (auditLog.new_data) {
      Object.keys(auditLog.new_data).forEach((key) => fields.add(key));
    }

    return Array.from(fields).sort();
  };

  const hasChanges = auditLog.action === 'UPDATE' && auditLog.previous_data && auditLog.new_data;

  const renderDiffView = () => {
    if (auditLog.action === 'CREATE' && auditLog.new_data) {
      return (
        <div className="space-y-4">
          <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
            <h3 className="text-sm font-semibold text-green-800 dark:text-green-200 mb-3">Created Data</h3>
            <div className="space-y-2">
              {Object.entries(auditLog.new_data).map(([key, value]) => (
                <div key={key} className="flex flex-col space-y-1">
                  <span className="text-xs font-medium text-gray-600 dark:text-gray-400">{key}</span>
                  <div className="bg-white dark:bg-gray-800 rounded p-2 border border-green-300 dark:border-green-700">
                    <pre className="text-sm text-gray-900 dark:text-gray-100 whitespace-pre-wrap break-words">
                      {renderValue(value)}
                    </pre>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      );
    }

    if (auditLog.action === 'DELETE' && auditLog.previous_data) {
      return (
        <div className="space-y-4">
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
            <h3 className="text-sm font-semibold text-red-800 dark:text-red-200 mb-3">Deleted Data</h3>
            <div className="space-y-2">
              {Object.entries(auditLog.previous_data).map(([key, value]) => (
                <div key={key} className="flex flex-col space-y-1">
                  <span className="text-xs font-medium text-gray-600 dark:text-gray-400">{key}</span>
                  <div className="bg-white dark:bg-gray-800 rounded p-2 border border-red-300 dark:border-red-700">
                    <pre className="text-sm text-gray-900 dark:text-gray-100 whitespace-pre-wrap break-words">
                      {renderValue(value)}
                    </pre>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      );
    }

    if (hasChanges) {
      const changedFields = getChangedFields();
      const fieldsWithChanges = changedFields.filter((field) => {
        const oldVal = auditLog.previous_data?.[field];
        const newVal = auditLog.new_data?.[field];
        return JSON.stringify(oldVal) !== JSON.stringify(newVal);
      });

      return (
        <div className="space-y-4">
          {fieldsWithChanges.length === 0 ? (
            <div className="text-center py-8 text-gray-500 dark:text-gray-400">
              No field changes detected
            </div>
          ) : (
            fieldsWithChanges.map((field) => {
              const oldValue = auditLog.previous_data?.[field];
              const newValue = auditLog.new_data?.[field];
              const hasChanged = JSON.stringify(oldValue) !== JSON.stringify(newValue);

              return (
                <div key={field} className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
                  <div className="bg-gray-100 dark:bg-gray-800 px-4 py-2 border-b border-gray-200 dark:border-gray-700">
                    <span className="text-sm font-semibold text-gray-900 dark:text-white">{field}</span>
                  </div>
                  <div className="grid grid-cols-2 divide-x divide-gray-200 dark:divide-gray-700">
                    {/* Previous Value */}
                    <div className="p-4 bg-red-50/50 dark:bg-red-900/10">
                      <div className="flex items-center gap-2 mb-2">
                        <div className="w-2 h-2 rounded-full bg-red-500"></div>
                        <span className="text-xs font-medium text-red-700 dark:text-red-400">Previous</span>
                      </div>
                      <div className={`bg-white dark:bg-gray-800 rounded p-3 border ${
                        hasChanged 
                          ? 'border-red-300 dark:border-red-700' 
                          : 'border-gray-200 dark:border-gray-700'
                      }`}>
                        <pre className={`text-sm whitespace-pre-wrap break-words ${
                          hasChanged 
                            ? 'text-red-800 dark:text-red-200' 
                            : 'text-gray-700 dark:text-gray-300'
                        }`}>
                          {renderValue(oldValue)}
                        </pre>
                      </div>
                    </div>

                    {/* New Value */}
                    <div className="p-4 bg-green-50/50 dark:bg-green-900/10">
                      <div className="flex items-center gap-2 mb-2">
                        <div className="w-2 h-2 rounded-full bg-green-500"></div>
                        <span className="text-xs font-medium text-green-700 dark:text-green-400">Current</span>
                      </div>
                      <div className={`bg-white dark:bg-gray-800 rounded p-3 border ${
                        hasChanged 
                          ? 'border-green-300 dark:border-green-700' 
                          : 'border-gray-200 dark:border-gray-700'
                      }`}>
                        <pre className={`text-sm whitespace-pre-wrap break-words ${
                          hasChanged 
                            ? 'text-green-800 dark:text-green-200' 
                            : 'text-gray-700 dark:text-gray-300'
                        }`}>
                          {renderValue(newValue)}
                        </pre>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      );
    }

    return (
      <div className="text-center py-8 text-gray-500 dark:text-gray-400">
        No data available to display
      </div>
    );
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Audit Log Details</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Audit Log Metadata */}
          <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-4 space-y-3">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <span className="text-xs font-medium text-gray-500 dark:text-gray-400">Entity Type</span>
                <p className="text-sm font-semibold text-gray-900 dark:text-white mt-1">{auditLog.entity_type}</p>
              </div>
              <div>
                <span className="text-xs font-medium text-gray-500 dark:text-gray-400">Action</span>
                <p className="text-sm font-semibold text-gray-900 dark:text-white mt-1">
                  <span
                    className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      auditLog.action === 'CREATE'
                        ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                        : auditLog.action === 'UPDATE'
                        ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
                        : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                    }`}
                  >
                    {auditLog.action}
                  </span>
                </p>
              </div>
              <div>
                <span className="text-xs font-medium text-gray-500 dark:text-gray-400">Modified By</span>
                <p className="text-sm font-semibold text-gray-900 dark:text-white mt-1">
                  {auditLog.performed_by?.name || 'Deleted User'}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {auditLog.performed_by?.email || 'N/A'}
                </p>
              </div>
              <div>
                <span className="text-xs font-medium text-gray-500 dark:text-gray-400">Modified Date</span>
                <p className="text-sm font-semibold text-gray-900 dark:text-white mt-1">
                  {formatDate(auditLog.timestamp)}
                </p>
              </div>
            </div>
            <div>
              <span className="text-xs font-medium text-gray-500 dark:text-gray-400">Entity</span>
              <p className="text-sm font-semibold text-gray-900 dark:text-white mt-1">
                {auditLog.entity_name || 'Deleted Entity'}
              </p>
              <p className="text-xs font-mono text-gray-500 dark:text-gray-400 mt-1 break-all">
                ID: {auditLog.entity_id}
              </p>
            </div>
          </div>

          {/* Diff View */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Changes</h3>
            {renderDiffView()}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
