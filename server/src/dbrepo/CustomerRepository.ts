import { Types } from 'mongoose';
import { Customer } from '../models';
import { ICustomer } from '../types';
import { BaseRepository } from './BaseRepository';

export class CustomerRepository extends BaseRepository<ICustomer> {
  constructor() {
    super(Customer);
  }

  async findByName(name: string): Promise<ICustomer | null> {
    return this.model.findOne({
      customer_name: { $regex: new RegExp(`^${name}$`, 'i') },
    });
  }

  async findByEmail(email: string): Promise<ICustomer | null> {
    return this.model.findOne({ email: email.toLowerCase() });
  }

  async findByCreator(createdBy: string | Types.ObjectId): Promise<ICustomer[]> {
    return this.model.find({ created_by: createdBy });
  }

  async searchByName(searchTerm: string): Promise<ICustomer[]> {
    return this.model.find({
      customer_name: { $regex: searchTerm, $options: 'i' },
    });
  }
}

export const customerRepository = new CustomerRepository();
