import { useState, useEffect } from 'react';
import { Search, Eye } from 'lucide-react';
import { auditLogService } from '../../services';
import type { AuditLog } from '../../types';
import {
  Button,
  Input,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  Pagination,
} from '../../components/ui';
import { AuditLogViewDialog } from './AuditLogViewDialog.js';

export function AuditLogsList() {
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [viewDialog, setViewDialog] = useState<{ open: boolean; auditLog: AuditLog | null }>({
    open: false,
    auditLog: null,
  });

  const limit = 10;

  const fetchAuditLogs = async () => {
    try {
      setLoading(true);
      const response = await auditLogService.getAll({
        page,
        limit,
      });
      setAuditLogs(response.data);
      setTotal(response.pagination.total);
    } catch (error) {
      console.error('Failed to fetch audit logs:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAuditLogs();
  }, [page]);

  const handleView = (auditLog: AuditLog) => {
    setViewDialog({ open: true, auditLog });
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);
  };

  const getActionBadgeColor = (action: string) => {
    switch (action) {
      case 'CREATE':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'UPDATE':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
      case 'DELETE':
        return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
    }
  };

  const filteredLogs = search
    ? auditLogs.filter(
        (log) =>
          log.entity_type.toLowerCase().includes(search.toLowerCase()) ||
          log.performed_by?.name.toLowerCase().includes(search.toLowerCase()) ||
          log.action.toLowerCase().includes(search.toLowerCase())
      )
    : auditLogs;

  return (
    <div>
      <div className="mb-6 pl-16 lg:pl-0">
        <h1 className="text-3xl sm:text-3xl font-bold text-gray-900 dark:text-white">Audit Logs</h1>
        <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400 mt-1">
          Track all system modifications and changes
        </p>
      </div>

      <div className="mb-6 flex flex-col sm:flex-row items-stretch sm:items-center gap-4">
        <div className="relative flex-1 sm:max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search by entity, modifier, or action..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center items-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      ) : (
        <>
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Entity</TableHead>
                    <TableHead>Modifier</TableHead>
                    <TableHead>Modified Date</TableHead>
                    <TableHead>Action</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredLogs.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-8 text-gray-500 dark:text-gray-400">
                        No audit logs found
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredLogs.map((log) => (
                      <TableRow key={log._id}>
                        <TableCell>
                          <div>
                            <div className="font-medium text-gray-900 dark:text-white">{log.entity_type}</div>
                            <div className="text-sm text-gray-500 dark:text-gray-400 truncate max-w-xs">
                              ID: {log.entity_id}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div>
                            <div className="font-medium text-gray-900 dark:text-white">
                              {log.performed_by?.name || 'Deleted User'}
                            </div>
                            <div className="text-sm text-gray-500 dark:text-gray-400">
                              {log.performed_by?.email || 'N/A'}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="text-gray-900 dark:text-white">{formatDate(log.timestamp)}</TableCell>
                        <TableCell>
                          <span
                            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getActionBadgeColor(
                              log.action
                            )}`}
                          >
                            {log.action}
                          </span>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleView(log)}
                            className="h-8 w-8 p-0"
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </div>

          {total > limit && (
            <div className="mt-6 flex justify-center">
              <Pagination
                currentPage={page}
                totalPages={Math.ceil(total / limit)}
                totalItems={total}
                itemsPerPage={limit}
                onPageChange={setPage}
              />
            </div>
          )}
        </>
      )}

      {viewDialog.open && viewDialog.auditLog && (
        <AuditLogViewDialog
          auditLog={viewDialog.auditLog}
          open={viewDialog.open}
          onClose={() => setViewDialog({ open: false, auditLog: null })}
        />
      )}
    </div>
  );
}
