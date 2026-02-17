<template>
  <Transition name="panel-fade">
    <div v-if="open" class="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4" @click.self="$emit('close')">
      <div class="game-panel w-full max-w-xs text-center relative">
        <button class="absolute top-2 right-2 text-muted hover:text-text" @click="$emit('close')">
          <X :size="14" />
        </button>
        <p class="text-accent text-sm mb-3">—— 设置 ——</p>

        <!-- 分类导航 -->
        <div class="grid grid-cols-3 justify-center gap-1 mb-3">
          <button
            v-for="tab in SETTINGS_TABS"
            :key="tab.key"
            class="text-xs py-1 px-3 border rounded-xs transition-colors"
            :class="activeTab === tab.key ? 'border-accent bg-accent/20 text-accent' : 'border-accent/20 text-muted hover:text-text'"
            @click="activeTab = tab.key"
          >
            <component :is="tab.icon" :size="12" class="inline-block align-[-2px] mr-1" />
            {{ tab.label }}
          </button>
        </div>

        <div class="flex flex-col gap-3">
          <!-- ===== 通用 ===== -->
          <template v-if="activeTab === 'general'">
            <!-- 时间控制 -->
            <div class="border border-accent/20 rounded-xs p-3">
              <p class="text-xs text-muted mb-2">时间控制</p>
              <div class="flex items-center justify-center gap-2">
                <button class="btn text-xs py-1 px-3" @click="togglePause">
                  <Pause v-if="!isPaused" :size="12" />
                  <Play v-else :size="12" />
                  {{ isPaused ? '继续' : '暂停' }}
                </button>
                <button class="btn text-xs py-1 px-3" @click="cycleSpeed">速度 {{ gameSpeed }}×</button>
              </div>
            </div>

            <!-- 音频控制 -->
            <div class="border border-accent/20 rounded-xs p-3">
              <p class="text-xs text-muted mb-2">音频</p>
              <div class="flex items-center justify-center gap-2">
                <button class="btn text-xs py-1 px-3" @click="toggleSfx">
                  <Volume2 v-if="sfxEnabled" :size="12" />
                  <VolumeX v-else :size="12" />
                  音效
                </button>
                <button class="btn text-xs py-1 px-3" @click="toggleBgm">
                  <Headphones v-if="bgmEnabled" :size="12" />
                  <HeadphoneOff v-else :size="12" />
                  音乐
                </button>
              </div>
            </div>

            <!-- WebDAV 备份 -->
            <div class="border border-accent/20 rounded-xs p-3 text-left">
              <p class="text-xs text-muted mb-2 text-center">WebDAV 云备份</p>
              <div class="flex items-center justify-center gap-1 mb-2">
                <button
                  class="btn text-xs py-0 px-2"
                  :class="settingsStore.webdavEnabled ? 'bg-accent/20! text-accent! border-accent!' : ''"
                  @click="settingsStore.webdavEnabled = true"
                >
                  开
                </button>
                <button
                  class="btn text-xs py-0 px-2"
                  :class="!settingsStore.webdavEnabled ? 'bg-accent/20! text-accent! border-accent!' : ''"
                  @click="settingsStore.webdavEnabled = false"
                >
                  关
                </button>
              </div>
              <div class="flex flex-col gap-2">
                <input v-model.trim="settingsStore.webdavEndpoint" type="text" placeholder="WebDAV 地址（https://...）" class="w-full px-2 py-1 bg-bg border border-accent/30 rounded-xs text-xs outline-none" />
                <input v-model.trim="settingsStore.webdavUsername" type="text" placeholder="用户名" class="w-full px-2 py-1 bg-bg border border-accent/30 rounded-xs text-xs outline-none" />
                <input :value="settingsStore.webdavPassword" type="password" placeholder="密码（本地加密存储）" class="w-full px-2 py-1 bg-bg border border-accent/30 rounded-xs text-xs outline-none" @input="handleWebdavPasswordInput" />
              </div>
              <div class="mt-2">
                <p class="text-xs text-muted mb-1">日结自动备份</p>
                <div class="flex items-center gap-1">
                  <button class="btn text-xs py-0 px-2" :class="settingsStore.webdavAutoBackupOnEndDay ? 'bg-accent/20! text-accent! border-accent!' : ''" @click="settingsStore.webdavAutoBackupOnEndDay = true">开</button>
                  <button class="btn text-xs py-0 px-2" :class="!settingsStore.webdavAutoBackupOnEndDay ? 'bg-accent/20! text-accent! border-accent!' : ''" @click="settingsStore.webdavAutoBackupOnEndDay = false">关</button>
                </div>
              </div>
              <div class="mt-2">
                <p class="text-xs text-muted mb-1">备份间隔（天）</p>
                <div class="flex items-center justify-center gap-2">
                  <button class="btn text-xs py-0 px-1.5" :disabled="settingsStore.webdavBackupInterval <= 1" @click="settingsStore.webdavBackupInterval = Math.max(1, settingsStore.webdavBackupInterval - 1)">
                    <Minus :size="10" />
                  </button>
                  <span class="text-xs w-8 text-center">{{ settingsStore.webdavBackupInterval }}</span>
                  <button class="btn text-xs py-0 px-1.5" :disabled="settingsStore.webdavBackupInterval >= 30" @click="settingsStore.webdavBackupInterval = Math.min(30, settingsStore.webdavBackupInterval + 1)">
                    <Plus :size="10" />
                  </button>
                </div>
              </div>
            </div>
          </template>

          <!-- ===== 外观 ===== -->
          <template v-if="activeTab === 'display'">
            <!-- 字体大小 -->
            <div class="border border-accent/20 rounded-xs p-3">
              <p class="text-xs text-muted mb-2">字体大小</p>
              <div class="flex items-center justify-center gap-3">
                <button class="btn text-xs py-1 px-3" :disabled="settingsStore.fontSize <= 12" @click="settingsStore.changeFontSize(-1)">
                  <Minus :size="12" />
                </button>
                <span class="text-sm w-8 text-center">{{ settingsStore.fontSize }}</span>
                <button class="btn text-xs py-1 px-3" :disabled="settingsStore.fontSize >= 24" @click="settingsStore.changeFontSize(1)">
                  <Plus :size="12" />
                </button>
              </div>
            </div>

            <!-- 配色主题 -->
            <div class="border border-accent/20 rounded-xs p-3">
              <p class="text-xs text-muted mb-2">配色主题</p>
              <div class="flex items-center justify-center gap-2">
                <button
                  v-for="t in THEMES"
                  :key="t.key"
                  class="w-8 h-8 border rounded-xs flex items-center justify-center text-[10px] transition-colors"
                  :class="settingsStore.theme === t.key ? 'border-accent' : 'border-accent/20'"
                  :style="{ backgroundColor: t.bg, color: t.text }"
                  :title="t.name"
                  @click="settingsStore.changeTheme(t.key)"
                >
                  {{ t.name.charAt(0) }}
                </button>
              </div>
            </div>
          </template>

          <!-- ===== 通知 ===== -->
          <template v-if="activeTab === 'notification'">
            <div class="max-h-[20vh] overflow-y-auto flex flex-col gap-3">
              <!-- 通知位置 -->
              <div class="border border-accent/20 rounded-xs p-3">
                <p class="text-xs text-muted mb-2">弹出位置</p>
                <div class="grid grid-cols-3 gap-1 w-24 mx-auto">
                  <button
                    v-for="pos in QMSG_POSITIONS"
                    :key="pos.value"
                    class="w-8 h-6 border rounded-xs transition-colors flex items-center justify-center"
                    :class="
                      settingsStore.qmsgPosition === pos.value ? 'border-accent bg-accent/20 text-accent' : 'border-accent/20 text-muted'
                    "
                    :title="pos.label"
                    @click="settingsStore.changeQmsgPosition(pos.value)"
                  >
                    <component :is="pos.icon" :size="10" />
                  </button>
                </div>
              </div>

              <!-- 持续时间 -->
              <div class="border border-accent/20 rounded-xs p-3">
                <p class="text-xs text-muted mb-2">持续时间</p>
                <div class="flex items-center justify-center gap-2">
                  <button class="btn text-xs py-0 px-1.5" :disabled="settingsStore.qmsgTimeout <= 500" @click="changeTimeout(-500)">
                    <Minus :size="10" />
                  </button>
                  <span class="text-xs w-12 text-center">{{ (settingsStore.qmsgTimeout / 1000).toFixed(1) }}s</span>
                  <button class="btn text-xs py-0 px-1.5" :disabled="settingsStore.qmsgTimeout >= 10000" @click="changeTimeout(500)">
                    <Plus :size="10" />
                  </button>
                </div>
              </div>

              <!-- 最大数量 -->
              <div class="border border-accent/20 rounded-xs p-3">
                <p class="text-xs text-muted mb-2">最大数量</p>
                <div class="flex items-center justify-center gap-2">
                  <button class="btn text-xs py-0 px-1.5" :disabled="settingsStore.qmsgMaxNums <= 1" @click="changeMaxNums(-1)">
                    <Minus :size="10" />
                  </button>
                  <span class="text-xs w-6 text-center">{{ settingsStore.qmsgMaxNums }}</span>
                  <button class="btn text-xs py-0 px-1.5" :disabled="settingsStore.qmsgMaxNums >= 20" @click="changeMaxNums(1)">
                    <Plus :size="10" />
                  </button>
                </div>
              </div>

              <!-- 宽度限制 -->
              <div class="border border-accent/20 rounded-xs p-3">
                <p class="text-xs text-muted mb-2">限制宽度</p>
                <div class="flex items-center justify-center gap-1 mb-2">
                  <button
                    class="btn text-xs py-0 px-2"
                    :class="settingsStore.qmsgIsLimitWidth ? 'bg-accent/20! text-accent! border-accent!' : ''"
                    @click="setBool('qmsgIsLimitWidth', true)"
                  >
                    开
                  </button>
                  <button
                    class="btn text-xs py-0 px-2"
                    :class="!settingsStore.qmsgIsLimitWidth ? 'bg-accent/20! text-accent! border-accent!' : ''"
                    @click="setBool('qmsgIsLimitWidth', false)"
                  >
                    关
                  </button>
                </div>
                <template v-if="settingsStore.qmsgIsLimitWidth">
                  <p class="text-xs text-muted mb-2">宽度(px)</p>
                  <div class="flex items-center justify-center gap-2 mb-2">
                    <button
                      class="btn text-xs py-0 px-1.5"
                      :disabled="settingsStore.qmsgLimitWidthNum <= 100"
                      @click="changeLimitWidth(-50)"
                    >
                      <Minus :size="10" />
                    </button>
                    <span class="text-xs w-10 text-center">{{ settingsStore.qmsgLimitWidthNum }}</span>
                    <button
                      class="btn text-xs py-0 px-1.5"
                      :disabled="settingsStore.qmsgLimitWidthNum >= 800"
                      @click="changeLimitWidth(50)"
                    >
                      <Plus :size="10" />
                    </button>
                  </div>
                  <p class="text-xs text-muted mb-2">超出处理</p>
                  <div class="flex items-center justify-center gap-1">
                    <button
                      v-for="opt in WRAP_OPTIONS"
                      :key="opt.value"
                      class="btn text-[10px] py-0 px-1.5"
                      :class="settingsStore.qmsgLimitWidthWrap === opt.value ? 'bg-accent/20! text-accent! border-accent!' : ''"
                      @click="changeWrap(opt.value)"
                    >
                      {{ opt.label }}
                    </button>
                  </div>
                </template>
              </div>

              <!-- 开关选项 -->
              <div class="border border-accent/20 rounded-xs p-3 flex flex-col gap-2">
                <div v-for="opt in TOGGLE_OPTIONS" :key="opt.key" class="flex flex-col items-center gap-1">
                  <span class="text-xs text-muted">{{ opt.label }}</span>
                  <div class="flex items-center gap-1">
                    <button
                      class="btn text-xs py-0 px-2"
                      :class="settingsStore[opt.key] ? 'bg-accent/20! text-accent! border-accent!' : ''"
                      @click="setBool(opt.key, true)"
                    >
                      开
                    </button>
                    <button
                      class="btn text-xs py-0 px-2"
                      :class="!settingsStore[opt.key] ? 'bg-accent/20! text-accent! border-accent!' : ''"
                      @click="setBool(opt.key, false)"
                    >
                      关
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </template>
        </div>

        <!-- 存档管理（全局底部） -->
        <button class="btn text-xs py-1 px-3 w-full justify-center mt-3" @click="showSaveManager = true">
          <FolderOpen :size="12" />
          存档管理
        </button>
      </div>
    </div>
  </Transition>

  <!-- 存档管理弹窗 -->
  <Transition name="panel-fade">
    <SaveManager v-if="showSaveManager" @close="showSaveManager = false" />
  </Transition>
</template>

<script setup lang="ts">
  import { ref, type Component } from 'vue'
  import {
    X,
    Pause,
    Play,
    Volume2,
    VolumeX,
    Headphones,
    HeadphoneOff,
    FolderOpen,
    Minus,
    Plus,
    ArrowUpLeft,
    ArrowUp,
    ArrowUpRight,
    ArrowLeft,
    Circle,
    ArrowRight,
    ArrowDownLeft,
    ArrowDown,
    ArrowDownRight,
    Settings,
    Palette,
    Bell
  } from 'lucide-vue-next'
  import { useAudio } from '@/composables/useAudio'
  import { useGameClock } from '@/composables/useGameClock'
  import { useSettingsStore, type QmsgPosition, type QmsgLimitWidthWrap } from '@/stores/useSettingsStore'
  import { THEMES } from '@/data/themes'
  import SaveManager from '@/components/game/SaveManager.vue'

  type SettingsTab = 'general' | 'display' | 'notification'

  type BoolSettingKey = 'qmsgIsLimitWidth' | 'qmsgAnimation' | 'qmsgAutoClose' | 'qmsgShowClose' | 'qmsgShowIcon' | 'qmsgShowReverse'

  const SETTINGS_TABS: { key: SettingsTab; label: string; icon: Component }[] = [
    { key: 'general', label: '通用', icon: Settings },
    { key: 'display', label: '外观', icon: Palette },
    { key: 'notification', label: '通知', icon: Bell }
  ]

  const QMSG_POSITIONS: { value: QmsgPosition; label: string; icon: Component }[] = [
    { value: 'topleft', label: '左上', icon: ArrowUpLeft },
    { value: 'top', label: '上', icon: ArrowUp },
    { value: 'topright', label: '右上', icon: ArrowUpRight },
    { value: 'left', label: '左', icon: ArrowLeft },
    { value: 'center', label: '中', icon: Circle },
    { value: 'right', label: '右', icon: ArrowRight },
    { value: 'bottomleft', label: '左下', icon: ArrowDownLeft },
    { value: 'bottom', label: '下', icon: ArrowDown },
    { value: 'bottomright', label: '右下', icon: ArrowDownRight }
  ]

  const WRAP_OPTIONS: { value: QmsgLimitWidthWrap; label: string }[] = [
    { value: 'no-wrap', label: '不处理' },
    { value: 'wrap', label: '换行' },
    { value: 'ellipsis', label: '省略号' }
  ]

  const TOGGLE_OPTIONS: { key: BoolSettingKey; label: string }[] = [
    { key: 'qmsgAnimation', label: '弹出动画' },
    { key: 'qmsgAutoClose', label: '自动关闭' },
    { key: 'qmsgShowClose', label: '显示关闭图标' },
    { key: 'qmsgShowIcon', label: '显示左侧图标' },
    { key: 'qmsgShowReverse', label: '弹出方向逆反' }
  ]

  defineProps<{ open: boolean }>()
  defineEmits<{ close: [] }>()

  const activeTab = ref<SettingsTab>('general')
  const { sfxEnabled, bgmEnabled, toggleSfx, toggleBgm } = useAudio()
  const { isPaused, gameSpeed, togglePause, cycleSpeed } = useGameClock()
  const settingsStore = useSettingsStore()

  const showSaveManager = ref(false)

  const changeTimeout = (delta: number) => {
    settingsStore.qmsgTimeout = Math.min(10000, Math.max(500, settingsStore.qmsgTimeout + delta))
    settingsStore.syncQmsgConfig()
  }

  const changeMaxNums = (delta: number) => {
    settingsStore.qmsgMaxNums = Math.min(20, Math.max(1, settingsStore.qmsgMaxNums + delta))
    settingsStore.syncQmsgConfig()
  }

  const changeLimitWidth = (delta: number) => {
    settingsStore.qmsgLimitWidthNum = Math.min(800, Math.max(100, settingsStore.qmsgLimitWidthNum + delta))
    settingsStore.syncQmsgConfig()
  }

  const changeWrap = (value: QmsgLimitWidthWrap) => {
    settingsStore.qmsgLimitWidthWrap = value
    settingsStore.syncQmsgConfig()
  }

  const setBool = (key: BoolSettingKey, value: boolean) => {
    settingsStore[key] = value
    settingsStore.syncQmsgConfig()
  }

  const handleWebdavPasswordInput = (e: Event) => {
    const target = e.target as HTMLInputElement
    settingsStore.setWebdavPassword(target.value)
  }
</script>
