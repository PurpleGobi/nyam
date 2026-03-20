import type { Group, GroupMembership, GroupWithStats } from "@/domain/entities/group"

export interface CreateGroupInput {
  name: string
  description?: string
  accessType?: "private" | "public"
  sharingType?: "interactive" | "view_only"
}

export interface GroupRepository {
  getById(id: string): Promise<GroupWithStats | null>
  getMyGroups(userId: string): Promise<GroupWithStats[]>
  getPublicGroups(limit?: number): Promise<GroupWithStats[]>
  create(ownerId: string, input: CreateGroupInput): Promise<Group>
  join(groupId: string, userId: string): Promise<GroupMembership>
  leave(groupId: string, userId: string): Promise<void>
  getMembers(groupId: string): Promise<GroupMembership[]>
  getByInviteCode(code: string): Promise<Group | null>
  generateInviteCode(groupId: string): Promise<string>
}
