export interface AuditLog {
  _id: string;
  entity_type: string;
  entity_id: string;
  entity_name?: string | null;
  action: 'CREATE' | 'UPDATE' | 'DELETE';
  previous_data?: Record<string, any>;
  new_data?: Record<string, any>;
  performed_by: {
    _id: string;
    name: string;
    email: string;
  } | null;
  timestamp: string;
}

export interface AuditLogFilters {
  page?: number;
  limit?: number;
  entity_type?: string;
  entity_id?: string;
  action?: string;
  user_id?: string;
  start_date?: string;
  end_date?: string;
}

export interface AuditLogPagination {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface AuditLogResponse {
  data: AuditLog[];
  pagination: AuditLogPagination;
}
