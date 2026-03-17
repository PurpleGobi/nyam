import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/infrastructure/supabase/server'

/**
 * POST /api/groups/invite
 * Generate an invite link for a group.
 * Body: { groupId: string }
 * Returns: { inviteUrl: string }
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body: unknown = await request.json()
    if (!body || typeof body !== 'object' || !('groupId' in body)) {
      return NextResponse.json({ error: 'groupId is required' }, { status: 400 })
    }

    const { groupId } = body as { groupId: string }
    if (typeof groupId !== 'string' || groupId.length === 0) {
      return NextResponse.json({ error: 'Invalid groupId' }, { status: 400 })
    }

    // Verify the user is the group owner
    const { data: group, error: groupError } = await supabase
      .from('groups')
      .select('id, owner_id')
      .eq('id', groupId)
      .single()

    if (groupError || !group) {
      return NextResponse.json({ error: 'Group not found' }, { status: 404 })
    }

    if (group.owner_id !== user.id) {
      return NextResponse.json({ error: 'Only group owner can generate invite links' }, { status: 403 })
    }

    // Encode groupId as base64 token
    const token = Buffer.from(groupId).toString('base64url')
    const origin = request.nextUrl.origin
    const inviteUrl = `${origin}/groups/join?token=${token}`

    return NextResponse.json({ inviteUrl })
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * GET /api/groups/invite?token=...
 * Decode invite token and return group info.
 */
export async function GET(request: NextRequest) {
  try {
    const token = request.nextUrl.searchParams.get('token')
    if (!token) {
      return NextResponse.json({ error: 'Token is required' }, { status: 400 })
    }

    let groupId: string
    try {
      groupId = Buffer.from(token, 'base64url').toString('utf-8')
    } catch {
      return NextResponse.json({ error: 'Invalid token' }, { status: 400 })
    }

    if (!groupId || groupId.length === 0) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 400 })
    }

    const supabase = await createClient()

    const { data: group, error: groupError } = await supabase
      .from('groups')
      .select('id, name, description, type')
      .eq('id', groupId)
      .single()

    if (groupError || !group) {
      return NextResponse.json({ error: 'Group not found' }, { status: 404 })
    }

    const { count } = await supabase
      .from('group_memberships')
      .select('user_id', { count: 'exact', head: true })
      .eq('group_id', groupId)

    return NextResponse.json({
      group: {
        id: group.id,
        name: group.name,
        description: group.description,
        type: group.type,
        memberCount: count ?? 0,
      },
    })
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
