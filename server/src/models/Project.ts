import mongoose, { Schema } from 'mongoose';
import { IProject, IMilestone, ProjectType, RAGStatus, ProjectTrackingBy, ProjectStatus, HourlyRateSource } from '../types';

const milestoneSchema = new Schema<IMilestone>(
  {
    description: {
      type: String,
      required: [true, 'Milestone description is required'],
      trim: true,
    },
    estimated_date: {
      type: Date,
      required: [true, 'Estimated date is required'],
    },
    estimated_effort: {
      type: Number,
      required: [true, 'Estimated effort is required'],
      min: [0, 'Estimated effort cannot be negative'],
    },
    scope_completed: {
      type: Number,
      default: 0,
    },
    completed_date: {
      type: Date,
    },
  },
  { _id: true }
);

const projectSchema = new Schema<IProject>(
  {
    project_name: {
      type: String,
      required: [true, 'Project name is required'],
      trim: true,
      maxlength: [200, 'Project name cannot exceed 200 characters'],
    },
    start_date: {
      type: Date,
      required: [true, 'Start date is required'],
    },
    end_date: {
      type: Date,
      required: [true, 'End date is required'],
    },
    project_type: {
      type: String,
      enum: Object.values(ProjectType),
      required: [true, 'Project type is required'],
    },
    estimated_effort: {
      type: Number,
      required: [true, 'Estimated effort is required'],
      min: [0, 'Estimated effort cannot be negative'],
    },
    estimated_budget: {
      type: Number,
      required: [true, 'Estimated budget is required'],
      min: [0, 'Estimated budget cannot be negative'],
    },
    estimated_resources: {
      type: Number,
      required: [true, 'Estimated resources is required'],
      min: [0, 'Estimated resources cannot be negative'],
    },
    scope_completed: {
      type: Number,
      default: 0,
    },
    milestones: [milestoneSchema],
    overall_status: {
      type: String,
      enum: Object.values(RAGStatus),
      default: RAGStatus.GREEN,
    },
    assigned_manager: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Assigned manager is required'],
    },
    // Resources assigned to this project
    resources: [
      {
        type: Schema.Types.ObjectId,
        ref: 'Resource',
      },
    ],
    tracking_by: {
      type: String,
      enum: Object.values(ProjectTrackingBy),
      default: ProjectTrackingBy.ENDDATE,
    },
    scope_status: {
      type: String,
      enum: Object.values(RAGStatus),
      default: RAGStatus.GREEN,
    },
    quality_status: {
      type: String,
      enum: Object.values(RAGStatus),
      default: RAGStatus.GREEN,
    },
    budget_status: {
      type: String,
      enum: Object.values(RAGStatus),
      default: RAGStatus.GREEN,
    },
    customer: {
      type: Schema.Types.ObjectId,
      ref: 'Customer',
      required: [true, 'Customer is required'],
    },
    project_status: {
      type: String,
      enum: Object.values(ProjectStatus),
      default: ProjectStatus.ACTIVE,
    },
    hourly_rate: {
      type: Number,
      min: [0, 'Hourly rate cannot be negative'],
    },
    hourly_rate_source: {
      type: String,
      enum: Object.values(HourlyRateSource),
      default: HourlyRateSource.RESOURCE,
    },
    estimation: {
      type: String,
      trim: true,
    },
    scope_estimation: {
      type: String,
      trim: true,
    },
    is_deleted: {
      type: Boolean,
      default: false,
    },
    last_modified_date: {
      type: Date,
      default: Date.now,
    },
    last_modified_by: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
  },
  {
    timestamps: true,
  }
);

// Indexes
projectSchema.index({ is_deleted: 1, project_name: 1 });
projectSchema.index({ assigned_manager: 1, is_deleted: 1 });
projectSchema.index({ customer: 1, is_deleted: 1 });
projectSchema.index({ overall_status: 1 });

// Validate end_date is after start_date
projectSchema.pre('save', function (next) {
  if (this.end_date <= this.start_date) {
    const error = new Error('End date must be after start date');
    return next(error);
  }
  this.last_modified_date = new Date();
  next();
});

// Exclude deleted projects in find queries
projectSchema.pre('find', function (next) {
  const query = this.getQuery();
  if (query.is_deleted === undefined) {
    this.where({ is_deleted: false });
  }
  next();
});

projectSchema.pre('findOne', function (next) {
  const query = this.getQuery();
  if (query.is_deleted === undefined) {
    this.where({ is_deleted: false });
  }
  next();
});

export const Project = mongoose.model<IProject>('Project', projectSchema);
