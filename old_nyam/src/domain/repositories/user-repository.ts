import type { User, UserStats } from "@/domain/entities/user"

export interface UserRepository {
  getCurrentUser(): Promise<User | null>
  getUserById(id: string): Promise<User | null>
  getUserStats(userId: string): Promise<UserStats | null>
  updateNickname(userId: string, nickname: string): Promise<void>
  updateAvatar(userId: string, avatarUrl: string): Promise<void>
}
