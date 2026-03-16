import type { User, UserStats } from '../entities/user'

export interface UserRepository {
  getById(id: string): Promise<User | null>
  getStats(userId: string): Promise<UserStats | null>
  updateProfile(userId: string, profile: Partial<Pick<User, 'nickname' | 'avatarUrl'>>): Promise<User>
}
