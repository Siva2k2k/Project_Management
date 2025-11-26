import { Model, Document, FilterQuery, UpdateQuery, Types } from 'mongoose';
import { PaginationQuery } from '../types';

export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export class BaseRepository<T extends Document> {
  protected model: Model<T>;

  constructor(model: Model<T>) {
    this.model = model;
  }

  async create(data: Partial<T>): Promise<T> {
    const document = new this.model(data);
    return document.save();
  }

  async findById(id: string | Types.ObjectId): Promise<T | null> {
    return this.model.findById(id);
  }

  async findOne(filter: FilterQuery<T>): Promise<T | null> {
    return this.model.findOne(filter);
  }

  async find(filter: FilterQuery<T> = {}): Promise<T[]> {
    return this.model.find(filter);
  }

  async findWithPagination(
    filter: FilterQuery<T> = {},
    options: PaginationQuery = {}
  ): Promise<PaginatedResult<T>> {
    const { page = 1, limit = 10, sort = 'createdAt', order = 'desc' } = options;
    const skip = (page - 1) * limit;
    const sortOrder = order === 'asc' ? 1 : -1;

    // Add is_deleted: false to filter if not already specified
    const queryFilter: FilterQuery<T> = { 
      ...filter,
      ...(!('is_deleted' in filter) && { is_deleted: false })
    } as FilterQuery<T>;

    const [data, total] = await Promise.all([
      this.model
        .find(queryFilter)
        .sort({ [sort]: sortOrder })
        .skip(skip)
        .limit(limit),
      this.model.countDocuments(queryFilter),
    ]);

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async updateById(id: string | Types.ObjectId, data: UpdateQuery<T>): Promise<T | null> {
    return this.model.findByIdAndUpdate(id, data, { new: true, runValidators: true });
  }

  async updateOne(filter: FilterQuery<T>, data: UpdateQuery<T>): Promise<T | null> {
    return this.model.findOneAndUpdate(filter, data, { new: true, runValidators: true });
  }

  async deleteById(id: string | Types.ObjectId): Promise<T | null> {
    return this.model.findByIdAndDelete(id);
  }

  async softDelete(id: string | Types.ObjectId): Promise<T | null> {
    return this.model.findByIdAndUpdate(
      id,
      { is_deleted: true, last_modified_date: new Date() } as UpdateQuery<T>,
      { new: true }
    );
  }

  async count(filter: FilterQuery<T> = {}): Promise<number> {
    return this.model.countDocuments(filter);
  }

  async exists(filter: FilterQuery<T>): Promise<boolean> {
    const doc = await this.model.exists(filter);
    return doc !== null;
  }
}
