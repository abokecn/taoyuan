import { ref } from 'vue'
import { defineStore } from 'pinia'
import CryptoJS from 'crypto-js'
import { useAudio } from '@/composables/useAudio'
import { getThemeByKey, type ThemeKey } from '@/data/themes'
import { applyQmsgConfig } from '@/composables/useGameLog'

export type QmsgPosition = 'topleft' | 'top' | 'topright' | 'left' | 'center' | 'right' | 'bottomleft' | 'bottom' | 'bottomright'
export type QmsgLimitWidthWrap = 'no-wrap' | 'wrap' | 'ellipsis'

const DEFAULT_FONT_SIZE = 16
const DEFAULT_THEME: ThemeKey = 'dark'
const DEFAULT_QMSG_POSITION: QmsgPosition = 'bottom'
const SETTINGS_WEB_DAV_PASSWORD_KEY = 'taoyuan_settings_webdav_password'

const encryptWebdavPassword = (password: string): string => {
  if (!password) return ''
  return CryptoJS.AES.encrypt(password, SETTINGS_WEB_DAV_PASSWORD_KEY).toString()
}

const decryptWebdavPassword = (cipher: string): string => {
  if (!cipher) return ''
  try {
    const bytes = CryptoJS.AES.decrypt(cipher, SETTINGS_WEB_DAV_PASSWORD_KEY)
    return bytes.toString(CryptoJS.enc.Utf8) || ''
  } catch {
    return ''
  }
}

export const useSettingsStore = defineStore('settings', () => {
  const fontSize = ref(DEFAULT_FONT_SIZE)
  const theme = ref<ThemeKey>(DEFAULT_THEME)
  const qmsgPosition = ref<QmsgPosition>(DEFAULT_QMSG_POSITION)
  const qmsgTimeout = ref(2500)
  const qmsgMaxNums = ref(5)
  const qmsgIsLimitWidth = ref(true)
  const qmsgLimitWidthNum = ref(200)
  const qmsgLimitWidthWrap = ref<QmsgLimitWidthWrap>('wrap')
  const qmsgAnimation = ref(true)
  const qmsgAutoClose = ref(true)
  const qmsgShowClose = ref(false)
  const qmsgShowIcon = ref(false)
  const qmsgShowReverse = ref(false)
  const webdavEnabled = ref(false)
  const webdavEndpoint = ref('')
  const webdavUsername = ref('')
  const webdavPassword = ref('')
  const webdavPasswordEncrypted = ref('')
  const webdavAutoBackupOnEndDay = ref(false)
  const webdavBackupInterval = ref(1)

  const setWebdavPassword = (password: string) => {
    webdavPassword.value = password
    webdavPasswordEncrypted.value = encryptWebdavPassword(password)
  }

  const applyFontSize = () => {
    document.documentElement.style.fontSize = fontSize.value + 'px'
  }

  const applyTheme = () => {
    const t = getThemeByKey(theme.value)
    document.documentElement.style.setProperty('--color-bg', t.bg)
    document.documentElement.style.setProperty('--color-panel', t.panel)
    document.documentElement.style.setProperty('--color-text', t.text)
  }

  const changeFontSize = (delta: number) => {
    fontSize.value = Math.min(24, Math.max(12, fontSize.value + delta))
    applyFontSize()
  }

  const changeTheme = (key: ThemeKey) => {
    theme.value = key
    applyTheme()
  }

  const changeQmsgPosition = (pos: QmsgPosition) => {
    qmsgPosition.value = pos
    syncQmsgConfig()
  }

  /** 将当前所有通知设置同步到 Qmsg */
  const syncQmsgConfig = () => {
    applyQmsgConfig({
      position: qmsgPosition.value,
      timeout: qmsgTimeout.value,
      maxNums: qmsgMaxNums.value,
      isLimitWidth: qmsgIsLimitWidth.value,
      limitWidthNum: qmsgLimitWidthNum.value,
      limitWidthWrap: qmsgLimitWidthWrap.value,
      animation: qmsgAnimation.value,
      autoClose: qmsgAutoClose.value,
      showClose: qmsgShowClose.value,
      showIcon: qmsgShowIcon.value,
      showReverse: qmsgShowReverse.value
    })
  }

  const serialize = () => {
    const { sfxEnabled, bgmEnabled } = useAudio()
    return {
      fontSize: fontSize.value,
      sfxEnabled: sfxEnabled.value,
      bgmEnabled: bgmEnabled.value,
      theme: theme.value,
      qmsgPosition: qmsgPosition.value,
      qmsgTimeout: qmsgTimeout.value,
      qmsgMaxNums: qmsgMaxNums.value,
      qmsgIsLimitWidth: qmsgIsLimitWidth.value,
      qmsgLimitWidthNum: qmsgLimitWidthNum.value,
      qmsgLimitWidthWrap: qmsgLimitWidthWrap.value,
      qmsgAnimation: qmsgAnimation.value,
      qmsgAutoClose: qmsgAutoClose.value,
      qmsgShowClose: qmsgShowClose.value,
      qmsgShowIcon: qmsgShowIcon.value,
      qmsgShowReverse: qmsgShowReverse.value,
      webdavEnabled: webdavEnabled.value,
      webdavEndpoint: webdavEndpoint.value,
      webdavUsername: webdavUsername.value,
      webdavPasswordEncrypted: webdavPasswordEncrypted.value || encryptWebdavPassword(webdavPassword.value),
      webdavAutoBackupOnEndDay: webdavAutoBackupOnEndDay.value,
      webdavBackupInterval: webdavBackupInterval.value
    }
  }

  const deserialize = (data: any) => {
    fontSize.value = data?.fontSize ?? DEFAULT_FONT_SIZE
    applyFontSize()
    theme.value = data?.theme ?? DEFAULT_THEME
    applyTheme()
    qmsgPosition.value = data?.qmsgPosition ?? DEFAULT_QMSG_POSITION
    qmsgTimeout.value = data?.qmsgTimeout ?? 2500
    qmsgMaxNums.value = data?.qmsgMaxNums ?? 5
    qmsgIsLimitWidth.value = data?.qmsgIsLimitWidth ?? true
    qmsgLimitWidthNum.value = data?.qmsgLimitWidthNum ?? 200
    qmsgLimitWidthWrap.value = data?.qmsgLimitWidthWrap ?? 'wrap'
    qmsgAnimation.value = data?.qmsgAnimation ?? true
    qmsgAutoClose.value = data?.qmsgAutoClose ?? true
    qmsgShowClose.value = data?.qmsgShowClose ?? false
    qmsgShowIcon.value = data?.qmsgShowIcon ?? false
    qmsgShowReverse.value = data?.qmsgShowReverse ?? false
    webdavEnabled.value = data?.webdavEnabled ?? false
    webdavEndpoint.value = data?.webdavEndpoint ?? ''
    webdavUsername.value = data?.webdavUsername ?? ''
    const encrypted = data?.webdavPasswordEncrypted ?? ''
    webdavPasswordEncrypted.value = encrypted
    webdavPassword.value = decryptWebdavPassword(encrypted)
    if (!webdavPassword.value && data?.webdavPassword) {
      webdavPassword.value = data.webdavPassword
      webdavPasswordEncrypted.value = encryptWebdavPassword(data.webdavPassword)
    }
    webdavAutoBackupOnEndDay.value = data?.webdavAutoBackupOnEndDay ?? false
    webdavBackupInterval.value = Math.max(1, Number(data?.webdavBackupInterval ?? 1))
    syncQmsgConfig()
    const { sfxEnabled, bgmEnabled } = useAudio()
    sfxEnabled.value = data?.sfxEnabled ?? true
    bgmEnabled.value = data?.bgmEnabled ?? true
  }

  return {
    fontSize,
    theme,
    qmsgPosition,
    qmsgTimeout,
    qmsgMaxNums,
    qmsgIsLimitWidth,
    qmsgLimitWidthNum,
    qmsgLimitWidthWrap,
    qmsgAnimation,
    qmsgAutoClose,
    qmsgShowClose,
    qmsgShowIcon,
    qmsgShowReverse,
    webdavEnabled,
    webdavEndpoint,
    webdavUsername,
    webdavPassword,
    webdavPasswordEncrypted,
    webdavAutoBackupOnEndDay,
    webdavBackupInterval,
    encryptWebdavPassword,
    setWebdavPassword,
    changeFontSize,
    changeTheme,
    changeQmsgPosition,
    syncQmsgConfig,
    applyFontSize,
    applyTheme,
    serialize,
    deserialize
  }
})
