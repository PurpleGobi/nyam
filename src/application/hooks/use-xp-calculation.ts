'use client'

import { useCallback } from 'react'
import type { DiningRecord } from '@/domain/entities/record'
import type { XpCalculationResult, LevelThreshold, DetailAxisGain } from '@/domain/entities/xp'
import {
  calculateRecordXp, getRecordXpReason, calculateDetailAxisXp,
  getCategoryForAxisType, getLevel, isDuplicateScoreBlocked,
  isDailyRecordCapReached, checkMilestoneReached,
} from '@/domain/services/xp-calculator'
import { xpRepo } from '@/shared/di/container'

/**
 * XP 계산 + 적립 오케스트레이션 hook.
 *
 * 기록 저장 시 호출 순서:
 * 0. 일일 기록 상한 체크
 * 1. 기록 품질 → XP 산출
 * 2. 같은 식당/와인 점수 6개월 제한 체크
 * 3. 종합 XP 적립
 * 4. 세부 축 XP 적립 (+5, 종합 미포함)
 * 5. 카테고리 XP 갱신 (세부 축 합산)
 * 6. 마일스톤 체크
 * 7. 종합 레벨 체크 → 레벨업 알림
 */
export function useXpCalculation() {
  const processRecordXp = useCallback(async (
    userId: string,
    record: DiningRecord,
    restaurantArea: string | null,
    restaurantGenre: string | null,
    wineRegion: string | null,
    wineVariety: string | null,
    thresholds: LevelThreshold[],
  ): Promise<XpCalculationResult> => {
    const result: XpCalculationResult = {
      totalXpGain: 0,
      detailAxisGains: [],
      categoryUpdates: [],
      milestoneAchieved: [],
      levelUps: [],
    }

    // ── Step 0: 일일 기록 상한 체크 ──
    const today = new Date().toISOString().split('T')[0]
    const dailyCount = await xpRepo.getDailyRecordCount(userId, today)
    if (isDailyRecordCapReached(dailyCount)) {
      return result
    }

    // ── Step 1: 기록 품질 → XP 산출 ──
    let recordXp = calculateRecordXp(record)
    const reason = getRecordXpReason(recordXp)

    // ── Step 2: 같은 식당/와인 점수 6개월 제한 ──
    if (recordXp >= 3) {
      const lastScore = await xpRepo.getLastScoreDate(userId, record.targetId)
      if (isDuplicateScoreBlocked(lastScore)) {
        recordXp = 0
      }
    }

    // ── Step 3: 종합 XP 적립 ──
    if (recordXp > 0) {
      result.totalXpGain = recordXp
      await xpRepo.updateUserTotalXp(userId, recordXp)
      await xpRepo.createXpHistory({
        userId,
        recordId: record.id,
        axisType: null,
        axisValue: null,
        xpAmount: recordXp,
        reason,
      })
    }

    // ── Step 4: 세부 축 XP 적립 ──
    const axisGains = calculateDetailAxisXp(record, restaurantArea, restaurantGenre, wineRegion, wineVariety)
    for (const gain of axisGains) {
      const existing = await xpRepo.getUserExperience(userId, gain.axisType, gain.axisValue)
      const newXp = (existing?.totalXp ?? 0) + gain.xp
      const levelInfo = getLevel(newXp, thresholds)
      const previousLevel = existing?.level ?? 1

      await xpRepo.upsertUserExperience(userId, gain.axisType, gain.axisValue, gain.xp, levelInfo.level)
      await xpRepo.createXpHistory({
        userId,
        recordId: record.id,
        axisType: gain.axisType,
        axisValue: gain.axisValue,
        xpAmount: gain.xp,
        reason: 'detail_axis',
      })

      result.detailAxisGains.push(gain)

      if (levelInfo.level > previousLevel) {
        result.levelUps.push({
          scope: 'detail',
          axisType: gain.axisType,
          axisValue: gain.axisValue,
          previousLevel,
          newLevel: levelInfo.level,
          title: levelInfo.title,
          color: levelInfo.color,
        })
      }
    }

    // ── Step 5: 카테고리 XP 갱신 ──
    const categoryMap = new Map<string, number>()
    for (const gain of axisGains) {
      const cat = getCategoryForAxisType(gain.axisType)
      if (cat) {
        categoryMap.set(cat, (categoryMap.get(cat) ?? 0) + gain.xp)
      }
    }
    for (const [catValue, xpDelta] of categoryMap) {
      const existing = await xpRepo.getUserExperience(userId, 'category', catValue)
      const newXp = (existing?.totalXp ?? 0) + xpDelta
      const levelInfo = getLevel(newXp, thresholds)
      const previousLevel = existing?.level ?? 1

      await xpRepo.upsertUserExperience(userId, 'category', catValue, xpDelta, levelInfo.level)

      result.categoryUpdates.push({ categoryValue: catValue as 'restaurant' | 'wine', newTotalXp: newXp })

      if (levelInfo.level > previousLevel) {
        result.levelUps.push({
          scope: 'category',
          axisType: 'category',
          axisValue: catValue,
          previousLevel,
          newLevel: levelInfo.level,
          title: levelInfo.title,
          color: levelInfo.color,
        })
      }
    }

    // ── Step 6: 마일스톤 체크 ──
    for (const gain of axisGains) {
      const uniqueCount = await xpRepo.getUniqueCount(userId, gain.axisType, gain.axisValue)
      const milestones = await xpRepo.getMilestonesByAxisType(gain.axisType)

      for (const ms of milestones) {
        if (checkMilestoneReached(uniqueCount, ms)) {
          const already = await xpRepo.hasAchievedMilestone(userId, ms.id, gain.axisValue)
          if (!already) {
            await xpRepo.createUserMilestone(userId, ms.id, gain.axisValue)
            await xpRepo.updateUserTotalXp(userId, ms.xpReward)
            await xpRepo.createXpHistory({
              userId,
              recordId: record.id,
              axisType: gain.axisType,
              axisValue: gain.axisValue,
              xpAmount: ms.xpReward,
              reason: 'milestone',
            })
            result.totalXpGain += ms.xpReward
            result.milestoneAchieved.push({ milestone: ms, axisValue: gain.axisValue })
          }
        }
      }
    }

    // ── Step 7: 종합 레벨 체크 ──
    // 종합 레벨은 users.total_xp 기반 → 호출측에서 레벨업 알림 생성

    return result
  }, [])

  return { processRecordXp }
}
