export type GroupType = 'private' | 'public' | 'viewonly' | 'paid'

export type GroupRole = 'owner' | 'admin' | 'member'

export interface GroupEntryRequirements {
  minLevel: number | null
  minRecords: number | null
  minCategory: string | null
  minRegion: string | null
  minFrequency: number | null
  requiresApproval: boolean
}

export interface Group {
  id: string
  name: string
  description: string | null
  type: GroupType
  ownerId: string
  entryRequirements: GroupEntryRequirements
  memberCount: number
  createdAt: string
}

export interface GroupMembership {
  groupId: string
  userId: string
  role: GroupRole
  joinedAt: string
}

export interface RecordShare {
  id: string
  recordId: string
  groupId: string
  sharedByUserId: string
  sharedAt: string
}
