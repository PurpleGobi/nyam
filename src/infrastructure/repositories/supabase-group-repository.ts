import { createClient } from '@/infrastructure/supabase/client'
import type { Group, GroupMembership, GroupEntryRequirements, GroupType, GroupRole } from '@/domain/entities/group'
import type { GroupRepository } from '@/domain/repositories/group-repository'
import type { Database } from '@/infrastructure/supabase/types'

type GroupRow = Database['public']['Tables']['groups']['Row']
type MembershipRow = Database['public']['Tables']['group_memberships']['Row']

function toGroup(row: GroupRow, memberCount?: number): Group {
  const reqs = (row.entry_requirements ?? {}) as Record<string, unknown>

  return {
    id: row.id,
    name: row.name,
    description: row.description,
    type: row.type as GroupType,
    ownerId: row.owner_id,
    entryRequirements: {
      minLevel: (reqs.min_level as number) ?? null,
      minRecords: (reqs.min_records as number) ?? null,
      minCategory: (reqs.min_category as string) ?? null,
      minRegion: (reqs.min_region as string) ?? null,
      minFrequency: (reqs.min_frequency as number) ?? null,
      requiresApproval: (reqs.requires_approval as boolean) ?? false,
    } satisfies GroupEntryRequirements,
    memberCount: memberCount ?? 0,
    createdAt: row.created_at,
  }
}

function toMembership(row: MembershipRow): GroupMembership {
  return {
    groupId: row.group_id,
    userId: row.user_id,
    role: row.role as GroupRole,
    joinedAt: row.joined_at,
  }
}

export class SupabaseGroupRepository implements GroupRepository {
  async getById(id: string): Promise<Group | null> {
    const supabase = createClient()

    const { data, error } = await supabase
      .from('groups')
      .select('*')
      .eq('id', id)
      .single()

    if (error || !data) return null

    const countResult = await supabase
      .from('group_memberships')
      .select('user_id', { count: 'exact', head: true })
      .eq('group_id', id)

    return toGroup(data as GroupRow, countResult.count ?? 0)
  }

  async getByUserId(userId: string): Promise<Group[]> {
    const supabase = createClient()
    const memResult = await supabase
      .from('group_memberships')
      .select('group_id')
      .eq('user_id', userId)

    if (memResult.error || !memResult.data || memResult.data.length === 0) return []

    const groupIds = (memResult.data as { group_id: string }[]).map((m) => m.group_id)
    const { data, error } = await supabase
      .from('groups')
      .select('*')
      .in('id', groupIds)

    if (error || !data) return []

    const groupRows = data as GroupRow[]
    const counts = await Promise.all(
      groupRows.map(async (g) => {
        const { count } = await supabase
          .from('group_memberships')
          .select('user_id', { count: 'exact', head: true })
          .eq('group_id', g.id)
        return { id: g.id, count: count ?? 0 }
      }),
    )
    const countMap = new Map(counts.map((c) => [c.id, c.count]))

    return groupRows.map((row) => toGroup(row, countMap.get(row.id) ?? 0))
  }

  async create(
    group: Omit<Group, 'id' | 'createdAt' | 'memberCount'>,
  ): Promise<Group> {
    const supabase = createClient()

    const insertData: Database['public']['Tables']['groups']['Insert'] = {
      name: group.name,
      description: group.description,
      type: group.type as Database['public']['Tables']['groups']['Insert']['type'],
      owner_id: group.ownerId,
      entry_requirements: {
        min_level: group.entryRequirements.minLevel,
        min_records: group.entryRequirements.minRecords,
        min_category: group.entryRequirements.minCategory,
        min_region: group.entryRequirements.minRegion,
        min_frequency: group.entryRequirements.minFrequency,
        requires_approval: group.entryRequirements.requiresApproval,
      },
    }

    const { data, error } = await supabase
      .from('groups')
      .insert(insertData)
      .select()
      .single()

    if (error || !data) {
      throw new Error(error?.message ?? 'Failed to create group')
    }

    const groupData = data as GroupRow

    const memberInsert: Database['public']['Tables']['group_memberships']['Insert'] = {
      group_id: groupData.id,
      user_id: group.ownerId,
      role: 'owner',
      status: 'active',
    }

    const { error: memberError } = await supabase
      .from('group_memberships')
      .insert(memberInsert)

    if (memberError) {
      throw new Error(memberError.message)
    }

    return toGroup(groupData, 1)
  }

  async getMembers(groupId: string): Promise<GroupMembership[]> {
    const supabase = createClient()
    const { data, error } = await supabase
      .from('group_memberships')
      .select('*')
      .eq('group_id', groupId)

    if (error || !data) return []
    return (data as MembershipRow[]).map(toMembership)
  }

  async join(
    groupId: string,
    userId: string,
  ): Promise<GroupMembership> {
    const supabase = createClient()

    const insertData: Database['public']['Tables']['group_memberships']['Insert'] = {
      group_id: groupId,
      user_id: userId,
      role: 'member',
      status: 'active',
    }

    const { data, error } = await supabase
      .from('group_memberships')
      .insert(insertData)
      .select()
      .single()

    if (error || !data) {
      throw new Error(error?.message ?? 'Failed to join group')
    }

    return toMembership(data as MembershipRow)
  }

  async leave(groupId: string, userId: string): Promise<void> {
    const supabase = createClient()
    const { error } = await supabase
      .from('group_memberships')
      .delete()
      .eq('group_id', groupId)
      .eq('user_id', userId)

    if (error) {
      throw new Error(error.message)
    }
  }
}
