import mongoose, { Schema } from 'mongoose';
import { IProjectWeeklyMetrics } from '../types';

const projectWeeklyMetricsSchema = new Schema<IProjectWeeklyMetrics>(
  {
    project: {
      type: Schema.Types.ObjectId,
      ref: 'Project',
      required: [true, 'Project is required'],
    },
    week_start_date: {
      type: Date,
      required: [true, 'Week start date is required'],
    },
    week_end_date: {
      type: Date,
      required: [true, 'Week end date is required'],
    },
    rollup_hours: {
      type: Number,
      required: [true, 'Rollup hours is required'],
      min: [0, 'Rollup hours cannot be negative'],
    },
    scope_completed: {
      type: Number,
      required: [true, 'Scope completed is required'],
    },
    comments: {
      type: String,
      trim: true,
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

// Indexes for efficient querying
projectWeeklyMetricsSchema.index({ project: 1, week_start_date: 1 }, { unique: true });
projectWeeklyMetricsSchema.index({ week_start_date: 1 });

// Update last_modified_date on save
projectWeeklyMetricsSchema.pre('save', function (next) {
  this.last_modified_date = new Date();
  next();
});

export const ProjectWeeklyMetrics = mongoose.model<IProjectWeeklyMetrics>(
  'ProjectWeeklyMetrics',
  projectWeeklyMetricsSchema
);
