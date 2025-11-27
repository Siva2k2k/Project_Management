import { Resource } from '../models';
import { IResource, ResourceStatus, Currency } from '../types';
import { BaseRepository } from './BaseRepository';

export class ResourceRepository extends BaseRepository<IResource> {
  constructor() {
    super(Resource);
  }

  async findByEmail(email: string): Promise<IResource | null> {
    return this.model.findOne({ email: email.toLowerCase() });
  }

  async findByStatus(status: ResourceStatus): Promise<IResource[]> {
    return this.model.find({ status });
  }

  async findActiveResources(): Promise<IResource[]> {
    return this.model.find({ status: ResourceStatus.ACTIVE });
  }

  async findByCurrency(currency: Currency): Promise<IResource[]> {
    return this.model.find({ currency });
  }

  async searchByName(searchTerm: string): Promise<IResource[]> {
    return this.model.find({
      $or: [
        { resource_name: { $regex: searchTerm, $options: 'i' } },
        { email: { $regex: searchTerm, $options: 'i' } },
      ],
    });
  }

  async updateStatus(
    resourceId: string,
    status: ResourceStatus
  ): Promise<IResource | null> {
    return this.model.findByIdAndUpdate(
      resourceId,
      { status, last_modified_date: new Date() },
      { new: true }
    );
  }
}

export const resourceRepository = new ResourceRepository();
