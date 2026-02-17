<template>
  <div class="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4" @click.self="$emit('close')">
    <div class="game-panel w-full max-w-md text-center relative max-h-[80vh] flex flex-col">
      <button class="absolute top-2 right-2 text-muted hover:text-text" @click="$emit('close')">
        <X :size="14" />
      </button>
      <p class="text-accent text-sm mb-4">—— 存档管理 ——</p>

      <div class="flex-1 flex flex-col gap-2 mb-3" @click="menuOpen = null">
        <div v-for="info in slots" :key="info.slot">
          <div v-if="info.exists" class="flex gap-1 w-full">
            <button v-if="allowLoad" class="btn flex-1 justify-between! text-xs" @click="$emit('load', info.slot)">
              <span class="inline-flex items-center gap-1">
                <FolderOpen :size="12" />
                存档 {{ info.slot + 1 }}
              </span>
              <span class="text-muted text-xs">
                {{ info.playerName ?? '未命名' }} · 第{{ info.year }}年 {{ SEASON_NAMES[info.season as keyof typeof SEASON_NAMES] }} 第{{
                  info.day
                }}天
              </span>
            </button>
            <div v-else class="btn flex-1 justify-between! text-xs cursor-default">
              <span class="inline-flex items-center gap-1">
                <FolderOpen :size="12" />
                存档 {{ info.slot + 1 }}
              </span>
              <span class="text-muted text-xs">
                {{ info.playerName ?? '未命名' }} · 第{{ info.year }}年 {{ SEASON_NAMES[info.season as keyof typeof SEASON_NAMES] }} 第{{
                  info.day
                }}天
              </span>
            </div>
            <div class="relative">
              <button class="btn px-2 text-xs h-full" @click.stop="menuOpen = menuOpen === info.slot ? null : info.slot">
                <Settings :size="12" />
              </button>
              <div
                v-if="menuOpen === info.slot"
                class="absolute right-0 top-full mt-1 z-10 flex flex-col border border-accent/30 rounded-xs overflow-hidden w-30"
              >
                <button v-if="!isWebView" class="btn text-center rounded-none! justify-center text-sm" @click="handleExport(info.slot)">
                  <Download :size="12" />
                  导出
                </button>
                <button class="btn btn-danger rounded-none! text-center justify-center text-sm" @click="handleDelete(info.slot)">
                  <Trash2 :size="12" />
                  删除
                </button>
              </div>
            </div>
          </div>
          <div v-else class="text-xs text-muted border border-accent/10 rounded-xs px-3 py-2">存档 {{ info.slot + 1 }} — 空</div>
        </div>
      </div>

      <!-- 导入存档 -->
      <template v-if="!isWebView">
        <button class="btn text-center justify-center text-sm w-full" @click="triggerImport">
          <Upload :size="14" />
          导入存档
        </button>
        <input ref="fileInputRef" type="file" accept=".tyx" class="hidden" @change="handleImportFile" />
      </template>


      <div class="border border-accent/20 rounded-xs p-2 text-xs text-muted mt-2">
        <p>最近远程备份：{{ lastRemoteBackupAt ? new Date(lastRemoteBackupAt).toLocaleString() : '暂无' }}</p>
      </div>
      <div class="grid grid-cols-2 gap-2 mt-2">
        <button class="btn text-center justify-center text-sm" :disabled="isBackingUp" @click="handleBackupNow">
          <Upload :size="14" />
          {{ isBackingUp ? '备份中...' : '立即备份' }}
        </button>
        <button class="btn text-center justify-center text-sm" :disabled="isRestoring" @click="handleRestoreNow">
          <Download :size="14" />
          {{ isRestoring ? '恢复中...' : '立即恢复' }}
        </button>
      </div>

      <!-- 删除存档确认弹窗 -->
      <Transition name="panel-fade">
        <div
          v-if="deleteTargetSlot !== null"
          class="fixed inset-0 z-60 flex items-center justify-center bg-bg/80"
          @click.self="deleteTargetSlot = null"
        >
          <div class="game-panel w-full max-w-xs mx-4 text-center">
            <p class="text-danger text-sm mb-3">确定删除存档 {{ deleteTargetSlot + 1 }}？</p>
            <p class="text-xs text-muted mb-4">此操作不可恢复。</p>
            <div class="flex gap-3 justify-center">
              <button class="btn text-xs" @click="deleteTargetSlot = null">取消</button>
              <button class="btn btn-danger text-xs" @click="confirmDelete">确认删除</button>
            </div>
          </div>
        </div>
      </Transition>
    </div>
  </div>
</template>

<script setup lang="ts">
  import { ref } from 'vue'
  import { X, FolderOpen, Settings, Download, Trash2, Upload } from 'lucide-vue-next'
  import { SEASON_NAMES } from '@/stores/useGameStore'
  import { useSaveStore } from '@/stores/useSaveStore'
  import { showFloat } from '@/composables/useGameLog'
  import { useWebdavBackup } from '@/composables/useWebdavBackup'

  defineProps<{ allowLoad?: boolean }>()
  const emit = defineEmits<{ close: []; load: [slot: number]; change: [] }>()

  const saveStore = useSaveStore()

  const isWebView = window.__WEBVIEW__

  const slots = ref(saveStore.getSlots())
  const { backupNow, restoreNow, isBackingUp, isRestoring, lastRemoteBackupAt } = useWebdavBackup()
  const menuOpen = ref<number | null>(null)

  const refreshSlots = () => {
    slots.value = saveStore.getSlots()
  }

  const handleExport = (slot: number) => {
    if (!saveStore.exportSave(slot)) {
      showFloat('导出失败。', 'danger')
    }
  }

  const deleteTargetSlot = ref<number | null>(null)

  const handleDelete = (slot: number) => {
    deleteTargetSlot.value = slot
  }

  const confirmDelete = () => {
    if (deleteTargetSlot.value !== null) {
      saveStore.deleteSlot(deleteTargetSlot.value)
      refreshSlots()
      emit('change')
      deleteTargetSlot.value = null
      menuOpen.value = null
    }
  }

  const fileInputRef = ref<HTMLInputElement | null>(null)

  const triggerImport = () => {
    fileInputRef.value?.click()
  }

  const handleBackupNow = async () => {
    await backupNow()
  }

  const handleRestoreNow = async () => {
    const ok = await restoreNow()
    if (ok) {
      refreshSlots()
      emit('change')
    }
  }

  const handleImportFile = (e: Event) => {
    const input = e.target as HTMLInputElement
    const file = input.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      const content = reader.result as string
      const emptySlot = slots.value.find(s => !s.exists)
      if (!emptySlot) {
        showFloat('存档槽位已满，请先删除一个旧存档。')
      } else if (saveStore.importSave(emptySlot.slot, content)) {
        refreshSlots()
        emit('change')
        showFloat(`已导入到存档 ${emptySlot.slot + 1}。`, 'success')
      } else {
        showFloat('存档文件无效或已损坏。', 'danger')
      }
      input.value = ''
    }
    reader.readAsText(file)
  }
</script>
