import { Types } from 'mongoose';
import { Project } from '../models';
import { IProject, RAGStatus, ProjectType, PaginationQuery } from '../types';
import { BaseRepository, PaginatedResult } from './BaseRepository';

export interface ProjectFilter {
  assigned_manager?: string | Types.ObjectId;
  customer?: string | Types.ObjectId;
  overall_status?: RAGStatus;
  project_type?: ProjectType;
  search?: string;
}

export class ProjectRepository extends BaseRepository<IProject> {
  constructor() {
    super(Project);
  }

  async findByManager(managerId: string | Types.ObjectId): Promise<IProject[]> {
    return this.model
      .find({ assigned_manager: managerId, is_deleted: false })
      .populate('customer', 'customer_name')
      .populate('assigned_manager', 'name email');
  }

  async findAll(): Promise<IProject[]> {
    return this.model
      .find({ is_deleted: false })
      .populate('customer', 'customer_name')
      .populate('assigned_manager', 'name email');
  }

  async findByCustomer(customerId: string | Types.ObjectId): Promise<IProject[]> {
    return this.model
      .find({ customer: customerId })
      .populate('customer', 'customer_name')
      .populate('assigned_manager', 'name email');
  }

  async findByStatus(status: RAGStatus): Promise<IProject[]> {
    return this.model
      .find({ overall_status: status })
      .populate('customer', 'customer_name')
      .populate('assigned_manager', 'name email');
  }

  async findWithFilters(
    filters: ProjectFilter,
    pagination: PaginationQuery = {}
  ): Promise<PaginatedResult<IProject>> {
    const query: Record<string, unknown> = {};

    if (filters.assigned_manager) {
      query.assigned_manager = filters.assigned_manager;
    }

    if (filters.customer) {
      query.customer = filters.customer;
    }

    if (filters.overall_status) {
      query.overall_status = filters.overall_status;
    }

    if (filters.project_type) {
      query.project_type = filters.project_type;
    }

    if (filters.search) {
      query.project_name = { $regex: filters.search, $options: 'i' };
    }

    const { page = 1, limit = 10, sort = 'createdAt', order = 'desc' } = pagination;
    const skip = (page - 1) * limit;
    const sortOrder = order === 'asc' ? 1 : -1;

    const [data, total] = await Promise.all([
      this.model
        .find(query)
        .populate('customer', 'customer_name')
        .populate('assigned_manager', 'name email')
        .sort({ [sort]: sortOrder })
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

  async findByIdWithPopulate(id: string | Types.ObjectId): Promise<IProject | null> {
    return this.model
      .findById(id)
      .populate('customer', 'customer_name email')
      .populate('assigned_manager', 'name email');
  }

  async updateMilestone(
    projectId: string | Types.ObjectId,
    milestoneId: string | Types.ObjectId,
    milestoneData: Partial<{ scope_completed: number; completed_date: Date | null }>
  ): Promise<IProject | null> {
    return this.model.findOneAndUpdate(
      { _id: projectId, 'milestones._id': milestoneId },
      {
        $set: {
          'milestones.$.scope_completed': milestoneData.scope_completed,
          ...(milestoneData.completed_date && {
            'milestones.$.completed_date': milestoneData.completed_date,
          }),
        },
        last_modified_date: new Date(),
      },
      { new: true }
    );
  }

  async addMilestone(
    projectId: string | Types.ObjectId,
    milestone: {
      description: string;
      estimated_date: Date;
      estimated_effort: number;
    }
  ): Promise<IProject | null> {
    return this.model.findByIdAndUpdate(
      projectId,
      {
        $push: { milestones: { ...milestone, scope_completed: 0 } },
        last_modified_date: new Date(),
      },
      { new: true }
    );
  }

  async removeMilestone(
    projectId: string | Types.ObjectId,
    milestoneId: string | Types.ObjectId
  ): Promise<IProject | null> {
    return this.model.findByIdAndUpdate(
      projectId,
      {
        $pull: { milestones: { _id: milestoneId } },
        last_modified_date: new Date(),
      },
      { new: true }
    );
  }

  async getProjectStats(managerId?: string | Types.ObjectId): Promise<{
    total: number;
    byStatus: Record<RAGStatus, number>;
    byType: Record<ProjectType, number>;
  }> {
    const matchStage = managerId
      ? { $match: { assigned_manager: new Types.ObjectId(managerId.toString()), is_deleted: false } }
      : { $match: { is_deleted: false } };

    const result = await this.model.aggregate([
      matchStage,
      {
        $facet: {
          total: [{ $count: 'count' }],
          byStatus: [
            { $group: { _id: '$overall_status', count: { $sum: 1 } } },
          ],
          byType: [
            { $group: { _id: '$project_type', count: { $sum: 1 } } },
          ],
        },
      },
    ]);

    const stats = result[0];
    const total = stats.total[0]?.count || 0;

    const byStatus: Record<string, number> = {};
    stats.byStatus.forEach((item: { _id: string; count: number }) => {
      byStatus[item._id] = item.count;
    });

    const byType: Record<string, number> = {};
    stats.byType.forEach((item: { _id: string; count: number }) => {
      byType[item._id] = item.count;
    });

    return {
      total,
      byStatus: byStatus as Record<RAGStatus, number>,
      byType: byType as Record<ProjectType, number>,
    };
  }
}

export const projectRepository = new ProjectRepository();
