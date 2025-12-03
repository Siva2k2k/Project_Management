import { Types } from 'mongoose';
import { AuditLog } from '../models';
import { IAuditLog, AuditAction, PaginationQuery } from '../types';
import { BaseRepository, PaginatedResult } from './BaseRepository';

export class AuditLogRepository extends BaseRepository<IAuditLog> {
  constructor() {
    super(AuditLog);
  }

  async createLog(
    entityType: string,
    entityId: string | Types.ObjectId,
    action: AuditAction,
    performedBy: string | Types.ObjectId,
    previousData?: Record<string, unknown>,
    newData?: Record<string, unknown>
  ): Promise<IAuditLog> {
    return this.create({
      entity_type: entityType,
      entity_id: new Types.ObjectId(entityId.toString()),
      action,
      performed_by: new Types.ObjectId(performedBy.toString()),
      previous_data: previousData,
      new_data: newData,
      timestamp: new Date(),
    } as Partial<IAuditLog>);
  }

  async findByEntity(
    entityType: string,
    entityId: string | Types.ObjectId,
    pagination: PaginationQuery = {}
  ): Promise<PaginatedResult<IAuditLog>> {
    const { page = 1, limit = 10 } = pagination;
    const skip = (page - 1) * limit;

    const filter = {
      entity_type: entityType,
      entity_id: new Types.ObjectId(entityId.toString()),
    };

    const [data, total] = await Promise.all([
      this.model
        .find(filter)
        .populate('performed_by', 'name email')
        .sort({ timestamp: -1 })
        .skip(skip)
        .limit(limit),
      this.model.countDocuments(filter),
    ]);

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findByUser(
    userId: string | Types.ObjectId,
    pagination: PaginationQuery = {}
  ): Promise<PaginatedResult<IAuditLog>> {
    const { page = 1, limit = 10 } = pagination;
    const skip = (page - 1) * limit;

    const filter = { performed_by: new Types.ObjectId(userId.toString()) };

    const [data, total] = await Promise.all([
      this.model
        .find(filter)
        .sort({ timestamp: -1 })
        .skip(skip)
        .limit(limit),
      this.model.countDocuments(filter),
    ]);

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findByAction(
    action: AuditAction,
    pagination: PaginationQuery = {}
  ): Promise<PaginatedResult<IAuditLog>> {
    const { page = 1, limit = 10 } = pagination;
    const skip = (page - 1) * limit;

    const [rawData, total] = await Promise.all([
      this.model
        .find({ action })
        .populate('performed_by', 'name email')
        .sort({ timestamp: -1 })
        .skip(skip)
        .limit(limit),
      this.model.countDocuments({ action }),
    ]);

    // Keep audit logs even if user is deleted
    const data = rawData;

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findByDateRange(
    startDate: Date,
    endDate: Date,
    pagination: PaginationQuery = {}
  ): Promise<PaginatedResult<IAuditLog>> {
    const { page = 1, limit = 10 } = pagination;
    const skip = (page - 1) * limit;

    const filter = {
      timestamp: { $gte: startDate, $lte: endDate },
    };

    const [rawData, total] = await Promise.all([
      this.model
        .find(filter)
        .populate('performed_by', 'name email')
        .sort({ timestamp: -1 })
        .skip(skip)
        .limit(limit),
      this.model.countDocuments(filter),
    ]);

    // Keep audit logs even if user is deleted
    const data = rawData;

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findAllWithPagination(
    pagination: PaginationQuery = {}
  ): Promise<PaginatedResult<IAuditLog>> {
    const { page = 1, limit = 10 } = pagination;
    const skip = (page - 1) * limit;

    const [data, total] = await Promise.all([
      this.model
        .find()
        .populate('performed_by', 'name email')
        .sort({ timestamp: -1 })
        .skip(skip)
        .limit(limit),
      this.model.countDocuments(),
    ]);

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findByIdWithPopulate(id: string | Types.ObjectId): Promise<IAuditLog | null> {
    return this.model
      .findById(id)
      .populate('performed_by', 'name email');
  }
}

export const auditLogRepository = new AuditLogRepository();
