import { storage } from './storage';
import type { User } from '@shared/schema';

export const userService = {
  async getUserById(id: number): Promise<User | undefined> {
    return await storage.getUser(id);
  },

  async getUserByEmail(email: string): Promise<User | undefined> {
    return await storage.getUserByEmail(email);
  },

  async getUserByGoogleId(googleId: string): Promise<User | undefined> {
    return await storage.getUserByGoogleId(googleId);
  }
};