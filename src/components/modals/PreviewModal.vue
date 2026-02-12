<template>
  <dialog class="modal" :class="{ 'modal-open': store.previewModal.show }">
    <div class="modal-box glass-panel max-w-3xl w-11/12 p-0 overflow-hidden flex flex-col h-[85vh]">
      <!-- 头部 -->
      <div class="p-4 sm:p-6 pb-0 flex items-center justify-between">
        <h3 class="font-bold text-xl text-adaptive-white flex items-center gap-2">
          <i class="fa-solid fa-eye text-primary"></i>
          节点预览 <span class="badge badge-sm badge-ghost ml-2">{{ store.previewModal.nodes.length }}个</span>
        </h3>
        <div class="flex gap-2 flex-wrap justify-end">
          <button @click="toggleSortMode" class="btn btn-xs gap-1"
            :class="store.previewModal.sortMode ? 'btn-warning' : 'btn-ghost'">
            <i class="fa-solid fa-arrow-up-down"></i> {{ store.previewModal.sortMode ? '退出排序' : '排序' }}
          </button>
          <button @click="toggleEditMode" class="btn btn-xs gap-1"
            :class="store.previewModal.editMode ? 'btn-accent' : 'btn-ghost'">
            <i class="fa-solid fa-pen"></i> {{ store.previewModal.editMode ? '退出编辑' : '编辑名称' }}
          </button>
          <button @click="toggleDeleteMode" class="btn btn-xs gap-1"
            :class="deleteMode ? 'btn-error' : 'btn-ghost'">
            <i class="fa-solid fa-trash"></i> {{ deleteMode ? '退出删除' : '删除' }}
          </button>
          <button class="btn btn-circle btn-ghost btn-sm" @click="closePreview">
            <i class="fa-solid fa-xmark"></i>
          </button>
        </div>
      </div>

      <!-- 批量删除操作栏 -->
      <div v-if="deleteMode" class="px-4 sm:px-6 pt-3 flex items-center gap-2">
        <button class="btn btn-xs btn-ghost" @click="selectAllNodes">
          {{ selectedNodes.length === store.previewModal.nodes.length ? '取消全选' : '全选' }}
        </button>
        <span class="text-xs text-adaptive-muted">已选 {{ selectedNodes.length }} 个</span>
        <button v-if="selectedNodes.length > 0" class="btn btn-xs btn-error gap-1" @click="batchDeleteNodes">
          <i class="fa-solid fa-trash"></i> 删除选中 ({{ selectedNodes.length }})
        </button>
      </div>

      <!-- 节点列表 -->
      <div ref="previewListRef" class="flex-1 overflow-y-auto p-4 sm:p-6 custom-scrollbar space-y-2">
        <div v-for="(node, i) in store.previewModal.nodes" :key="node.link || i"
          class="flex items-center gap-3 p-3 rounded-lg bg-adaptive-input border border-panel-border hover:border-primary/30 transition-all"
          :data-index="i">
          <!-- 批量选择复选框 -->
          <div v-if="deleteMode" class="flex-shrink-0">
            <input type="checkbox" class="checkbox checkbox-error checkbox-sm"
              :checked="selectedNodes.includes(i)" @change="toggleNodeSelect(i)" />
          </div>
          <!-- 拖拽手柄 -->
          <div v-if="store.previewModal.sortMode" class="drag-handle flex-shrink-0">
            <i class="fa-solid fa-grip-vertical text-adaptive-muted"></i>
          </div>
          <!-- 协议图标 -->
          <span class="badge badge-sm flex-shrink-0"
            :class="getProtocolClass(getProtocol(node))">{{ getProtocol(node) }}</span>
          <!-- 名称 -->
          <span v-if="!store.previewModal.editMode"
            class="text-sm text-adaptive-white truncate flex-1">{{ node.name || '未命名' }}</span>
          <input v-else v-model="node.name"
            class="input input-bordered input-sm bg-adaptive-input flex-1 text-sm" />
          <!-- 操作按钮 -->
          <div class="flex gap-1 flex-shrink-0">
            <button @click="copyNode(node)" class="btn btn-ghost btn-xs tooltip" data-tip="复制链接">
              <i class="fa-solid fa-copy"></i>
            </button>
            <button v-if="!deleteMode" @click="deleteSingleNode(i)" class="btn btn-ghost btn-xs text-error tooltip" data-tip="删除">
              <i class="fa-solid fa-trash"></i>
            </button>
          </div>
        </div>
      </div>

      <!-- 底部 -->
      <div class="p-4 sm:p-6 pt-3 flex justify-between items-center border-t border-panel-border">
        <button @click="copyAllNodes" class="btn btn-sm btn-ghost gap-1">
          <i class="fa-solid fa-copy"></i> 复制全部
        </button>
        <div class="flex gap-2">
          <button class="btn btn-ghost btn-sm" @click="closePreview">关闭</button>
          <button v-if="hasChanges"
            class="btn btn-primary btn-sm" @click="saveChanges" :disabled="saving">
            <span v-if="saving" class="loading loading-spinner loading-xs"></span>
            <i v-else class="fa-solid fa-check mr-1"></i> 保存修改
          </button>
        </div>
      </div>
    </div>
    <form method="dialog" class="modal-backdrop" @click="closePreview"></form>
  </dialog>
</template>

<script setup>
import { ref, computed, nextTick } from 'vue'
import { useMainStore } from '../../stores/main.js'
import { authFetch, loadResources } from '../../api/index.js'
import { showToast, copyText, updateLinkName } from '../../utils/helpers.js'
import { API } from '../../api/config.js'

const store = useMainStore()
const previewListRef = ref(null)
const deleteMode = ref(false)
const selectedNodes = ref([])
const saving = ref(false)
const changed = ref(false)
let sortableInstance = null

const hasChanges = computed(() => {
  return changed.value || store.previewModal.editMode || store.previewModal.sortMode
})

function getProtocol(node) {
  if (node.protocol) return node.protocol
  if (node.link) {
    const m = node.link.match(/^(\w+):\/\//)
    if (m) return m[1].replace('hysteria2', 'hy2')
  }
  return '?'
}

function getProtocolClass(protocol) {
  const map = { vmess: 'badge-primary', vless: 'badge-secondary', trojan: 'badge-warning', ss: 'badge-info', hy2: 'badge-accent', hysteria2: 'badge-accent', tuic: 'badge-success' }
  return map[protocol] || 'badge-ghost'
}

// === 排序模式 ===
async function toggleSortMode() {
  store.previewModal.sortMode = !store.previewModal.sortMode
  if (store.previewModal.sortMode) {
    store.previewModal.editMode = false
    deleteMode.value = false
    selectedNodes.value = []
    await nextTick()
    if (previewListRef.value) {
      try {
        const { default: Sortable } = await import('sortablejs')
        if (sortableInstance) sortableInstance.destroy()
        sortableInstance = new Sortable(previewListRef.value, {
          handle: '.drag-handle',
          animation: 150,
          ghostClass: 'sortable-ghost',
          dragClass: 'sortable-drag',
        })
      } catch (e) { console.error('Sortable init failed:', e) }
    }
  } else {
    if (sortableInstance) { sortableInstance.destroy(); sortableInstance = null }
  }
}

// === 编辑模式 ===
function toggleEditMode() {
  store.previewModal.editMode = !store.previewModal.editMode
  if (store.previewModal.editMode) {
    store.previewModal.sortMode = false
    deleteMode.value = false
    selectedNodes.value = []
    if (sortableInstance) { sortableInstance.destroy(); sortableInstance = null }
  }
}

// === 删除模式 ===
function toggleDeleteMode() {
  deleteMode.value = !deleteMode.value
  if (deleteMode.value) {
    store.previewModal.sortMode = false
    store.previewModal.editMode = false
    selectedNodes.value = []
    if (sortableInstance) { sortableInstance.destroy(); sortableInstance = null }
  } else {
    selectedNodes.value = []
  }
}

function toggleNodeSelect(i) {
  const idx = selectedNodes.value.indexOf(i)
  if (idx === -1) selectedNodes.value.push(i)
  else selectedNodes.value.splice(idx, 1)
}

function selectAllNodes() {
  if (selectedNodes.value.length === store.previewModal.nodes.length) {
    selectedNodes.value = []
  } else {
    selectedNodes.value = store.previewModal.nodes.map((_, i) => i)
  }
}

function deleteSingleNode(i) {
  if (!confirm(`确定删除节点 "${store.previewModal.nodes[i]?.name || '未命名'}" ?`)) return
  store.previewModal.nodes.splice(i, 1)
  changed.value = true
  showToast('节点已移除，点击保存生效')
}

function batchDeleteNodes() {
  if (!confirm(`确定删除选中的 ${selectedNodes.value.length} 个节点？`)) return
  // 从大到小排序后删除，避免索引偏移
  const sorted = [...selectedNodes.value].sort((a, b) => b - a)
  sorted.forEach(i => store.previewModal.nodes.splice(i, 1))
  selectedNodes.value = []
  changed.value = true
  showToast(`已移除 ${sorted.length} 个节点，点击保存生效`)
}

// === 复制 ===
function copyNode(node) {
  copyText(node.link || '')
}

function copyAllNodes() {
  const links = store.previewModal.nodes.map(n => n.link).filter(Boolean).join('\n')
  copyText(links)
}

// === 关闭 ===
function closePreview() {
  store.previewModal.show = false
  store.previewModal.sortMode = false
  store.previewModal.editMode = false
  deleteMode.value = false
  selectedNodes.value = []
  changed.value = false
  if (sortableInstance) { sortableInstance.destroy(); sortableInstance = null }
}

// === 保存 ===
async function saveChanges() {
  if (!store.previewModal.resourceId) return
  saving.value = true

  try {
    // 从 DOM 顺序重建节点数组
    let orderedNodes = store.previewModal.nodes
    if (store.previewModal.sortMode && previewListRef.value) {
      const domOrder = Array.from(previewListRef.value.children).map(el => parseInt(el.dataset.index))
      orderedNodes = domOrder.map(idx => store.previewModal.nodes[idx])
    }

    const newLinks = orderedNodes.map(n => n.link).filter(Boolean).join('\n')

    await authFetch(`${API}/subs/${store.previewModal.resourceId}`, {
      method: 'PUT',
      body: { url: newLinks }
    })

    showToast('修改已保存')
    loadResources()
    closePreview()
  } catch (e) { showToast('保存失败', 'error') }
  saving.value = false
}
</script>
