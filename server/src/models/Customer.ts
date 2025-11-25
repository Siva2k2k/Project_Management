import mongoose, { Schema } from 'mongoose';
import { ICustomer } from '../types';

const customerSchema = new Schema<ICustomer>(
  {
    customer_name: {
      type: String,
      required: [true, 'Customer name is required'],
      trim: true,
      maxlength: [200, 'Customer name cannot exceed 200 characters'],
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, 'Please enter a valid email'],
    },
    contact_info: {
      type: String,
      trim: true,
      maxlength: [500, 'Contact info cannot exceed 500 characters'],
    },
    created_by: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
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

// Index for soft delete queries
customerSchema.index({ is_deleted: 1, customer_name: 1 });

// Update last_modified_date on save
customerSchema.pre('save', function (next) {
  this.last_modified_date = new Date();
  next();
});

// Exclude deleted customers in find queries
customerSchema.pre('find', function (next) {
  const query = this.getQuery();
  if (query.is_deleted === undefined) {
    this.where({ is_deleted: false });
  }
  next();
});

customerSchema.pre('findOne', function (next) {
  const query = this.getQuery();
  if (query.is_deleted === undefined) {
    this.where({ is_deleted: false });
  }
  next();
});

export const Customer = mongoose.model<ICustomer>('Customer', customerSchema);
