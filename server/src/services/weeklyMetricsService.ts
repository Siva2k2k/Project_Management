import { Types } from 'mongoose';
import { projectWeeklyMetricsRepository, projectRepository, PaginatedResult } from '../dbrepo';
import {
  NotFoundError,
  ConflictError,
  ValidationError,
  InternalError,
} from '../utils/errors';
import { logger } from '../utils';
import { IProjectWeeklyMetrics, PaginationQuery } from '../types';
import {
  CreateWeeklyMetricsInput,
  UpdateWeeklyMetricsInput,
} from '../validators/weeklyMetrics';

interface WeeklyMetricsFilter {
  project?: string;
  week_start_date?: Date;
}

class WeeklyMetricsService {
  async createWeeklyMetrics(
    data: CreateWeeklyMetricsInput,
    createdBy: string
  ): Promise<IProjectWeeklyMetrics> {
    try {
      // Validate dates
      if (new Date(data.week_end_date) <= new Date(data.week_start_date)) {
        throw new ValidationError('Week end date must be after week start date');
      }

      // Check if entry already exists for this project and week
      const existingEntry = await projectWeeklyMetricsRepository.findByProjectWeek(
        data.project,
        data.week_start_date
      );

      if (existingEntry) {
        throw new ConflictError(
          'Weekly metrics entry already exists for this project and week'
        );
      }

      const weeklyMetrics = await projectWeeklyMetricsRepository.create({
        ...data,
        project: new Types.ObjectId(data.project),
        last_modified_date: new Date(),
        last_modified_by: new Types.ObjectId(createdBy),
      } as Partial<IProjectWeeklyMetrics>);

      // Update project scope_completed
      await projectRepository.updateById(data.project, {
        scope_completed: data.scope_completed,
        last_modified_date: new Date(),
        last_modified_by: new Types.ObjectId(createdBy),
      });

      logger.info(`Weekly metrics created: ${weeklyMetrics._id} by ${createdBy}`);

      return weeklyMetrics;
    } catch (error) {
      if (error instanceof ConflictError || error instanceof ValidationError) {
        throw error;
      }
      logger.error('Create weekly metrics failed:', error);
      throw new InternalError('Failed to create weekly metrics');
    }
  }

  async listWeeklyMetrics(
    filters: WeeklyMetricsFilter,
    pagination: PaginationQuery
  ): Promise<PaginatedResult<IProjectWeeklyMetrics>> {
    try {
      const query: Record<string, unknown> = {};

      if (filters.project) {
        query.project = new Types.ObjectId(filters.project);
      }

      if (filters.week_start_date) {
        query.week_start_date = filters.week_start_date;
      }

      const result = await projectWeeklyMetricsRepository.findWithPagination(query, pagination);

      return result;
    } catch (error) {
      logger.error('List weekly metrics failed:', error);
      throw new InternalError('Failed to list weekly metrics');
    }
  }

  async getWeeklyMetricsById(metricsId: string): Promise<IProjectWeeklyMetrics> {
    try {
      const metrics = await projectWeeklyMetricsRepository.findById(metricsId);

      if (!metrics) {
        throw new NotFoundError('Weekly metrics entry not found');
      }

      return metrics;
    } catch (error) {
      if (error instanceof NotFoundError) {
        throw error;
      }
      logger.error('Get weekly metrics failed:', error);
      throw new InternalError('Failed to get weekly metrics');
    }
  }

  async updateWeeklyMetrics(
    metricsId: string,
    data: UpdateWeeklyMetricsInput,
    modifiedBy: string
  ): Promise<IProjectWeeklyMetrics> {
    try {
      const metrics = await projectWeeklyMetricsRepository.findById(metricsId);

      if (!metrics) {
        throw new NotFoundError('Weekly metrics entry not found');
      }

      const updateData: Record<string, unknown> = {
        ...data,
        last_modified_date: new Date(),
        last_modified_by: new Types.ObjectId(modifiedBy),
      };

      const updatedMetrics = await projectWeeklyMetricsRepository.updateById(metricsId, updateData);

      if (!updatedMetrics) {
        throw new NotFoundError('Weekly metrics entry not found');
      }

      // Update project scope_completed if provided
      if (data.scope_completed !== undefined) {
        await projectRepository.updateById(metrics.project.toString(), {
          scope_completed: data.scope_completed,
          last_modified_date: new Date(),
          last_modified_by: new Types.ObjectId(modifiedBy),
        });
      }

      logger.info(`Weekly metrics updated: ${metricsId} by ${modifiedBy}`);

      return updatedMetrics;
    } catch (error) {
      if (error instanceof NotFoundError || error instanceof ValidationError) {
        throw error;
      }
      logger.error('Update weekly metrics failed:', error);
      throw new InternalError('Failed to update weekly metrics');
    }
  }

  async deleteWeeklyMetrics(metricsId: string, deletedBy: string): Promise<void> {
    try {
      const metrics = await projectWeeklyMetricsRepository.findById(metricsId);

      if (!metrics) {
        throw new NotFoundError('Weekly metrics entry not found');
      }

      await projectWeeklyMetricsRepository.deleteById(metricsId);

      logger.info(`Weekly metrics deleted: ${metricsId} by ${deletedBy}`);
    } catch (error) {
      if (error instanceof NotFoundError) {
        throw error;
      }
      logger.error('Delete weekly metrics failed:', error);
      throw new InternalError('Failed to delete weekly metrics');
    }
  }

  async getWeeklyMetricsByProject(
    projectId: string,
    pagination: PaginationQuery
  ): Promise<PaginatedResult<IProjectWeeklyMetrics>> {
    try {
      const result = await projectWeeklyMetricsRepository.findByProject(projectId, pagination);
      return result;
    } catch (error) {
      logger.error('Get weekly metrics by project failed:', error);
      throw new InternalError('Failed to get weekly metrics by project');
    }
  }

  async getTotalHoursByProject(projectId: string): Promise<number> {
    try {
      const totalHours = await projectWeeklyMetricsRepository.getTotalHoursByProject(projectId);
      return totalHours;
    } catch (error) {
      logger.error('Get total hours by project failed:', error);
      throw new InternalError('Failed to get total hours by project');
    }
  }

  async getLatestMetricsByProject(projectId: string): Promise<IProjectWeeklyMetrics | null> {
    try {
      const metrics = await projectWeeklyMetricsRepository.getLatestMetricsByProject(projectId);
      return metrics;
    } catch (error) {
      logger.error('Get latest metrics by project failed:', error);
      throw new InternalError('Failed to get latest metrics by project');
    }
  }
}

export const weeklyMetricsService = new WeeklyMetricsService();
