export interface FriendFeedItem {
  id: string
  userId: string
  nickname: string
  avatarInitial: string
  avatarColor: string
  restaurantName: string
  comment: string | null
  ratingOverall: number
  area: string
  groupName: string
}
