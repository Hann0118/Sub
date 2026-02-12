<template>
  <dialog class="modal" :class="{ 'modal-open': store.settingsModal.show }">
    <div class="modal-box glass-panel max-w-lg">
      <h3 class="font-bold text-xl text-adaptive-white mb-6 flex items-center gap-2">
        <i class="fa-solid fa-gear text-primary"></i> 系统设置
      </h3>

      <!-- 数据管理 -->
      <div class="mb-6">
        <h4 class="font-bold text-sm text-adaptive-white mb-3">数据管理</h4>
        <div class="flex flex-wrap gap-2">
          <button @click="exportBackup" class="btn btn-sm btn-outline btn-primary gap-1">
            <i class="fa-solid fa-download"></i> 导出备份
          </button>
          <button @click="triggerImport" class="btn btn-sm btn-outline btn-secondary gap-1">
            <i class="fa-solid fa-upload"></i> 导入备份
          </button>
          <input ref="importFileRef" type="file" class="hidden" accept=".json" @change="importBackup" />
        </div>
      </div>

      <!-- 关于 -->
      <div class="mb-6">
        <h4 class="font-bold text-sm text-adaptive-white mb-2">关于</h4>
        <p class="text-sm text-adaptive-muted">BiaoSUB v2.0 - Vite + Vue 3 SFC</p>
        <p class="text-xs text-adaptive-muted mt-1">自建节点聚合订阅管理面板</p>
        <a href="https://github.com/0xdabiaoge/Biao-Sub" target="_blank" rel="noopener"
          class="btn btn-sm btn-ghost gap-2 mt-2 text-primary hover:text-primary-focus">
          <i class="fa-brands fa-github text-lg"></i> GitHub 项目地址
        </a>
      </div>

      <div class="modal-action">
        <button class="btn btn-ghost" @click="store.settingsModal.show = false">关闭</button>
      </div>
    </div>
    <form method="dialog" class="modal-backdrop" @click="store.settingsModal.show = false"></form>
  </dialog>
</template>

<script setup>
import { ref } from 'vue'
import { useMainStore } from '../../stores/main.js'
import { authFetch, loadResources, loadGroups, loadTemplates } from '../../api/index.js'
import { showToast } from '../../utils/helpers.js'
import { API } from '../../api/config.js'

const store = useMainStore()
const importFileRef = ref(null)

async function exportBackup() {
  try {
    const data = await authFetch(`${API}/backup`)
    if (data.success) {
      const blob = new Blob([JSON.stringify(data.data, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `biaosub-backup-${new Date().toISOString().slice(0, 10)}.json`
      a.click()
      URL.revokeObjectURL(url)
      showToast('备份已导出')
    }
  } catch (e) { showToast('导出失败', 'error') }
}

function triggerImport() {
  importFileRef.value?.click()
}

async function importBackup(e) {
  const file = e.target.files?.[0]
  if (!file) return

  try {
    const text = await file.text()
    const data = JSON.parse(text)

    if (!confirm(`确认导入备份？将添加 ${(data.items || []).length} 个资源、${(data.groups || []).length} 个聚合组、${(data.templates || []).length} 个模板`)) {
      return
    }

    const res = await authFetch(`${API}/restore`, { method: 'POST', body: data })
    if (res.success) {
      showToast('导入成功')
      loadResources()
      loadGroups()
      loadTemplates()
    } else {
      showToast('导入失败: ' + (res.error || ''), 'error')
    }
  } catch (e) {
    showToast('文件格式错误', 'error')
  }

  e.target.value = '' // 重置
}
</script>
