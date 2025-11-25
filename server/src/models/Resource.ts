import mongoose, { Schema } from 'mongoose';
import { IResource, ResourceStatus, Currency } from '../types';

const resourceSchema = new Schema<IResource>(
  {
    resource_name: {
      type: String,
      required: [true, 'Resource name is required'],
      trim: true,
      maxlength: [100, 'Resource name cannot exceed 100 characters'],
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, 'Please enter a valid email'],
    },
    status: {
      type: String,
      enum: Object.values(ResourceStatus),
      default: ResourceStatus.ACTIVE,
    },
    per_hour_rate: {
      type: Number,
      required: [true, 'Per hour rate is required'],
      min: [0, 'Per hour rate cannot be negative'],
    },
    currency: {
      type: String,
      enum: Object.values(Currency),
      default: Currency.USD,
    },
    last_modified_date: {
      type: Date,
      default: Date.now,
    },
    last_modified_by: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    is_deleted: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

// Index for soft delete queries
resourceSchema.index({ is_deleted: 1, resource_name: 1 });

// Update last_modified_date on save
resourceSchema.pre('save', function (next) {
  this.last_modified_date = new Date();
  next();
});

// Exclude deleted resources in find queries
resourceSchema.pre('find', function (next) {
  const query = this.getQuery();
  if (query.is_deleted === undefined) {
    this.where({ is_deleted: false });
  }
  next();
});

resourceSchema.pre('findOne', function (next) {
  const query = this.getQuery();
  if (query.is_deleted === undefined) {
    this.where({ is_deleted: false });
  }
  next();
});

export const Resource = mongoose.model<IResource>('Resource', resourceSchema);
