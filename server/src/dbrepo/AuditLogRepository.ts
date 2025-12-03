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

  async findWithFilters(
    filters: {
      entityType?: string;
      entityId?: string | Types.ObjectId;
      action?: string;
      userId?: string | Types.ObjectId;
      startDate?: Date;
      endDate?: Date;
    },
    pagination: PaginationQuery = {}
  ): Promise<PaginatedResult<IAuditLog>> {
    const { page = 1, limit = 10 } = pagination;
    const skip = (page - 1) * limit;

    const query: any = {};

    if (filters.entityType) {
      query.entity_type = filters.entityType;
    }

    if (filters.entityId) {
      query.entity_id = new Types.ObjectId(filters.entityId.toString());
    }

    if (filters.action) {
      query.action = filters.action;
    }

    if (filters.userId) {
      query.performed_by = new Types.ObjectId(filters.userId.toString());
    }

    if (filters.startDate || filters.endDate) {
      query.timestamp = {};
      if (filters.startDate) {
        query.timestamp.$gte = filters.startDate;
      }
      if (filters.endDate) {
        query.timestamp.$lte = filters.endDate;
      }
    }

    const [data, total] = await Promise.all([
      this.model
        .find(query)
        .populate('performed_by', 'name email')
        .sort({ timestamp: -1 })
        .skip(skip)
        .limit(limit),
      this.model.countDocuments(query),
    ]);

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async enrichWithEntityNames(logs: IAuditLog[]): Promise<any[]> {
    const { User, Customer, Resource, Project } = require('../models');
    const { Types } = require('mongoose');
    
    // Helper function to convert value to string if it's an ObjectId
    const objectIdToString = (value: any): string | null => {
      if (!value) return null;
      
      // Handle Mongoose ObjectId
      if (value instanceof Types.ObjectId) {
        return value.toString();
      }
      
      // Handle plain ObjectId objects with buffer
      if (value && typeof value === 'object' && value.buffer) {
        return new Types.ObjectId(value.buffer).toString();
      }
      
      // Check if it's already a string ObjectId
      const objectIdPattern = /^[a-f\d]{24}$/i;
      if (typeof value === 'string' && objectIdPattern.test(value)) {
        return value;
      }
      
      return null;
    };
    
    // Helper function to check if value is a Date object
    const isDateObject = (value: any): boolean => {
      return value instanceof Date || (value && typeof value === 'object' && value.constructor && value.constructor.name === 'Date');
    };
    
    // Helper function to format date
    const formatDate = (value: any): string | null => {
      if (!value) return null;
      
      try {
        // Check if it's a Date object
        if (isDateObject(value)) {
          return new Date(value).toISOString().split('T')[0];
        }
        
        // Check if it's already a string date
        if (typeof value === 'string') {
          const date = new Date(value);
          if (!isNaN(date.getTime())) {
            return date.toISOString().split('T')[0];
          }
        }
      } catch (error) {
        // Return original value if parsing fails
      }
      
      return null;
    };
    
    // Helper function to resolve ObjectId references to names
    const resolveReference = async (fieldName: string, value: any): Promise<any> => {
      if (!value) return value;
      
      // Handle dates first
      if (fieldName.includes('date') || fieldName.includes('Date')) {
        const formattedDate = formatDate(value);
        if (formattedDate) return formattedDate;
      }
      
      const objectIdStr = objectIdToString(value);
      
      if (objectIdStr) {
        try {
          // Try to resolve common reference fields
          if (fieldName.includes('manager') || fieldName.includes('user') || fieldName === 'created_by' || fieldName === 'last_modified_by' || fieldName === 'performed_by') {
            const user = await User.findById(objectIdStr).select('name');
            return user ? user.name : objectIdStr;
          } else if (fieldName.includes('customer')) {
            const customer = await Customer.findById(objectIdStr).select('customer_name');
            return customer ? customer.customer_name : objectIdStr;
          } else if (fieldName.includes('resource')) {
            const resource = await Resource.findById(objectIdStr).select('resource_name');
            return resource ? resource.resource_name : objectIdStr;
          } else if (fieldName.includes('project')) {
            const project = await Project.findById(objectIdStr).select('project_name');
            return project ? project.project_name : objectIdStr;
          }
          return objectIdStr;
        } catch (error) {
          // If resolution fails, return ObjectId string
          return objectIdStr;
        }
      }
      
      return value;
    };

    // Helper function to recursively resolve references in an object
    const resolveObjectReferences = async (obj: any): Promise<any> => {
      if (!obj || typeof obj !== 'object') return obj;
      
      if (Array.isArray(obj)) {
        // Handle arrays - resolve each item
        return Promise.all(obj.map(async (item) => {
          // Check if array item is an ObjectId that should be resolved
          const objectIdStr = objectIdToString(item);
          if (objectIdStr) {
            try {
              // Try to resolve as resource first (common case for arrays)
              const resource = await Resource.findById(objectIdStr).select('resource_name');
              if (resource) return resource.resource_name;
              
              // Try user
              const user = await User.findById(objectIdStr).select('name');
              if (user) return user.name;
              
              // If not found, return the ObjectId string
              return objectIdStr;
            } catch (error) {
              return objectIdStr;
            }
          }
          
          // If not an ObjectId, recursively resolve
          return resolveObjectReferences(item);
        }));
      }
      
      const resolved: any = {};
      for (const [key, value] of Object.entries(obj)) {
        // Handle arrays (like resources field)
        if (Array.isArray(value)) {
          resolved[key] = await Promise.all(value.map(async (item) => {
            const objectIdStr = objectIdToString(item);
            if (objectIdStr) {
              try {
                // For resources array, resolve to resource names
                if (key === 'resources' || key.includes('resource')) {
                  const resource = await Resource.findById(objectIdStr).select('resource_name');
                  if (resource) return resource.resource_name;
                }
                
                // For other arrays, try user
                const user = await User.findById(objectIdStr).select('name');
                if (user) return user.name;
                
                return objectIdStr;
              } catch (error) {
                return objectIdStr;
              }
            }
            return resolveObjectReferences(item);
          }));
          continue;
        }
        
        // Skip empty objects or objects with only internal properties
        if (value && typeof value === 'object' && !Array.isArray(value)) {
          // Check if it's a Date object
          if (isDateObject(value)) {
            resolved[key] = formatDate(value);
            continue;
          }
          
          // Check if it's an ObjectId buffer
          if ((value as any).buffer) {
            resolved[key] = await resolveReference(key, value);
            continue;
          }
          
          // Recursively resolve nested objects
          resolved[key] = await resolveObjectReferences(value);
        } else {
          resolved[key] = await resolveReference(key, value);
        }
      }
      
      return resolved;
    };
    
    const enrichedLogs = await Promise.all(
      logs.map(async (log) => {
        const logObj = log.toObject();
        let entityName = null;

        try {
          // Convert entity_id to proper ObjectId string
          const entityIdStr = objectIdToString(log.entity_id);
          
          if (entityIdStr) {
            // Fetch entity name based on entity_type
            switch (log.entity_type) {
              case 'User':
                const user = await User.findById(entityIdStr).select('name');
                entityName = user?.name || null;
                break;
              case 'Customer':
                const customer = await Customer.findById(entityIdStr).select('customer_name');
                entityName = customer?.customer_name || null;
                break;
              case 'Resource':
                const resource = await Resource.findById(entityIdStr).select('resource_name');
                entityName = resource?.resource_name || null;
                break;
              case 'Project':
                const project = await Project.findById(entityIdStr).select('project_name');
                entityName = project?.project_name || null;
                break;
              default:
                entityName = null;
            }
          }
        } catch (error) {
          // Entity might be deleted, entityName will remain null
          entityName = null;
        }

        // Resolve references in previous_data and new_data
        let enrichedPreviousData = logObj.previous_data ? await resolveObjectReferences(logObj.previous_data) : logObj.previous_data;
        let enrichedNewData = logObj.new_data ? await resolveObjectReferences(logObj.new_data) : logObj.new_data;

        // Filter out fields where the change is between null/empty values
        if (enrichedPreviousData && enrichedNewData) {
          const filteredPreviousData: any = {};
          const filteredNewData: any = {};

          for (const key in enrichedPreviousData) {
            const prevValue = enrichedPreviousData[key];
            const newValue = enrichedNewData[key];

            // Check if both values are "empty" (null, undefined, empty string, or empty array)
            const isPrevEmpty = prevValue === null || prevValue === undefined || prevValue === '' || (Array.isArray(prevValue) && prevValue.length === 0);
            const isNewEmpty = newValue === null || newValue === undefined || newValue === '' || (Array.isArray(newValue) && newValue.length === 0);

            // Only include the field if it's not a null/empty to null/empty change
            if (!(isPrevEmpty && isNewEmpty)) {
              filteredPreviousData[key] = prevValue;
              filteredNewData[key] = newValue;
            }
          }

          // Also check for keys that only exist in newData
          for (const key in enrichedNewData) {
            if (!(key in enrichedPreviousData)) {
              const newValue = enrichedNewData[key];
              const isNewEmpty = newValue === null || newValue === undefined || newValue === '' || (Array.isArray(newValue) && newValue.length === 0);
              
              // Only include if the new value is not empty
              if (!isNewEmpty) {
                filteredPreviousData[key] = undefined;
                filteredNewData[key] = newValue;
              }
            }
          }

          enrichedPreviousData = filteredPreviousData;
          enrichedNewData = filteredNewData;
        }

        return {
          ...logObj,
          entity_name: entityName,
          previous_data: enrichedPreviousData,
          new_data: enrichedNewData,
        };
      })
    );

    return enrichedLogs;
  }
}

export const auditLogRepository = new AuditLogRepository();
