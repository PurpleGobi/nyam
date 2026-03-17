"use client"

import useSWR from "swr"
import { useCallback } from "react"
import { createClient } from "@/infrastructure/supabase/client"

export interface Notification {
  id: string
  userId: string
  actorId: string | null
  type: "reaction" | "share" | "group_invite" | "level_up" | "streak" | "comparison_complete"
  targetType: "record" | "group" | "comparison" | null
  targetId: string | null
  title: string | null
  body: string | null
  metadata: Record<string, unknown> | null
  isRead: boolean
  readAt: string | null
  createdAt: string
}

function mapDbNotification(data: Record<string, unknown>): Notification {
  return {
    id: data.id as string,
    userId: data.user_id as string,
    actorId: data.actor_id as string | null,
    type: data.type as Notification["type"],
    targetType: data.target_type as Notification["targetType"],
    targetId: data.target_id as string | null,
    title: data.title as string | null,
    body: data.body as string | null,
    metadata: data.metadata as Record<string, unknown> | null,
    isRead: data.is_read as boolean,
    readAt: data.read_at as string | null,
    createdAt: data.created_at as string,
  }
}

export function useNotifications() {
  const supabase = createClient()

  const { data, error, isLoading, mutate } = useSWR<Notification[]>(
    "notifications",
    async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return []

      const { data: rows, error: fetchError } = await supabase
        .from("notifications")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(50)

      if (fetchError) throw new Error(`Failed to fetch notifications: ${fetchError.message}`)
      return (rows ?? []).map(mapDbNotification)
    },
  )

  const markAsRead = useCallback(
    async (notificationId: string) => {
      const { error: updateError } = await supabase
        .from("notifications")
        .update({ is_read: true, read_at: new Date().toISOString() })
        .eq("id", notificationId)

      if (updateError) throw new Error(`Failed to mark notification as read: ${updateError.message}`)
      await mutate()
    },
    [supabase, mutate],
  )

  const markAllAsRead = useCallback(
    async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { error: updateError } = await supabase
        .from("notifications")
        .update({ is_read: true, read_at: new Date().toISOString() })
        .eq("user_id", user.id)
        .eq("is_read", false)

      if (updateError) throw new Error(`Failed to mark all notifications as read: ${updateError.message}`)
      await mutate()
    },
    [supabase, mutate],
  )

  const unreadCount = (data ?? []).filter((n) => !n.isRead).length

  return {
    notifications: data ?? [],
    unreadCount,
    isLoading,
    error: error ? String(error) : null,
    mutate,
    markAsRead,
    markAllAsRead,
  }
}
