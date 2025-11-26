import { BaseRepository, PaginatedResult } from './BaseRepository';
import { ProjectWeeklyMetrics } from '../models';
import { IProjectWeeklyMetrics, PaginationQuery } from '../types';

class ProjectWeeklyMetricsRepository extends BaseRepository<IProjectWeeklyMetrics> {
  constructor() {
    super(ProjectWeeklyMetrics);
  }

  // Override findWithPagination to include population
  async findWithPagination(
    filter: any = {},
    options: PaginationQuery = {}
  ): Promise<PaginatedResult<IProjectWeeklyMetrics>> {
    const { page = 1, limit = 10, sort = 'createdAt', order = 'desc' } = options;
    const skip = (page - 1) * limit;
    const sortOrder = order === 'asc' ? 1 : -1;

    const [rawData, total] = await Promise.all([
      this.model
        .find(filter)
        .populate('project', 'project_name')
        .sort({ [sort]: sortOrder })
        .skip(skip)
        .limit(limit),
      this.model.countDocuments(filter),
    ]);

    // Filter out entries with null project references
    const data = rawData.filter(item => item.project);

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findByProject(
    projectId: string,
    pagination: PaginationQuery
  ): Promise<PaginatedResult<IProjectWeeklyMetrics>> {
    return this.findWithPagination({ project: projectId }, pagination);
  }

  async findByProjectWeek(
    projectId: string,
    weekStartDate: Date
  ): Promise<IProjectWeeklyMetrics | null> {
    return this.model.findOne({ project: projectId, week_start_date: weekStartDate }).exec();
  }

  async getTotalHoursByProject(projectId: string): Promise<number> {
    const result = await this.model.aggregate([
      { $match: { project: projectId } },
      { $group: { _id: null, totalHours: { $sum: '$rollup_hours' } } },
    ]);

    return result.length > 0 ? result[0].totalHours : 0;
  }

  async getLatestMetricsByProject(projectId: string): Promise<IProjectWeeklyMetrics | null> {
    return this.model
      .findOne({ project: projectId })
      .sort({ week_start_date: -1 })
      .exec();
  }
}

export const projectWeeklyMetricsRepository = new ProjectWeeklyMetricsRepository();
