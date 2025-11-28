import { Types } from 'mongoose';
import { customerRepository, PaginatedResult } from '../dbrepo';
import {
  NotFoundError,
  ConflictError,
  ValidationError,
  InternalError,
} from '../utils/errors';
import { logger } from '../utils';
import { ICustomer, PaginationQuery } from '../types';
import { CreateCustomerInput, UpdateCustomerInput } from '../validators/customer';

interface CustomerFilter {
  search?: string;
}

class CustomerService {
  async createCustomer(
    data: CreateCustomerInput,
    createdBy: string
  ): Promise<ICustomer> {
    try {
      // Check if customer with same email already exists
      const existingCustomer = await customerRepository.findByEmail(data.email);
      if (existingCustomer) {
        throw new ConflictError('Customer with this email already exists');
      }

      // Check if customer with same name already exists
      const existingCustomerByName = await customerRepository.findOne({ customer_name: data.customer_name });
      if (existingCustomerByName) {
        throw new ConflictError('Customer with this name already exists');
      }

      const customer = await customerRepository.create({
        ...data,
        created_by: new Types.ObjectId(createdBy),
        is_deleted: false,
        last_modified_date: new Date(),
        last_modified_by: new Types.ObjectId(createdBy),
      } as Partial<ICustomer>);

      logger.info(`Customer created: ${customer._id} by ${createdBy}`);

      return customer;
    } catch (error) {
      if (error instanceof ConflictError || error instanceof ValidationError) {
        throw error;
      }
      logger.error('Create customer failed:', error);
      throw new InternalError('Failed to create customer');
    }
  }

  async listCustomers(
    filters: CustomerFilter,
    pagination: PaginationQuery
  ): Promise<PaginatedResult<ICustomer>> {
    try {
      const query: Record<string, unknown> = {};

      if (filters.search) {
        query.$or = [
          { customer_name: { $regex: filters.search, $options: 'i' } },
          { email: { $regex: filters.search, $options: 'i' } },
        ];
      }

      const result = await customerRepository.findWithPagination(query, pagination);

      return result;
    } catch (error) {
      logger.error('List customers failed:', error);
      throw new InternalError('Failed to list customers');
    }
  }

  async getCustomerById(customerId: string): Promise<ICustomer> {
    try {
      const customer = await customerRepository.findById(customerId);

      if (!customer) {
        throw new NotFoundError('Customer not found');
      }

      return customer;
    } catch (error) {
      if (error instanceof NotFoundError) {
        throw error;
      }
      logger.error('Get customer failed:', error);
      throw new InternalError('Failed to get customer');
    }
  }

  async updateCustomer(
    customerId: string,
    data: UpdateCustomerInput,
    modifiedBy: string
  ): Promise<ICustomer> {
    try {
      const customer = await customerRepository.findById(customerId);

      if (!customer) {
        throw new NotFoundError('Customer not found');
      }

      // Check if email is being changed and if it's already taken
      if (data.email && data.email !== customer.email) {
        const existingCustomer = await customerRepository.findByEmail(data.email);
        if (existingCustomer) {
          throw new ConflictError('Email already in use');
        }
      }

      // Check if name is being changed and if it's already taken
      if (data.customer_name && data.customer_name !== customer.customer_name) {
        const existingCustomerByName = await customerRepository.findOne({ customer_name: data.customer_name });
        if (existingCustomerByName) {
          throw new ConflictError('Customer name already in use');
        }
      }

      const updatedCustomer = await customerRepository.updateById(customerId, {
        ...data,
        last_modified_date: new Date(),
        last_modified_by: new Types.ObjectId(modifiedBy),
      });

      if (!updatedCustomer) {
        throw new NotFoundError('Customer not found');
      }

      logger.info(`Customer updated: ${customerId} by ${modifiedBy}`);

      return updatedCustomer;
    } catch (error) {
      if (
        error instanceof NotFoundError ||
        error instanceof ConflictError ||
        error instanceof ValidationError
      ) {
        throw error;
      }
      logger.error('Update customer failed:', error);
      throw new InternalError('Failed to update customer');
    }
  }

  async deleteCustomer(customerId: string, deletedBy: string): Promise<void> {
    try {
      const customer = await customerRepository.findById(customerId);

      if (!customer) {
        throw new NotFoundError('Customer not found');
      }

      // Soft delete
      await customerRepository.softDelete(customerId);

      logger.info(`Customer deleted: ${customerId} by ${deletedBy}`);
    } catch (error) {
      if (error instanceof NotFoundError) {
        throw error;
      }
      logger.error('Delete customer failed:', error);
      throw new InternalError('Failed to delete customer');
    }
  }

  async searchCustomers(searchTerm: string): Promise<ICustomer[]> {
    try {
      const customers = await customerRepository.searchByName(searchTerm);
      return customers;
    } catch (error) {
      logger.error('Search customers failed:', error);
      throw new InternalError('Failed to search customers');
    }
  }
}

export const customerService = new CustomerService();
