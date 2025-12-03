import api from './api';
import type { AuditLogResponse, AuditLogFilters, AuditLog } from '../types';

export const auditLogService = {
  getAll: async (filters?: AuditLogFilters): Promise<AuditLogResponse> => {
    const response = await api.get<AuditLogResponse>('/audit-logs', {
      params: filters,
    });
    return response.data;
  },

  getById: async (id: string): Promise<AuditLog> => {
    const response = await api.get<{ data: AuditLog }>(`/audit-logs/${id}`);
    return response.data.data;
  },
};
