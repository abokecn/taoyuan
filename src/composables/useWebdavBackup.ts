import { ref } from 'vue'
import { useSaveStore } from '@/stores/useSaveStore'
import { useSettingsStore } from '@/stores/useSettingsStore'
import { showFloat } from '@/composables/useGameLog'

const WEB_DAV_LAST_BACKUP_AT_KEY = 'taoyuan_webdav_last_backup_at'
const WEB_DAV_LAST_BACKUP_DAY_KEY = 'taoyuan_webdav_last_backup_day'

const isBackingUp = ref(false)
const isRestoring = ref(false)
const backupQueue = ref(Promise.resolve())
const lastRemoteBackupAt = ref(localStorage.getItem(WEB_DAV_LAST_BACKUP_AT_KEY) ?? '')

const getWebdavUrl = (endpoint: string, slot: number) => {
  const base = endpoint.trim().replace(/\/+$/, '')
  return `${base}/taoyuan_slot_${slot}.tyx`
}

const getAuthHeader = (username: string, password: string) => {
  return `Basic ${btoa(`${username}:${password}`)}`
}

const canUseWebdav = () => {
  const settingsStore = useSettingsStore()
  return !!(settingsStore.webdavEnabled && settingsStore.webdavEndpoint && settingsStore.webdavUsername && settingsStore.webdavPassword)
}

const backupSlotToWebdav = async (slot: number): Promise<boolean> => {
  const settingsStore = useSettingsStore()
  const saveStore = useSaveStore()
  const raw = saveStore.getRawSave(slot)
  if (!raw) return false

  const response = await fetch(getWebdavUrl(settingsStore.webdavEndpoint, slot), {
    method: 'PUT',
    headers: {
      Authorization: getAuthHeader(settingsStore.webdavUsername, settingsStore.webdavPassword),
      'Content-Type': 'application/octet-stream'
    },
    body: raw
  })

  if (!response.ok) return false

  const now = new Date().toISOString()
  lastRemoteBackupAt.value = now
  localStorage.setItem(WEB_DAV_LAST_BACKUP_AT_KEY, now)
  return true
}

const backupSlotWithRetry = async (slot: number, maxRetries = 3): Promise<boolean> => {
  let attempt = 0
  while (attempt < maxRetries) {
    attempt += 1
    try {
      const ok = await backupSlotToWebdav(slot)
      if (ok) return true
    } catch {
      // ignore and retry
    }
    if (attempt < maxRetries) {
      const waitMs = 800 * 2 ** (attempt - 1)
      await new Promise(resolve => setTimeout(resolve, waitMs))
    }
  }
  return false
}

const enqueueAutoBackup = (slot: number, daySerial?: number) => {
  if (!canUseWebdav()) return
  const settingsStore = useSettingsStore()

  const lastDaySerial = Number(localStorage.getItem(WEB_DAV_LAST_BACKUP_DAY_KEY) ?? '-1')
  if (typeof daySerial === 'number') {
    const interval = Math.max(1, Number(settingsStore.webdavBackupInterval || 1))
    if (daySerial - lastDaySerial < interval) return
  }

  backupQueue.value = backupQueue.value.then(async () => {
    isBackingUp.value = true
    const ok = await backupSlotWithRetry(slot, 3)
    isBackingUp.value = false
    if (ok) {
      showFloat('WebDAV 自动备份成功。', 'success')
      if (typeof daySerial === 'number') {
        localStorage.setItem(WEB_DAV_LAST_BACKUP_DAY_KEY, String(daySerial))
      }
    }
  })
}

const backupNow = async (): Promise<boolean> => {
  const saveStore = useSaveStore()
  if (!canUseWebdav()) {
    showFloat('请先在设置中启用并配置 WebDAV。', 'danger')
    return false
  }
  if (saveStore.activeSlot < 0) {
    showFloat('当前无可备份的存档槽位。', 'danger')
    return false
  }

  isBackingUp.value = true
  const ok = await backupSlotWithRetry(saveStore.activeSlot, 3)
  isBackingUp.value = false
  showFloat(ok ? '远程备份完成。' : '远程备份失败，请检查网络和 WebDAV 配置。', ok ? 'success' : 'danger')
  return ok
}

const restoreNow = async (): Promise<boolean> => {
  const settingsStore = useSettingsStore()
  const saveStore = useSaveStore()

  if (!canUseWebdav()) {
    showFloat('请先在设置中启用并配置 WebDAV。', 'danger')
    return false
  }
  if (saveStore.activeSlot < 0) {
    showFloat('当前无可恢复的存档槽位。', 'danger')
    return false
  }

  isRestoring.value = true
  try {
    const res = await fetch(getWebdavUrl(settingsStore.webdavEndpoint, saveStore.activeSlot), {
      method: 'GET',
      headers: {
        Authorization: getAuthHeader(settingsStore.webdavUsername, settingsStore.webdavPassword)
      }
    })
    if (!res.ok) {
      showFloat('远程恢复失败：未找到备份或鉴权失败。', 'danger')
      return false
    }
    const content = await res.text()
    if (!saveStore.importSave(saveStore.activeSlot, content)) {
      showFloat('远程恢复失败：备份内容无效。', 'danger')
      return false
    }
    const loaded = saveStore.loadFromSlot(saveStore.activeSlot)
    showFloat(loaded ? '远程恢复完成。' : '远程恢复后载入失败。', loaded ? 'success' : 'danger')
    return loaded
  } catch {
    showFloat('远程恢复失败：网络错误。', 'danger')
    return false
  } finally {
    isRestoring.value = false
  }
}

const checkRemoteNewerBackup = async (slot: number, localSavedAt?: string): Promise<{ hasRemote: boolean; isRemoteNewer: boolean }> => {
  const settingsStore = useSettingsStore()
  if (!canUseWebdav()) return { hasRemote: false, isRemoteNewer: false }

  try {
    const res = await fetch(getWebdavUrl(settingsStore.webdavEndpoint, slot), {
      method: 'GET',
      headers: {
        Authorization: getAuthHeader(settingsStore.webdavUsername, settingsStore.webdavPassword)
      }
    })
    if (!res.ok) return { hasRemote: false, isRemoteNewer: false }

    const content = await res.text()
    const data = saveStoreSafeParse(content)
    if (!data?.savedAt) return { hasRemote: true, isRemoteNewer: false }

    const localTime = localSavedAt ? new Date(localSavedAt).getTime() : 0
    const remoteTime = new Date(data.savedAt).getTime()
    return { hasRemote: true, isRemoteNewer: remoteTime > localTime }
  } catch {
    return { hasRemote: false, isRemoteNewer: false }
  }
}

const saveStoreSafeParse = (raw: string): Record<string, any> | null => {
  try {
    return useSaveStore().parseSave(raw)
  } catch {
    return null
  }
}

export const useWebdavBackup = () => {
  return {
    isBackingUp,
    isRestoring,
    lastRemoteBackupAt,
    enqueueAutoBackup,
    backupNow,
    restoreNow,
    checkRemoteNewerBackup
  }
}
