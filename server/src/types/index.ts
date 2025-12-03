import { Document, Types } from 'mongoose';

export enum UserRole {
  MANAGER = 'Manager',
  ADMIN = 'Admin',
  CEO = 'CEO',
}

export enum ResourceStatus {
  ACTIVE = 'Active',
  INACTIVE = 'Inactive',
}

export enum ProjectType {
  FIXED_PRICE = 'FP',
  TIME_MATERIAL = 'TM',
}

export enum RAGStatus {
  RED = 'Red',
  AMBER = 'Amber',
  GREEN = 'Green',
}

export enum Currency {
  USD = 'USD',
  INR = 'INR',
  EUR = 'EUR',
  GBP = 'GBP',
}

export enum AuditAction {
  CREATE = 'CREATE',
  UPDATE = 'UPDATE',
  DELETE = 'DELETE',
}

export enum ProjectTrackingBy {
  ENDDATE = 'EndDate',
  MILESTONE = 'Milestone',
}

export enum ProjectStatus {
  ACTIVE = 'Active',
  COMPLETED = 'Completed',
  DEFERRED = 'Deferred',
}

export enum HourlyRateSource {
  RESOURCE = 'Resource',
  PROJECT = 'Project',
  ORGANIZATION = 'Organization',
}

export interface IRefreshToken {
  token: string;
  expires: Date;
  createdAt: Date;
}

export interface IUser extends Document {
  _id: Types.ObjectId;
  name: string;
  email: string;
  password: string;
  role: UserRole;
  avatar?: string;
  is_active: boolean;
  email_verified: boolean;
  verification_token?: string;
  verification_token_expires?: Date;
  password_reset_token?: string;
  password_reset_expires?: Date;
  refresh_token?: IRefreshToken;
  last_modified_date: Date;
  last_modified_by?: Types.ObjectId;
  is_deleted: boolean;
  comparePassword(candidatePassword: string): Promise<boolean>;
}

export interface ICustomer extends Document {
  _id: Types.ObjectId;
  customer_name: string;
  email: string;
  contact_info?: string;
  created_by: Types.ObjectId;
  is_deleted: boolean;
  last_modified_date: Date;
  last_modified_by?: Types.ObjectId;
}

export interface IResource extends Document {
  _id: Types.ObjectId;
  resource_name: string;
  email: string;
  status: ResourceStatus;
  per_hour_rate: number;
  currency: Currency;
  last_modified_date: Date;
  last_modified_by?: Types.ObjectId;
  is_deleted: boolean;
}

export interface IMilestone {
  _id?: Types.ObjectId;
  description: string;
  estimated_date: Date;
  estimated_effort: number;
  scope_completed: number;
  completed_date?: Date;
}

export interface IProject extends Document {
  _id: Types.ObjectId;
  project_name: string;
  start_date: Date;
  end_date: Date;
  project_type: ProjectType;
  estimated_effort: number;
  estimated_budget: number;
  estimated_resources: number;
  scope_completed: number;
  milestones: IMilestone[];
  overall_status: RAGStatus;
  assigned_manager: Types.ObjectId;
  tracking_by?: ProjectTrackingBy;
  scope_status: RAGStatus;
  quality_status: RAGStatus;
  budget_status: RAGStatus;
  customer: Types.ObjectId;
  project_status: ProjectStatus;
  hourly_rate?: number;
  hourly_rate_source: HourlyRateSource;
  estimation?: string;
  scope_estimation?: string;
  // Resources assigned to the project
  resources?: Types.ObjectId[];
  is_deleted: boolean;
  last_modified_date: Date;
  last_modified_by?: Types.ObjectId;
}

export interface IProjectWeeklyEffort extends Document {
  _id: Types.ObjectId;
  project: Types.ObjectId;
  resource: Types.ObjectId;
  hours: number;
  week_start_date: Date;
  week_end_date: Date;
  last_modified_date: Date;
  last_modified_by?: Types.ObjectId;
}

export interface IProjectWeeklyMetrics extends Document {
  _id: Types.ObjectId;
  project: Types.ObjectId;
  week_start_date: Date;
  week_end_date: Date;
  rollup_hours: number;
  scope_completed: number;
  comments?: string;
  last_modified_date: Date;
  last_modified_by?: Types.ObjectId;
}

export interface IAuditLog extends Document {
  _id: Types.ObjectId;
  entity_type: string;
  entity_id: Types.ObjectId;
  action: AuditAction;
  previous_data?: Record<string, unknown>;
  new_data?: Record<string, unknown>;
  performed_by: Types.ObjectId;
  timestamp: Date;
}

// Request types
export interface PaginationQuery {
  page?: number;
  limit?: number;
  sort?: string;
  order?: 'asc' | 'desc';
}

export interface AuthenticatedRequest {
  user?: IUser;
}
