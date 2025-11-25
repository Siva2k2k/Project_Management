import mongoose, { Schema } from 'mongoose';
import { IAuditLog, AuditAction } from '../types';

const auditLogSchema = new Schema<IAuditLog>(
  {
    entity_type: {
      type: String,
      required: [true, 'Entity type is required'],
      trim: true,
    },
    entity_id: {
      type: Schema.Types.ObjectId,
      required: [true, 'Entity ID is required'],
    },
    action: {
      type: String,
      enum: Object.values(AuditAction),
      required: [true, 'Action is required'],
    },
    previous_data: {
      type: Schema.Types.Mixed,
    },
    new_data: {
      type: Schema.Types.Mixed,
    },
    performed_by: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Performed by is required'],
    },
    timestamp: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: false,
  }
);

// Indexes for efficient querying
auditLogSchema.index({ entity_type: 1, entity_id: 1 });
auditLogSchema.index({ performed_by: 1, timestamp: -1 });
auditLogSchema.index({ timestamp: -1 });

export const AuditLog = mongoose.model<IAuditLog>('AuditLog', auditLogSchema);
