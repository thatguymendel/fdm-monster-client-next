import { reactive, computed } from 'vue'

export interface CameraSettings {
  flipH: boolean
  flipV: boolean
  rotate: 0 | 90 | 180 | 270
}

const defaultSettings = (): CameraSettings => ({ flipH: false, flipV: false, rotate: 0 })

// module-level reactive map — shared between shell (reads transform) and settings tab (writes)
const settingsMap = reactive<Record<number, CameraSettings>>({})

function storageKey(printerId: number) {
  return `camera-settings-${printerId}`
}

function persist(printerId: number) {
  localStorage.setItem(storageKey(printerId), JSON.stringify(settingsMap[printerId]))
}

export function useCameraSettings(printerId: number) {
  if (!settingsMap[printerId]) {
    try {
      const stored = localStorage.getItem(storageKey(printerId))
      settingsMap[printerId] = stored ? JSON.parse(stored) : defaultSettings()
    } catch {
      settingsMap[printerId] = defaultSettings()
    }
  }

  const settings = computed(() => settingsMap[printerId] ?? defaultSettings())

  const cameraTransform = computed(() => {
    const s = settingsMap[printerId]
    if (!s) return ''
    const parts: string[] = []
    if (s.flipH) parts.push('scaleX(-1)')
    if (s.flipV) parts.push('scaleY(-1)')
    if (s.rotate) parts.push(`rotate(${s.rotate}deg)`)
    return parts.join(' ')
  })

  function update(partial: Partial<CameraSettings>) {
    settingsMap[printerId] = { ...(settingsMap[printerId] ?? defaultSettings()), ...partial }
    persist(printerId)
  }

  return { settings, cameraTransform, update }
}
