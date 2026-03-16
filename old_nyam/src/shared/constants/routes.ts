/**
 * Application route paths for the 5-tab navigation and other screens.
 */

export const ROUTES = {
  /** Home tab */
  HOME: "/",
  /** Explore/search tab */
  EXPLORE: "/explore",
  /** Prompts tab */
  PROMPTS: "/prompts",
  /** Activity/badges tab */
  ACTIVITY: "/activity",
  /** Profile tab */
  PROFILE: "/profile",
  /** Restaurant detail (dynamic) */
  RESTAURANT_DETAIL: "/restaurant/[id]",
  /** Auth login */
  AUTH_LOGIN: "/auth/login",
} as const;

export type RoutePath = (typeof ROUTES)[keyof typeof ROUTES];
