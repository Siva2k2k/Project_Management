import { Types } from 'mongoose';
import { User } from '../models';
import { IUser, UserRole } from '../types';
import { BaseRepository } from './BaseRepository';

export class UserRepository extends BaseRepository<IUser> {
  constructor() {
    super(User);
  }

  async findByEmail(email: string): Promise<IUser | null> {
    return this.model.findOne({ email: email.toLowerCase() }).select('+password');
  }

  async findByEmailWithoutPassword(email: string): Promise<IUser | null> {
    return this.model.findOne({ email: email.toLowerCase() });
  }

  async findOne(query: Record<string, unknown>): Promise<IUser | null> {
    return this.model
      .findOne(query)
      .select('+verification_token +verification_token_expires +password_reset_token +password_reset_expires');
  }

  async findByRole(role: UserRole): Promise<IUser[]> {
    return this.model.find({ role });
  }

  async findManagers(): Promise<IUser[]> {
    return this.model.find({ role: { $in: [UserRole.MANAGER, UserRole.CEO] } });
  }

  async findActiveUsers(): Promise<IUser[]> {
    return this.model.find({ is_active: true });
  }

  async updateRefreshToken(
    userId: string | Types.ObjectId,
    token: string,
    expires: Date
  ): Promise<IUser | null> {
    return this.model.findByIdAndUpdate(
      userId,
      {
        $set: {
          refresh_token: { token, expires, createdAt: new Date() },
        },
      },
      { new: true }
    );
  }

  async removeRefreshToken(
    userId: string | Types.ObjectId
  ): Promise<IUser | null> {
    return this.model.findByIdAndUpdate(
      userId,
      {
        $unset: { refresh_token: '' },
      },
      { new: true }
    );
  }

  async removeAllRefreshTokens(userId: string | Types.ObjectId): Promise<IUser | null> {
    return this.model.findByIdAndUpdate(
      userId,
      { $unset: { refresh_token: '' } },
      { new: true }
    );
  }

  async cleanExpiredTokens(userId: string | Types.ObjectId): Promise<IUser | null> {
    const user = await this.model.findById(userId);
    if (user && user.refresh_token && user.refresh_token.expires < new Date()) {
      return this.model.findByIdAndUpdate(
        userId,
        { $unset: { refresh_token: '' } },
        { new: true }
      );
    }
    return user;
  }

  async deactivateUser(userId: string | Types.ObjectId): Promise<IUser | null> {
    return this.model.findByIdAndUpdate(
      userId,
      { is_active: false, last_modified_date: new Date() },
      { new: true }
    );
  }

  async activateUser(userId: string | Types.ObjectId): Promise<IUser | null> {
    return this.model.findByIdAndUpdate(
      userId,
      { is_active: true, last_modified_date: new Date() },
      { new: true }
    );
  }
}

export const userRepository = new UserRepository();
