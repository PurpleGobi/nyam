import type { Group, GroupMembership } from '../entities/group'

export interface GroupRepository {
  getById(id: string): Promise<Group | null>
  getByUserId(userId: string): Promise<Group[]>
  create(group: Omit<Group, 'id' | 'createdAt' | 'memberCount'>): Promise<Group>
  getMembers(groupId: string): Promise<GroupMembership[]>
  join(groupId: string, userId: string): Promise<GroupMembership>
  leave(groupId: string, userId: string): Promise<void>
}
