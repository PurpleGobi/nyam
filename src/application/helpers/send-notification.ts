import { notificationRepo } from '@/shared/di/container'
import { getNotifySettingField } from '@/domain/entities/notification'
import type { Notification } from '@/domain/entities/notification'

type CreateNotificationInput = Omit<Notification, 'id' | 'createdAt' | 'isRead'>

/**
 * 수신자의 알림 설정을 확인한 뒤 알림을 생성한다.
 * - notifyPush(마스터)가 꺼져 있으면 모든 알림 차단
 * - 개별 설정(notifyLevelUp/notifyBubbleJoin/notifyFollow)이 꺼져 있으면 해당 유형 차단
 * - 설정 조회 실패 시 기본값(모두 허용)으로 fallback → 알림 생성
 */
export async function sendNotification(input: CreateNotificationInput): Promise<void> {
  const prefs = await notificationRepo.getNotifyPreferences(input.userId)

  // 마스터 토글 OFF → 전부 차단
  if (!prefs.notifyPush) return

  // 개별 설정 확인
  const field = getNotifySettingField(input.type)
  if (field && !prefs[field]) return

  await notificationRepo.createNotification(input)
}
