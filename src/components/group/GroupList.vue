<template>
  <div>
    <!-- 操作栏 -->
    <div class="flex flex-wrap gap-2 mb-4 sm:mb-6">
      <button class="btn btn-accent btn-sm sm:btn-md gap-2 shadow-lg" @click="openAddGroup">
        <i class="fa-solid fa-plus"></i> 新建聚合组
      </button>
    </div>

    <!-- 聚合组列表 -->
    <div ref="groupListRef" class="grid gap-3 sm:gap-4">
      <div v-for="g in store.groups" :key="g.id"
        class="card glass-panel hover:shadow-xl transition-all duration-300 group border border-transparent hover:border-accent/30"
        :data-id="g.id">
        <div class="card-body p-3 sm:p-5">
          <div class="flex items-start gap-2 sm:gap-3">
            <!-- 拖拽手柄 -->
            <div class="drag-handle pt-1 opacity-30 group-hover:opacity-100 transition-opacity">
              <i class="fa-solid fa-grip-vertical text-adaptive-muted"></i>
            </div>
            <!-- 图标 -->
            <div class="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-accent/20 text-accent flex items-center justify-center flex-shrink-0">
              <i class="fa-solid fa-layer-group text-sm sm:text-base"></i>
            </div>
            <!-- 信息 -->
            <div class="flex-1 min-w-0">
              <div class="flex items-center gap-2 flex-wrap">
                <h3 class="font-bold text-adaptive-white text-sm sm:text-base truncate max-w-[200px] sm:max-w-none">{{ g.name }}</h3>
                <span class="badge badge-accent badge-sm">
                  {{ isRawMode(g) ? '托管YAML' : `${(g.config || []).length}个资源` }}
                </span>
                <span v-if="g.access_count" class="badge badge-ghost badge-sm">
                  <i class="fa-solid fa-chart-simple mr-1"></i> {{ g.access_count }}次
                </span>
              </div>
              <!-- 订阅链接 -->
              <div class="mt-2 flex flex-wrap gap-1 sm:gap-2">
                <button @click="copyLink(g.token, 'clash')" class="btn btn-xs btn-outline btn-primary gap-1">
                  <i class="fa-solid fa-copy"></i> Clash
                </button>
                <button v-if="!isRawMode(g)" @click="copyLink(g.token, 'base64')" class="btn btn-xs btn-outline btn-secondary gap-1">
                  <i class="fa-solid fa-copy"></i> Base64
                </button>
              </div>
            </div>
            <!-- 操作按钮 -->
            <div class="flex gap-1 flex-shrink-0">
              <button @click="openEditGroup(g)" class="btn btn-circle btn-ghost btn-xs sm:btn-sm tooltip" data-tip="编辑">
                <i class="fa-solid fa-pen"></i>
              </button>
              <button @click="deleteGroup(g.id)" class="btn btn-circle btn-ghost btn-xs sm:btn-sm text-error tooltip" data-tip="删除">
                <i class="fa-solid fa-trash"></i>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 空状态 -->
    <div v-if="store.groups.length === 0" class="text-center py-16">
      <i class="fa-solid fa-object-ungroup text-6xl text-adaptive-muted opacity-30 mb-4"></i>
      <p class="text-adaptive-muted text-lg">暂无聚合组，创建一个吧</p>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, watch, nextTick } from 'vue'
import { useMainStore } from '../../stores/main.js'
import { authFetch, loadGroups } from '../../api/index.js'
import { showToast, copyText } from '../../utils/helpers.js'
import { API } from '../../api/config.js'
import { defaultHeader, defaultRules } from '../../api/config.js'

const store = useMainStore()
const groupListRef = ref(null)

function isRawMode(g) {
  try {
    const cc = typeof g.clash_config === 'string' ? JSON.parse(g.clash_config) : g.clash_config
    return cc && cc.mode === 'raw'
  } catch (e) { return false }
}

function openAddGroup() {
  store.groupForm = {
    id: null, name: '',
    config: [],
    clash_config: { mode: 'generate', header: '', groups: [], rules: '', resources: [], raw_yaml: '' }
  }
  store.groupModal.isEdit = false
  store.groupModal.tab = 'base'
  store.templateModal.show = true
}

function openEditGroup(g) {
  store.groupForm = {
    id: g.id, name: g.name,
    config: JSON.parse(JSON.stringify(g.config || [])),
    clash_config: JSON.parse(JSON.stringify(g.clash_config || { mode: 'generate', header: '', groups: [], rules: '', resources: [], raw_yaml: '' }))
  }
  store.groupModal.isEdit = true
  store.groupModal.tab = store.groupForm.clash_config.mode === 'raw' ? 'raw' : 'base'
  store.groupModal.show = true
}

function copyLink(token, format) {
  const base = window.location.origin
  const link = `${base}/api/g/${token}?format=${format}`
  copyText(link)
}

async function deleteGroup(id) {
  if (!confirm('确定删除该聚合组？')) return
  try {
    await authFetch(`${API}/groups/${id}`, { method: 'DELETE' })
    showToast('已删除')
    loadGroups()
  } catch (e) { showToast('删除失败', 'error') }
}

// Sortable
let sortableInstance = null
async function initSortable() {
  if (!groupListRef.value) return
  try {
    const { default: Sortable } = await import('sortablejs')
    if (sortableInstance) sortableInstance.destroy()
    sortableInstance = new Sortable(groupListRef.value, {
      handle: '.drag-handle',
      animation: 150,
      ghostClass: 'sortable-ghost',
      dragClass: 'sortable-drag',
      onEnd: async () => {
        const order = Array.from(groupListRef.value.children).map(el => parseInt(el.dataset.id))
        try { await authFetch(`${API}/groups/reorder`, { method: 'POST', body: { order } }) }
        catch (e) { console.error(e) }
      }
    })
  } catch (e) { console.error('Sortable init failed:', e) }
}

onMounted(() => { nextTick(initSortable) })
watch(() => store.groups.length, () => { nextTick(initSortable) })
</script>
