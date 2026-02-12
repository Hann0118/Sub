<template>
  <dialog class="modal" :class="{ 'modal-open': store.clashNodeSelector.show }">
    <div class="modal-box glass-panel max-w-2xl max-h-[85vh] overflow-y-auto">
      <div class="flex items-center justify-between mb-4">
        <h3 class="font-bold text-xl text-adaptive-white flex items-center gap-2">
          <i class="fa-solid fa-list-check text-primary"></i> 选择节点进入策略组
        </h3>
        <button class="btn btn-circle btn-ghost btn-sm" @click="store.clashNodeSelector.show = false">
          <i class="fa-solid fa-xmark"></i>
        </button>
      </div>

      <p class="text-xs text-adaptive-muted mb-4">
        <i class="fa-solid fa-circle-info text-primary mr-1"></i>
        此节点将按 Clash 配置中的资源来对生成。
      </p>

      <!-- 已选节点数量 -->
      <div class="flex items-center justify-between mb-3">
        <span class="text-sm text-adaptive-white font-bold">已选节点: {{ store.clashNodeSelector.tempSelected.length }}</span>
        <div class="flex gap-2">
          <button class="btn btn-xs btn-ghost" @click="selectAll">全选</button>
          <button class="btn btn-xs btn-ghost text-error" @click="store.clashNodeSelector.tempSelected = []">清空</button>
        </div>
      </div>

      <!-- 已选择区域 (拖拽排序标签) -->
      <div v-if="store.clashNodeSelector.tempSelected.length > 0" class="mb-4 p-3 rounded-lg bg-base-300/50 border border-panel-border">
        <div class="flex items-center gap-2 mb-2">
          <i class="fa-solid fa-grip text-primary text-xs"></i>
          <span class="text-xs text-adaptive-muted font-semibold">已选择 (拖动可排序):</span>
        </div>
        <div ref="selectedTagsRef" class="flex flex-wrap gap-1.5">
          <span v-for="name in store.clashNodeSelector.tempSelected" :key="name"
            class="badge badge-primary gap-1 cursor-grab active:cursor-grabbing py-2.5 px-3 text-xs"
            :data-name="name">
            {{ name }}
            <button @click.stop="removeProxy(name)" class="btn btn-ghost btn-xs p-0 min-h-0 h-4 w-4 text-primary-content/60 hover:text-primary-content">
              ×
            </button>
          </span>
        </div>
      </div>

      <!-- 可选策略组 (排除自身) -->
      <div v-if="filteredGroupNames.length > 0" class="mb-4">
        <div class="flex items-center gap-2 mb-2">
          <i class="fa-solid fa-sitemap text-accent text-xs"></i>
          <span class="text-xs text-adaptive-muted font-semibold">可选策略组 (引用组名):</span>
        </div>
        <div class="flex flex-wrap gap-1.5">
          <span v-for="name in filteredGroupNames" :key="name"
            class="badge cursor-pointer py-2.5 px-3 text-xs transition-all"
            :class="store.clashNodeSelector.tempSelected.includes(name) ? 'badge-accent' : 'badge-outline badge-accent hover:bg-accent/20'"
            @click="toggleProxy(name)">
            {{ name }}
          </span>
        </div>
      </div>

      <!-- 可选节点组 (只显示 type=group 的资源) -->
      <div v-if="groupResources.length > 0" class="mb-4">
        <div class="flex items-center gap-2 mb-2">
          <i class="fa-solid fa-cubes text-warning text-xs"></i>
          <span class="text-xs text-adaptive-muted font-semibold">可选节点组 (引用整组节点):</span>
        </div>
        <div class="flex flex-wrap gap-1.5">
          <span v-for="res in groupResources" :key="res.name"
            class="badge cursor-pointer py-2.5 px-3 text-xs transition-all"
            :class="store.clashNodeSelector.tempSelected.includes(res.name) ? 'badge-warning' : 'badge-outline badge-warning hover:bg-warning/20'"
            @click="toggleProxy(res.name)">
            {{ res.name }}
          </span>
        </div>
      </div>

      <!-- 内置代理 -->
      <div class="mb-4">
        <div class="flex items-center gap-2 mb-2">
          <i class="fa-solid fa-shield-halved text-success text-xs"></i>
          <span class="text-xs text-adaptive-muted font-semibold">内置:</span>
        </div>
        <div class="flex flex-wrap gap-1.5">
          <span v-for="name in ['DIRECT', 'REJECT']" :key="name"
            class="badge cursor-pointer py-2.5 px-3 text-xs transition-all"
            :class="store.clashNodeSelector.tempSelected.includes(name) ? 'badge-success' : 'badge-outline badge-success hover:bg-success/20'"
            @click="toggleProxy(name)">
            {{ name }}
          </span>
        </div>
      </div>

      <!-- 单节点选择 -->
      <div v-if="nodeResources.length > 0" class="mb-4">
        <div class="flex items-center gap-2 mb-2">
          <i class="fa-solid fa-server text-info text-xs"></i>
          <span class="text-xs text-adaptive-muted font-semibold">单节点选择:</span>
        </div>
        <!-- 独立节点 (type=node) 直接显示 -->
        <div v-for="res in nodeResources" :key="res.subId" class="mb-2">
          <div class="flex flex-wrap gap-1.5">
            <span v-for="nodeName in res.nodes" :key="nodeName"
              class="badge cursor-pointer py-2.5 px-3 text-xs transition-all"
              :class="store.clashNodeSelector.tempSelected.includes(nodeName) ? 'badge-info' : 'badge-outline badge-info hover:bg-info/20'"
              @click="toggleProxy(nodeName)">
              {{ nodeName }}
            </span>
          </div>
        </div>

        <!-- 节点组 (type=group/remote) 折叠展开 -->
        <div v-for="res in groupTypeResources" :key="res.subId" class="mb-2">
          <div class="flex items-center gap-2 cursor-pointer select-none p-1.5 rounded-lg hover:bg-base-300/50 transition-colors"
            @click="toggleExpand(res.subId)">
            <i class="fa-solid text-xs text-warning transition-transform" 
              :class="expandedGroups.includes(res.subId) ? 'fa-chevron-down' : 'fa-chevron-right'"></i>
            <span class="text-xs font-semibold text-warning">{{ res.name }}</span>
            <span class="badge badge-xs badge-ghost">{{ res.nodes.length }}节点</span>
          </div>
          <div v-if="expandedGroups.includes(res.subId)" class="flex flex-wrap gap-1.5 mt-1 ml-4">
            <span v-for="nodeName in res.nodes" :key="nodeName"
              class="badge cursor-pointer py-2.5 px-3 text-xs transition-all"
              :class="store.clashNodeSelector.tempSelected.includes(nodeName) ? 'badge-info' : 'badge-outline badge-info hover:bg-info/20'"
              @click="toggleProxy(nodeName)">
              {{ nodeName }}
            </span>
          </div>
        </div>
      </div>

      <!-- 操作按钮 -->
      <div class="modal-action">
        <button class="btn btn-ghost" @click="store.clashNodeSelector.show = false">取消</button>
        <button class="btn btn-primary" @click="confirmSelection">
          <i class="fa-solid fa-check mr-1"></i> 确认选择
        </button>
      </div>
    </div>
    <form method="dialog" class="modal-backdrop" @click="store.clashNodeSelector.show = false"></form>
  </dialog>
</template>

<script setup>
import { ref, computed, watch, nextTick } from 'vue'
import { useMainStore } from '../../stores/main.js'
import { showToast } from '../../utils/helpers.js'

const store = useMainStore()
const selectedTagsRef = ref(null)
const expandedGroups = ref([])

// 排除当前编辑的策略组
const filteredGroupNames = computed(() => {
  const currentIdx = store.clashNodeSelector.currentGroup
  const currentName = currentIdx !== null && store.groupForm.clash_config.groups[currentIdx]
    ? store.groupForm.clash_config.groups[currentIdx].name
    : ''
  return store.clashNodeSelector.allGroupNames.filter(name => name !== currentName)
})

// 节点组资源 (type=group)
const groupResources = computed(() => {
  return store.clashNodeSelector.nodesByResource.filter(r => r.type === 'group')
})

// 独立节点资源 (type=node)
const nodeResources = computed(() => {
  return store.clashNodeSelector.nodesByResource.filter(r => r.type === 'node')
})

// 非独立节点资源（用于折叠展开）(type=group/remote)
const groupTypeResources = computed(() => {
  return store.clashNodeSelector.nodesByResource.filter(r => r.type === 'group' || r.type === 'remote')
})

// 是否有单节点区域可显示
const hasNodeSection = computed(() => {
  return nodeResources.value.length > 0 || groupTypeResources.value.length > 0
})

function toggleExpand(subId) {
  const idx = expandedGroups.value.indexOf(subId)
  if (idx === -1) expandedGroups.value.push(subId)
  else expandedGroups.value.splice(idx, 1)
}

function toggleProxy(name) {
  const idx = store.clashNodeSelector.tempSelected.indexOf(name)
  if (idx === -1) store.clashNodeSelector.tempSelected.push(name)
  else store.clashNodeSelector.tempSelected.splice(idx, 1)
}

function removeProxy(name) {
  const idx = store.clashNodeSelector.tempSelected.indexOf(name)
  if (idx !== -1) store.clashNodeSelector.tempSelected.splice(idx, 1)
}

function selectAll() {
  const all = [
    ...filteredGroupNames.value,
    ...groupResources.value.map(r => r.name),
    ...['DIRECT', 'REJECT'],
    ...store.clashNodeSelector.allNodeNames
  ]
  store.clashNodeSelector.tempSelected = [...new Set(all)]
}

function confirmSelection() {
  const groupIdx = store.clashNodeSelector.currentGroup
  if (groupIdx !== null && store.groupForm.clash_config.groups[groupIdx]) {
    store.groupForm.clash_config.groups[groupIdx].proxies = [...store.clashNodeSelector.tempSelected]
  }
  store.clashNodeSelector.show = false
  showToast('节点选择已保存')
}

// 已选标签拖拽排序
let sortableInstance = null
async function initSortable() {
  if (!selectedTagsRef.value) return
  try {
    const { default: Sortable } = await import('sortablejs')
    if (sortableInstance) sortableInstance.destroy()
    sortableInstance = new Sortable(selectedTagsRef.value, {
      animation: 150,
      ghostClass: 'opacity-30',
      onEnd: () => {
        const names = Array.from(selectedTagsRef.value.children)
          .filter(el => el.dataset.name)
          .map(el => el.dataset.name)
        store.clashNodeSelector.tempSelected = names
      }
    })
  } catch (e) { console.error('Sortable init failed:', e) }
}

watch(() => store.clashNodeSelector.tempSelected.length, () => { nextTick(initSortable) })
watch(() => store.clashNodeSelector.show, (show) => {
  if (show) {
    expandedGroups.value = []
    nextTick(initSortable)
  }
})
</script>
