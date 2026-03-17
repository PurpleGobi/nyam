import type { GroupRole, MembershipStatus } from "@/infrastructure/supabase/types"

export interface Group {
  id: string
  name: string
  description: string | null
  ownerId: string
  accessType: "private" | "public"
  sharingType: "interactive" | "view_only"
  isPaid: boolean
  priceMonthly: number | null
  trialDays: number | null
  entryRequirements: Record<string, unknown> | null
  inviteCode: string | null
  isActive: boolean
  createdAt: string
}

export interface GroupMembership {
  groupId: string
  userId: string
  role: GroupRole
  status: MembershipStatus
  joinedAt: string
}

export interface GroupStats {
  groupId: string
  memberCount: number
  recordCount: number
  recordsThisWeek: number
  activityScore: number
  overallScore: number
  updatedAt: string
}

export interface GroupWithStats extends Group {
  stats: GroupStats | null
  memberCount: number
}
