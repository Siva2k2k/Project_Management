import { Types } from 'mongoose';
import { projectWeeklyEffortRepository, PaginatedResult } from '../dbrepo';
import {
  NotFoundError,
  ConflictError,
  ValidationError,
  InternalError,
} from '../utils/errors';
import { logger } from '../utils';
import { IProjectWeeklyEffort, PaginationQuery } from '../types';
import {
  CreateWeeklyEffortInput,
  UpdateWeeklyEffortInput,
  BulkWeeklyEffortInput,
} from '../validators/weeklyEffort';

interface WeeklyEffortFilter {
  project?: string;
  resource?: string;
  week_start_date?: Date;
}

class WeeklyEffortService {
  async createWeeklyEffort(
    data: CreateWeeklyEffortInput,
    createdBy: string
  ): Promise<IProjectWeeklyEffort> {
    try {
      // Validate dates
      if (new Date(data.week_end_date) <= new Date(data.week_start_date)) {
        throw new ValidationError('Week end date must be after week start date');
      }

      // Check if entry already exists for this project, resource, and week
      const existingEntry = await projectWeeklyEffortRepository.findByProjectResourceWeek(
        data.project,
        data.resource,
        data.week_start_date
      );

      if (existingEntry) {
        throw new ConflictError(
          'Weekly effort entry already exists for this project, resource, and week'
        );
      }

      const weeklyEffort = await projectWeeklyEffortRepository.create({
        ...data,
        project: new Types.ObjectId(data.project),
        resource: new Types.ObjectId(data.resource),
        last_modified_date: new Date(),
        last_modified_by: new Types.ObjectId(createdBy),
      } as Partial<IProjectWeeklyEffort>);

      logger.info(`Weekly effort created: ${weeklyEffort._id} by ${createdBy}`);

      // Return populated entry
      const populated = await projectWeeklyEffortRepository.findById(weeklyEffort._id.toString());
      return populated!;
    } catch (error) {
      if (error instanceof ConflictError || error instanceof ValidationError) {
        throw error;
      }
      logger.error('Create weekly effort failed:', error);
      throw new InternalError('Failed to create weekly effort');
    }
  }

  async listWeeklyEfforts(
    filters: WeeklyEffortFilter,
    pagination: PaginationQuery
  ): Promise<PaginatedResult<IProjectWeeklyEffort>> {
    try {
      const query: Record<string, unknown> = {};

      if (filters.project) {
        query.project = new Types.ObjectId(filters.project);
      }

      if (filters.resource) {
        query.resource = new Types.ObjectId(filters.resource);
      }

      if (filters.week_start_date) {
        query.week_start_date = filters.week_start_date;
      }

      const result = await projectWeeklyEffortRepository.findWithPagination(query, pagination);

      return result;
    } catch (error) {
      logger.error('List weekly efforts failed:', error);
      throw new InternalError('Failed to list weekly efforts');
    }
  }

  async getWeeklyEffortById(effortId: string): Promise<IProjectWeeklyEffort> {
    try {
      const effort = await projectWeeklyEffortRepository.findById(effortId);

      if (!effort) {
        throw new NotFoundError('Weekly effort entry not found');
      }

      return effort;
    } catch (error) {
      if (error instanceof NotFoundError) {
        throw error;
      }
      logger.error('Get weekly effort failed:', error);
      throw new InternalError('Failed to get weekly effort');
    }
  }

  async updateWeeklyEffort(
    effortId: string,
    data: UpdateWeeklyEffortInput,
    modifiedBy: string
  ): Promise<IProjectWeeklyEffort> {
    try {
      const effort = await projectWeeklyEffortRepository.findById(effortId);

      if (!effort) {
        throw new NotFoundError('Weekly effort entry not found');
      }

      const updateData: Record<string, unknown> = {
        ...data,
        last_modified_date: new Date(),
        last_modified_by: new Types.ObjectId(modifiedBy),
      };

      const updatedEffort = await projectWeeklyEffortRepository.updateById(effortId, updateData);

      if (!updatedEffort) {
        throw new NotFoundError('Weekly effort entry not found');
      }

      logger.info(`Weekly effort updated: ${effortId} by ${modifiedBy}`);

      return updatedEffort;
    } catch (error) {
      if (error instanceof NotFoundError || error instanceof ValidationError) {
        throw error;
      }
      logger.error('Update weekly effort failed:', error);
      throw new InternalError('Failed to update weekly effort');
    }
  }

  async deleteWeeklyEffort(effortId: string, deletedBy: string): Promise<void> {
    try {
      const effort = await projectWeeklyEffortRepository.findById(effortId);

      if (!effort) {
        throw new NotFoundError('Weekly effort entry not found');
      }

      await projectWeeklyEffortRepository.deleteById(effortId);

      logger.info(`Weekly effort deleted: ${effortId} by ${deletedBy}`);
    } catch (error) {
      if (error instanceof NotFoundError) {
        throw error;
      }
      logger.error('Delete weekly effort failed:', error);
      throw new InternalError('Failed to delete weekly effort');
    }
  }

  async getWeeklyEffortsByProject(
    projectId: string,
    pagination: PaginationQuery
  ): Promise<PaginatedResult<IProjectWeeklyEffort>> {
    try {
      const result = await projectWeeklyEffortRepository.findByProject(projectId, pagination);
      return result;
    } catch (error) {
      logger.error('Get weekly efforts by project failed:', error);
      throw new InternalError('Failed to get weekly efforts by project');
    }
  }

  async getWeeklyEffortsByResource(
    resourceId: string,
    pagination: PaginationQuery
  ): Promise<PaginatedResult<IProjectWeeklyEffort>> {
    try {
      const result = await projectWeeklyEffortRepository.findByResource(resourceId, pagination);
      return result;
    } catch (error) {
      logger.error('Get weekly efforts by resource failed:', error);
      throw new InternalError('Failed to get weekly efforts by resource');
    }
  }

  async getTotalHoursByProject(projectId: string): Promise<number> {
    try {
      const totalHours = await projectWeeklyEffortRepository.getTotalHoursByProject(projectId);
      return totalHours;
    } catch (error) {
      logger.error('Get total hours by project failed:', error);
      throw new InternalError('Failed to get total hours by project');
    }
  }

  async getResourceAllocationByProject(
    projectId: string
  ): Promise<{ resource: Types.ObjectId; resourceName: string; totalHours: number }[]> {
    try {
      const allocation = await projectWeeklyEffortRepository.getResourceAllocationByProject(projectId);
      return allocation;
    } catch (error) {
      logger.error('Get resource allocation by project failed:', error);
      throw new InternalError('Failed to get resource allocation by project');
    }
  }

  async bulkCreateWeeklyEfforts(
    data: BulkWeeklyEffortInput,
    createdBy: string
  ): Promise<{ success: number; failed: number; errors: string[] }> {
    try {
      const results = {
        success: 0,
        failed: 0,
        errors: [] as string[],
      };

      for (const entry of data.entries) {
        try {
          await this.createWeeklyEffort(entry, createdBy);
          results.success++;
        } catch (err) {
          results.failed++;
          const errorMessage = err instanceof Error ? err.message : 'Unknown error';
          results.errors.push(
            `Project: ${entry.project}, Resource: ${entry.resource}, Week: ${entry.week_start_date} - ${errorMessage}`
          );
        }
      }

      logger.info(
        `Bulk weekly effort creation completed: ${results.success} success, ${results.failed} failed`
      );

      return results;
    } catch (error) {
      logger.error('Bulk create weekly efforts failed:', error);
      throw new InternalError('Failed to bulk create weekly efforts');
    }
  }
}

export const weeklyEffortService = new WeeklyEffortService();
