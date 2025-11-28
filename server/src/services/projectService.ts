import { Types } from 'mongoose';
import { projectRepository, auditLogRepository, PaginatedResult } from '../dbrepo';
import {
  NotFoundError,
  ConflictError,
  ValidationError,
  InternalError,
} from '../utils/errors';
import { logger } from '../utils';
import { IProject, RAGStatus, ProjectType, PaginationQuery, AuditAction } from '../types';
import {
  CreateProjectInput,
  UpdateProjectInput,
  AddMilestoneInput,
  UpdateMilestoneInput
} from '../validators/project';
import { ProjectFilter } from '../dbrepo/ProjectRepository';

class ProjectService {
  async createProject(
    data: CreateProjectInput,
    createdBy: string
  ): Promise<IProject> {
    try {
      // Validate dates
      if (new Date(data.end_date) <= new Date(data.start_date)) {
        throw new ValidationError('End date must be after start date');
      }

      // Check if project with same name already exists
      const existingProject = await projectRepository.findOne({ project_name: data.project_name });
      if (existingProject) {
        throw new ConflictError('Project with this name already exists');
      }

      const project = await projectRepository.create({
        ...data,
        ...(data.resources && Array.isArray(data.resources) && {
          resources: data.resources.map((id) => new Types.ObjectId(id)),
        }),
        assigned_manager: new Types.ObjectId(data.assigned_manager),
        customer: new Types.ObjectId(data.customer),
        is_deleted: false,
        last_modified_date: new Date(),
        last_modified_by: new Types.ObjectId(createdBy),
      } as Partial<IProject>);

      // Create audit log
      await auditLogRepository.createLog(
        'Project',
        project._id.toString(),
        AuditAction.CREATE,
        createdBy,
        undefined,
        project.toObject()
      );

      logger.info(`Project created: ${project._id} by ${createdBy}`);

      // Return with populated fields
      const populatedProject = await projectRepository.findByIdWithPopulate(project._id);
      return populatedProject!;
    } catch (error) {
      if (error instanceof ValidationError) {
        throw error;
      }
      logger.error('Create project failed:', error);
      throw new InternalError('Failed to create project');
    }
  }

  async listProjects(
    filters: ProjectFilter,
    pagination: PaginationQuery
  ): Promise<PaginatedResult<IProject>> {
    try {
      const result = await projectRepository.findWithFilters(filters, pagination);
      return result;
    } catch (error) {
      logger.error('List projects failed:', error);
      throw new InternalError('Failed to list projects');
    }
  }

  async getProjectById(projectId: string): Promise<IProject> {
    try {
      const project = await projectRepository.findByIdWithPopulate(projectId);

      if (!project) {
        throw new NotFoundError('Project not found');
      }

      return project;
    } catch (error) {
      if (error instanceof NotFoundError) {
        throw error;
      }
      logger.error('Get project failed:', error);
      throw new InternalError('Failed to get project');
    }
  }

  async updateProject(
    projectId: string,
    data: UpdateProjectInput,
    modifiedBy: string
  ): Promise<IProject> {
    try {
      const project = await projectRepository.findById(projectId);

      if (!project) {
        throw new NotFoundError('Project not found');
      }

      // Validate dates if both are provided
      const startDate = data.start_date ? new Date(data.start_date) : project.start_date;
      const endDate = data.end_date ? new Date(data.end_date) : project.end_date;

      if (endDate <= startDate) {
        throw new ValidationError('End date must be after start date');
      }

      // Check if name is being changed and if it's already taken
      if (data.project_name && data.project_name !== project.project_name) {
        const existingProject = await projectRepository.findOne({ project_name: data.project_name });
        if (existingProject) {
          throw new ConflictError('Project name already in use');
        }
      }

      const previousData = project.toObject();

      const updateData: Record<string, unknown> = {
        ...data,
        last_modified_date: new Date(),
        last_modified_by: new Types.ObjectId(modifiedBy),
      };

      // Convert string IDs to ObjectIds if provided
      if (data.assigned_manager) {
        updateData.assigned_manager = new Types.ObjectId(data.assigned_manager);
      }
      if (data.customer) {
        updateData.customer = new Types.ObjectId(data.customer);
      }

      // Convert resources array of string IDs to ObjectIds if provided
      if (data.resources) {
        updateData.resources = data.resources.map((id) => new Types.ObjectId(id));
      }

      const updatedProject = await projectRepository.updateById(projectId, updateData);

      if (!updatedProject) {
        throw new NotFoundError('Project not found');
      }

      // Create audit log
      await auditLogRepository.createLog(
        'Project',
        projectId,
        AuditAction.UPDATE,
        modifiedBy,
        previousData,
        updatedProject.toObject()
      );

      logger.info(`Project updated: ${projectId} by ${modifiedBy}`);

      // Return with populated fields
      const populatedProject = await projectRepository.findByIdWithPopulate(projectId);
      return populatedProject!;
    } catch (error) {
      if (
        error instanceof NotFoundError ||
        error instanceof ValidationError
      ) {
        throw error;
      }
      logger.error('Update project failed:', error);
      throw new InternalError('Failed to update project');
    }
  }

  async deleteProject(projectId: string, deletedBy: string): Promise<void> {
    try {
      const project = await projectRepository.findById(projectId);

      if (!project) {
        throw new NotFoundError('Project not found');
      }

      const previousData = project.toObject();

      // Soft delete
      await projectRepository.softDelete(projectId);

      // Create audit log
      await auditLogRepository.createLog(
        'Project',
        projectId,
        AuditAction.DELETE,
        deletedBy,
        previousData,
        undefined
      );

      logger.info(`Project deleted: ${projectId} by ${deletedBy}`);
    } catch (error) {
      if (error instanceof NotFoundError) {
        throw error;
      }
      logger.error('Delete project failed:', error);
      throw new InternalError('Failed to delete project');
    }
  }

  async addMilestone(
    projectId: string,
    milestoneData: AddMilestoneInput,
    modifiedBy: string
  ): Promise<IProject> {
    try {
      const project = await projectRepository.findById(projectId);

      if (!project) {
        throw new NotFoundError('Project not found');
      }

      const updatedProject = await projectRepository.addMilestone(projectId, milestoneData);

      if (!updatedProject) {
        throw new NotFoundError('Project not found');
      }

      // Update last_modified_by
      await projectRepository.updateById(projectId, {
        last_modified_by: new Types.ObjectId(modifiedBy),
      });

      // Create audit log
      await auditLogRepository.createLog(
        'Project',
        projectId,
        AuditAction.UPDATE,
        modifiedBy,
        { action: 'add_milestone' },
        { milestone: milestoneData }
      );

      logger.info(`Milestone added to project: ${projectId} by ${modifiedBy}`);

      // Return with populated fields
      const populatedProject = await projectRepository.findByIdWithPopulate(projectId);
      return populatedProject!;
    } catch (error) {
      if (error instanceof NotFoundError) {
        throw error;
      }
      logger.error('Add milestone failed:', error);
      throw new InternalError('Failed to add milestone');
    }
  }

  async updateMilestone(
    projectId: string,
    milestoneId: string,
    milestoneData: UpdateMilestoneInput,
    modifiedBy: string
  ): Promise<IProject> {
    try {
      const project = await projectRepository.findById(projectId);

      if (!project) {
        throw new NotFoundError('Project not found');
      }

      const updatedProject = await projectRepository.updateMilestone(
        projectId,
        milestoneId,
        milestoneData
      );

      if (!updatedProject) {
        throw new NotFoundError('Milestone not found');
      }

      // Update last_modified_by
      await projectRepository.updateById(projectId, {
        last_modified_by: new Types.ObjectId(modifiedBy),
      });

      // Create audit log
      await auditLogRepository.createLog(
        'Project',
        projectId,
        AuditAction.UPDATE,
        modifiedBy,
        { action: 'update_milestone', milestone_id: milestoneId },
        { milestone: milestoneData }
      );

      logger.info(`Milestone ${milestoneId} updated in project: ${projectId} by ${modifiedBy}`);

      // Return with populated fields
      const populatedProject = await projectRepository.findByIdWithPopulate(projectId);
      return populatedProject!;
    } catch (error) {
      if (error instanceof NotFoundError) {
        throw error;
      }
      logger.error('Update milestone failed:', error);
      throw new InternalError('Failed to update milestone');
    }
  }

  async removeMilestone(
    projectId: string,
    milestoneId: string,
    modifiedBy: string
  ): Promise<IProject> {
    try {
      const project = await projectRepository.findById(projectId);

      if (!project) {
        throw new NotFoundError('Project not found');
      }

      const updatedProject = await projectRepository.removeMilestone(projectId, milestoneId);

      if (!updatedProject) {
        throw new NotFoundError('Project not found');
      }

      // Update last_modified_by
      await projectRepository.updateById(projectId, {
        last_modified_by: new Types.ObjectId(modifiedBy),
      });

      // Create audit log
      await auditLogRepository.createLog(
        'Project',
        projectId,
        AuditAction.UPDATE,
        modifiedBy,
        { action: 'remove_milestone', milestone_id: milestoneId },
        undefined
      );

      logger.info(`Milestone ${milestoneId} removed from project: ${projectId} by ${modifiedBy}`);

      // Return with populated fields
      const populatedProject = await projectRepository.findByIdWithPopulate(projectId);
      return populatedProject!;
    } catch (error) {
      if (error instanceof NotFoundError) {
        throw error;
      }
      logger.error('Remove milestone failed:', error);
      throw new InternalError('Failed to remove milestone');
    }
  }

  async getProjectStats(managerId?: string): Promise<{
    total: number;
    byStatus: Record<RAGStatus, number>;
    byType: Record<ProjectType, number>;
  }> {
    try {
      const stats = await projectRepository.getProjectStats(managerId);
      return stats;
    } catch (error) {
      logger.error('Get project stats failed:', error);
      throw new InternalError('Failed to get project stats');
    }
  }

  async getProjectsByManager(managerId: string): Promise<IProject[]> {
    try {
      const projects = await projectRepository.findByManager(managerId);
      return projects;
    } catch (error) {
      logger.error('Get projects by manager failed:', error);
      throw new InternalError('Failed to get projects by manager');
    }
  }

  async getProjectsByCustomer(customerId: string): Promise<IProject[]> {
    try {
      const projects = await projectRepository.findByCustomer(customerId);
      return projects;
    } catch (error) {
      logger.error('Get projects by customer failed:', error);
      throw new InternalError('Failed to get projects by customer');
    }
  }
}

export const projectService = new ProjectService();
