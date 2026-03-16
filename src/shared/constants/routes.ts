export const ROUTES = {
  HOME: "/",
  DISCOVER: "/discover",
  GROUPS: "/groups",
  PROFILE: "/profile",
  RECORD: "/record",
  NOTIFICATIONS: "/notifications",
} as const

export type Route = (typeof ROUTES)[keyof typeof ROUTES]
