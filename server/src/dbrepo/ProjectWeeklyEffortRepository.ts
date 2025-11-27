import { Types } from 'mongoose';
import { ProjectWeeklyEffort } from '../models';
import { IProjectWeeklyEffort, PaginationQuery } from '../types';
import { BaseRepository, PaginatedResult } from './BaseRepository';

export class ProjectWeeklyEffortRepository extends BaseRepository<IProjectWeeklyEffort> {
  constructor() {
    super(ProjectWeeklyEffort);
  }

  // Override findWithPagination to include population
  async findWithPagination(
    filter: any = {},
    options: PaginationQuery = {}
  ): Promise<PaginatedResult<IProjectWeeklyEffort>> {
    const { page = 1, limit = 10, sort = 'createdAt', order = 'desc' } = options;
    const skip = (page - 1) * limit;
    const sortOrder = order === 'asc' ? 1 : -1;

    const [rawData, total] = await Promise.all([
      this.model
        .find(filter)
        .populate('project', 'project_name')
        .populate('resource', 'resource_name email')
        .sort({ [sort]: sortOrder })
        .skip(skip)
        .limit(limit),
      this.model.countDocuments(filter),
    ]);

    // Filter out entries with null references
    const data = rawData.filter(item => item.project && item.resource);

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findByProject(
    projectId: string | Types.ObjectId,
    pagination: PaginationQuery = {}
  ): Promise<PaginatedResult<IProjectWeeklyEffort>> {
    const { page = 1, limit = 10, sort = 'week_start_date', order = 'desc' } = pagination;
    const skip = (page - 1) * limit;
    const sortOrder = order === 'asc' ? 1 : -1;

    const [rawData, total] = await Promise.all([
      this.model
        .find({ project: projectId })
        .populate('resource', 'resource_name email')
        .sort({ [sort]: sortOrder })
        .skip(skip)
        .limit(limit),
      this.model.countDocuments({ project: projectId }),
    ]);

    // Filter out entries with null resource references
    const data = rawData.filter(item => item.resource);

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findByResource(
    resourceId: string | Types.ObjectId,
    pagination: PaginationQuery = {}
  ): Promise<PaginatedResult<IProjectWeeklyEffort>> {
    const { page = 1, limit = 10, sort = 'week_start_date', order = 'desc' } = pagination;
    const skip = (page - 1) * limit;
    const sortOrder = order === 'asc' ? 1 : -1;

    const [rawData, total] = await Promise.all([
      this.model
        .find({ resource: resourceId })
        .populate('project', 'project_name')
        .sort({ [sort]: sortOrder })
        .skip(skip)
        .limit(limit),
      this.model.countDocuments({ resource: resourceId }),
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

  async findByWeek(weekStartDate: Date): Promise<IProjectWeeklyEffort[]> {
    const data = await this.model
      .find({ week_start_date: weekStartDate })
      .populate('project', 'project_name')
      .populate('resource', 'resource_name email');
    
    // Filter out entries with null references
    return data.filter(item => item.project && item.resource);
  }

  async findByProjectAndWeek(
    projectId: string | Types.ObjectId,
    weekStartDate: Date
  ): Promise<IProjectWeeklyEffort[]> {
    const data = await this.model
      .find({ project: projectId, week_start_date: weekStartDate })
      .populate('resource', 'resource_name email');
    
    // Filter out entries with null resource references
    return data.filter(item => item.resource);
  }

  async findByProjectResourceWeek(
    projectId: string | Types.ObjectId,
    resourceId: string | Types.ObjectId,
    weekStartDate: Date
  ): Promise<IProjectWeeklyEffort | null> {
    return this.model.findOne({
      project: projectId,
      resource: resourceId,
      week_start_date: weekStartDate,
    });
  }

  async getTotalHoursByProject(projectId: string | Types.ObjectId): Promise<number> {
    const result = await this.model.aggregate([
      { $match: { project: new Types.ObjectId(projectId.toString()) } },
      { $group: { _id: null, totalHours: { $sum: '$hours' } } },
    ]);

    return result[0]?.totalHours || 0;
  }

  async getTotalHoursByResource(resourceId: string | Types.ObjectId): Promise<number> {
    const result = await this.model.aggregate([
      { $match: { resource: new Types.ObjectId(resourceId.toString()) } },
      { $group: { _id: null, totalHours: { $sum: '$hours' } } },
    ]);

    return result[0]?.totalHours || 0;
  }

  async getWeeklyEffortByProject(
    projectId: string | Types.ObjectId,
    startDate: Date,
    endDate: Date
  ): Promise<{ week: Date; hours: number }[]> {
    return this.model.aggregate([
      {
        $match: {
          project: new Types.ObjectId(projectId.toString()),
          week_start_date: { $gte: startDate, $lte: endDate },
        },
      },
      {
        $group: {
          _id: '$week_start_date',
          hours: { $sum: '$hours' },
        },
      },
      { $sort: { _id: 1 } },
      {
        $project: {
          _id: 0,
          week: '$_id',
          hours: 1,
        },
      },
    ]);
  }

  async getResourceAllocationByProject(
    projectId: string | Types.ObjectId
  ): Promise<{ resource: Types.ObjectId; resourceName: string; totalHours: number }[]> {
    return this.model.aggregate([
      { $match: { project: new Types.ObjectId(projectId.toString()) } },
      {
        $group: {
          _id: '$resource',
          totalHours: { $sum: '$hours' },
        },
      },
      {
        $lookup: {
          from: 'resources',
          localField: '_id',
          foreignField: '_id',
          as: 'resourceDetails',
        },
      },
      { $unwind: '$resourceDetails' },
      {
        $project: {
          _id: 0,
          resource: '$_id',
          resourceName: '$resourceDetails.resource_name',
          totalHours: 1,
        },
      },
    ]);
  }

  async getEffortByWeek(
    projectIds: string[],
    startDate: Date
  ): Promise<{ week_start_date: Date; total_hours: number }[]> {
    const objectIds = projectIds.map((id) => new Types.ObjectId(id));
    return this.model.aggregate([
      {
        $match: {
          project: { $in: objectIds },
          week_start_date: { $gte: startDate },
        },
      },
      {
        $group: {
          _id: '$week_start_date',
          total_hours: { $sum: '$hours' },
        },
      },
      { $sort: { _id: 1 } },
      {
        $project: {
          _id: 0,
          week_start_date: '$_id',
          total_hours: 1,
        },
      },
    ]);
  }

  async getResourceAllocation(
    projectIds: string[]
  ): Promise<{ resource_name: string; total_hours: number; project_count: number }[]> {
    const objectIds = projectIds.map((id) => new Types.ObjectId(id));
    return this.model.aggregate([
      { $match: { project: { $in: objectIds } } },
      {
        $group: {
          _id: '$resource',
          total_hours: { $sum: '$hours' },
          projects: { $addToSet: '$project' },
        },
      },
      {
        $lookup: {
          from: 'resources',
          localField: '_id',
          foreignField: '_id',
          as: 'resourceDetails',
        },
      },
      { $unwind: '$resourceDetails' },
      {
        $project: {
          _id: 0,
          resource_name: '$resourceDetails.resource_name',
          total_hours: 1,
          project_count: { $size: '$projects' },
        },
      },
    ]);
  }

  async findAllByProject(projectId: string | Types.ObjectId): Promise<IProjectWeeklyEffort[]> {
    const data = await this.model
      .find({ project: projectId })
      .populate('resource', 'resource_name email per_hour_rate')
      .populate('project', 'project_name')
      .sort({ week_start_date: 1 });
    
    // Filter out entries with null references
    return data.filter(item => item.project && item.resource);
  }
}

export const projectWeeklyEffortRepository = new ProjectWeeklyEffortRepository();
