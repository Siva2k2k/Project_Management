import { Types } from 'mongoose';
import { resourceRepository, PaginatedResult } from '../dbrepo';
import {
  NotFoundError,
  ConflictError,
  ValidationError,
  InternalError,
} from '../utils/errors';
import { logger } from '../utils';
import { IResource, ResourceStatus, Currency, PaginationQuery } from '../types';
import { CreateResourceInput, UpdateResourceInput, UpdateResourceStatusInput } from '../validators/resource';

interface ResourceFilter {
  search?: string;
  status?: ResourceStatus;
  currency?: Currency;
}

class ResourceService {
  async createResource(
    data: CreateResourceInput,
    createdBy: string
  ): Promise<IResource> {
    try {
      // Check if resource with same email already exists
      const existingResource = await resourceRepository.findByEmail(data.email);
      if (existingResource) {
        throw new ConflictError('Resource with this email already exists');
      }

      const resource = await resourceRepository.create({
        ...data,
        is_deleted: false,
        last_modified_date: new Date(),
        last_modified_by: new Types.ObjectId(createdBy),
      } as Partial<IResource>);

      logger.info(`Resource created: ${resource._id} by ${createdBy}`);

      return resource;
    } catch (error) {
      if (error instanceof ConflictError || error instanceof ValidationError) {
        throw error;
      }
      logger.error('Create resource failed:', error);
      throw new InternalError('Failed to create resource');
    }
  }

  async listResources(
    filters: ResourceFilter,
    pagination: PaginationQuery
  ): Promise<PaginatedResult<IResource>> {
    try {
      const query: Record<string, unknown> = {};

      if (filters.search) {
        query.$or = [
          { resource_name: { $regex: filters.search, $options: 'i' } },
          { email: { $regex: filters.search, $options: 'i' } },
        ];
      }

      if (filters.status) {
        query.status = filters.status;
      }

      if (filters.currency) {
        query.currency = filters.currency;
      }

      const result = await resourceRepository.findWithPagination(query, pagination);

      return result;
    } catch (error) {
      logger.error('List resources failed:', error);
      throw new InternalError('Failed to list resources');
    }
  }

  async getResourceById(resourceId: string): Promise<IResource> {
    try {
      const resource = await resourceRepository.findById(resourceId);

      if (!resource) {
        throw new NotFoundError('Resource not found');
      }

      return resource;
    } catch (error) {
      if (error instanceof NotFoundError) {
        throw error;
      }
      logger.error('Get resource failed:', error);
      throw new InternalError('Failed to get resource');
    }
  }

  async updateResource(
    resourceId: string,
    data: UpdateResourceInput,
    modifiedBy: string
  ): Promise<IResource> {
    try {
      const resource = await resourceRepository.findById(resourceId);

      if (!resource) {
        throw new NotFoundError('Resource not found');
      }

      // Check if email is being changed and if it's already taken
      if (data.email && data.email !== resource.email) {
        const existingResource = await resourceRepository.findByEmail(data.email);
        if (existingResource) {
          throw new ConflictError('Email already in use');
        }
      }

      const updatedResource = await resourceRepository.updateById(resourceId, {
        ...data,
        last_modified_date: new Date(),
        last_modified_by: new Types.ObjectId(modifiedBy),
      });

      if (!updatedResource) {
        throw new NotFoundError('Resource not found');
      }

      logger.info(`Resource updated: ${resourceId} by ${modifiedBy}`);

      return updatedResource;
    } catch (error) {
      if (
        error instanceof NotFoundError ||
        error instanceof ConflictError ||
        error instanceof ValidationError
      ) {
        throw error;
      }
      logger.error('Update resource failed:', error);
      throw new InternalError('Failed to update resource');
    }
  }

  async updateResourceStatus(
    resourceId: string,
    data: UpdateResourceStatusInput,
    modifiedBy: string
  ): Promise<IResource> {
    try {
      const resource = await resourceRepository.findById(resourceId);

      if (!resource) {
        throw new NotFoundError('Resource not found');
      }

      const updatedResource = await resourceRepository.updateStatus(resourceId, data.status);

      if (!updatedResource) {
        throw new NotFoundError('Resource not found');
      }

      // Update last_modified_by
      await resourceRepository.updateById(resourceId, {
        last_modified_by: new Types.ObjectId(modifiedBy),
      });

      logger.info(`Resource status updated: ${resourceId} to ${data.status} by ${modifiedBy}`);

      return updatedResource;
    } catch (error) {
      if (error instanceof NotFoundError) {
        throw error;
      }
      logger.error('Update resource status failed:', error);
      throw new InternalError('Failed to update resource status');
    }
  }

  async deleteResource(resourceId: string, deletedBy: string): Promise<void> {
    try {
      const resource = await resourceRepository.findById(resourceId);

      if (!resource) {
        throw new NotFoundError('Resource not found');
      }

      // Soft delete
      await resourceRepository.softDelete(resourceId);

      logger.info(`Resource deleted: ${resourceId} by ${deletedBy}`);
    } catch (error) {
      if (error instanceof NotFoundError) {
        throw error;
      }
      logger.error('Delete resource failed:', error);
      throw new InternalError('Failed to delete resource');
    }
  }

  async getActiveResources(): Promise<IResource[]> {
    try {
      const resources = await resourceRepository.findActiveResources();
      return resources;
    } catch (error) {
      logger.error('Get active resources failed:', error);
      throw new InternalError('Failed to get active resources');
    }
  }

  async searchResources(searchTerm: string): Promise<IResource[]> {
    try {
      const resources = await resourceRepository.searchByName(searchTerm);
      return resources;
    } catch (error) {
      logger.error('Search resources failed:', error);
      throw new InternalError('Failed to search resources');
    }
  }
}

export const resourceService = new ResourceService();
