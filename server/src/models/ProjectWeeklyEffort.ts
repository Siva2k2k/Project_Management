import mongoose, { Schema } from 'mongoose';
import { IProjectWeeklyEffort } from '../types';

const projectWeeklyEffortSchema = new Schema<IProjectWeeklyEffort>(
  {
    project: {
      type: Schema.Types.ObjectId,
      ref: 'Project',
      required: [true, 'Project is required'],
    },
    resource: {
      type: Schema.Types.ObjectId,
      ref: 'Resource',
      required: [true, 'Resource is required'],
    },
    hours: {
      type: Number,
      required: [true, 'Hours is required'],
      min: [0, 'Hours cannot be negative'],
      max: [168, 'Hours cannot exceed 168 (hours in a week)'],
    },
    week_start_date: {
      type: Date,
      required: [true, 'Week start date is required'],
    },
    week_end_date: {
      type: Date,
      required: [true, 'Week end date is required'],
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
projectWeeklyEffortSchema.index({ project: 1, week_start_date: 1 });
projectWeeklyEffortSchema.index({ resource: 1, week_start_date: 1 });
projectWeeklyEffortSchema.index({ project: 1, resource: 1, week_start_date: 1 }, { unique: true });

// Update last_modified_date on save
projectWeeklyEffortSchema.pre('save', function (next) {
  this.last_modified_date = new Date();
  next();
});

export const ProjectWeeklyEffort = mongoose.model<IProjectWeeklyEffort>(
  'ProjectWeeklyEffort',
  projectWeeklyEffortSchema
);
