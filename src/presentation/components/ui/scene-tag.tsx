'use client'

type Scene = 'solo' | 'romantic' | 'friends' | 'family' | 'business' | 'drinks'

const SCENE_LABELS: Record<Scene, string> = {
  solo: '혼밥/혼술',
  romantic: '데이트',
  friends: '친구/모임',
  family: '가족',
  business: '회식/접대',
  drinks: '술자리',
}

interface SceneTagProps {
  scene: Scene
  chip?: boolean
}

export function SceneTag({ scene, chip }: SceneTagProps) {
  return (
    <span
      className={chip ? 'tag-chip' : 'scene-tag'}
      style={{ backgroundColor: `var(--scene-${scene})` }}
    >
      {SCENE_LABELS[scene]}
    </span>
  )
}
