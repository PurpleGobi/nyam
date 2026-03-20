import { createClient } from "@/infrastructure/supabase/client"
import type { Group, GroupMembership, GroupWithStats } from "@/domain/entities/group"
import type { GroupRepository, CreateGroupInput } from "@/domain/repositories/group-repository"

function mapDbGroup(data: Record<string, unknown>): Group {
  return {
    id: data.id as string,
    name: data.name as string,
    description: data.description as string | null,
    ownerId: data.owner_id as string,
    accessType: data.access_type as "private" | "public",
    sharingType: data.sharing_type as "interactive" | "view_only",
    isPaid: data.is_paid as boolean,
    priceMonthly: data.price_monthly as number | null,
    trialDays: data.trial_days as number | null,
    entryRequirements: data.entry_requirements as Record<string, unknown> | null,
    inviteCode: data.invite_code as string | null,
    isActive: data.is_active as boolean,
    createdAt: data.created_at as string,
  }
}

export class SupabaseGroupRepository implements GroupRepository {
  private supabase = createClient()

  async getById(id: string): Promise<GroupWithStats | null> {
    const { data, error } = await this.supabase
      .from("groups")
      .select("*, group_stats(*)")
      .eq("id", id)
      .single()

    if (error || !data) return null
    const stats = data.group_stats as Record<string, unknown> | null
    return {
      ...mapDbGroup(data),
      stats: stats ? {
        groupId: stats.group_id as string,
        memberCount: stats.member_count as number,
        recordCount: stats.record_count as number,
        recordsThisWeek: stats.records_this_week as number,
        activityScore: stats.activity_score as number,
        overallScore: stats.overall_score as number,
        updatedAt: stats.updated_at as string,
      } : null,
      memberCount: (stats?.member_count as number) ?? 0,
    }
  }

  async getMyGroups(userId: string): Promise<GroupWithStats[]> {
    const { data: memberships } = await this.supabase
      .from("group_memberships")
      .select("group_id")
      .eq("user_id", userId)
      .eq("status", "active")

    if (!memberships?.length) return []

    const groupIds = memberships.map((m) => m.group_id)
    const { data } = await this.supabase
      .from("groups")
      .select("*, group_stats(*)")
      .in("id", groupIds)
      .eq("is_active", true)

    return (data ?? []).map((g) => {
      const stats = g.group_stats as Record<string, unknown> | null
      return {
        ...mapDbGroup(g),
        stats: stats ? {
          groupId: stats.group_id as string,
          memberCount: stats.member_count as number,
          recordCount: stats.record_count as number,
          recordsThisWeek: stats.records_this_week as number,
          activityScore: stats.activity_score as number,
          overallScore: stats.overall_score as number,
          updatedAt: stats.updated_at as string,
        } : null,
        memberCount: (stats?.member_count as number) ?? 0,
      }
    })
  }

  async getPublicGroups(limit = 20): Promise<GroupWithStats[]> {
    const { data } = await this.supabase
      .from("groups")
      .select("*, group_stats(*)")
      .eq("access_type", "public")
      .eq("is_active", true)
      .limit(limit)

    return (data ?? []).map((g) => {
      const stats = g.group_stats as Record<string, unknown> | null
      return {
        ...mapDbGroup(g),
        stats: stats ? {
          groupId: stats.group_id as string,
          memberCount: stats.member_count as number,
          recordCount: stats.record_count as number,
          recordsThisWeek: stats.records_this_week as number,
          activityScore: stats.activity_score as number,
          overallScore: stats.overall_score as number,
          updatedAt: stats.updated_at as string,
        } : null,
        memberCount: (stats?.member_count as number) ?? 0,
      }
    })
  }

  async create(ownerId: string, input: CreateGroupInput): Promise<Group> {
    const { data, error } = await this.supabase
      .from("groups")
      .insert({
        name: input.name,
        description: input.description ?? null,
        owner_id: ownerId,
        access_type: input.accessType ?? "private",
        sharing_type: input.sharingType ?? "interactive",
      })
      .select()
      .single()

    if (error) throw new Error(`Failed to create group: ${error.message}`)

    // Auto-join as owner
    await this.supabase.from("group_memberships").insert({
      group_id: data.id,
      user_id: ownerId,
      role: "owner",
      status: "active",
    })

    return mapDbGroup(data)
  }

  async join(groupId: string, userId: string): Promise<GroupMembership> {
    const { data, error } = await this.supabase
      .from("group_memberships")
      .insert({
        group_id: groupId,
        user_id: userId,
        role: "member",
        status: "active",
      })
      .select()
      .single()

    if (error) throw new Error(`Failed to join group: ${error.message}`)
    return {
      groupId: data.group_id,
      userId: data.user_id,
      role: data.role,
      status: data.status,
      joinedAt: data.joined_at,
    }
  }

  async leave(groupId: string, userId: string): Promise<void> {
    const { error } = await this.supabase
      .from("group_memberships")
      .delete()
      .eq("group_id", groupId)
      .eq("user_id", userId)

    if (error) throw new Error(`Failed to leave group: ${error.message}`)
  }

  async getMembers(groupId: string): Promise<GroupMembership[]> {
    const { data } = await this.supabase
      .from("group_memberships")
      .select("*")
      .eq("group_id", groupId)
      .eq("status", "active")

    return (data ?? []).map((m) => ({
      groupId: m.group_id,
      userId: m.user_id,
      role: m.role,
      status: m.status,
      joinedAt: m.joined_at,
    }))
  }

  async getByInviteCode(code: string): Promise<Group | null> {
    const { data, error } = await this.supabase
      .from("groups")
      .select("*")
      .eq("invite_code", code)
      .single()

    if (error || !data) return null
    return mapDbGroup(data)
  }

  async generateInviteCode(groupId: string): Promise<string> {
    const code = crypto.randomUUID().slice(0, 8)
    const { error } = await this.supabase
      .from("groups")
      .update({ invite_code: code })
      .eq("id", groupId)

    if (error) throw new Error(`Failed to generate invite code: ${error.message}`)
    return code
  }
}
