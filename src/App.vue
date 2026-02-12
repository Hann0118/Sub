<template>
  <div :data-theme="store.theme" class="min-h-screen">
    <!-- 登录遮罩 -->
    <LoginOverlay v-if="!store.isLoggedIn" />

    <!-- 主应用 -->
    <div v-if="store.isLoggedIn" class="max-w-5xl mx-auto px-3 sm:px-4 py-4 sm:py-8">
      <NavBar @openSettings="store.settingsModal.show = true" />
      <Dashboard />
    </div>

    <!-- 模态框 -->
    <ResourceModal />
    <GroupModal @openNodeSelector="handleOpenNodeSelector" @openClashNodeSelector="handleOpenClashNodeSelector" />
    <TemplateModal />
    <NodeSelectorModal />
    <ClashNodeSelectorModal />
    <PreviewModal />
    <SettingsModal />
    <RemoteModal />

    <!-- Toast -->
    <ToastNotification />
  </div>
</template>

<script setup>
import { onMounted } from 'vue'
import { useMainStore } from './stores/main.js'
import { loadResources, loadGroups, loadTemplates, authFetch } from './api/index.js'
import { API } from './api/config.js'

// Layout
import LoginOverlay from './components/layout/LoginOverlay.vue'
import NavBar from './components/layout/NavBar.vue'
import ToastNotification from './components/layout/ToastNotification.vue'

// Views
import Dashboard from './views/Dashboard.vue'

// Modals
import ResourceModal from './components/modals/ResourceModal.vue'
import GroupModal from './components/modals/GroupModal.vue'
import TemplateModal from './components/modals/TemplateModal.vue'
import NodeSelectorModal from './components/modals/NodeSelectorModal.vue'
import ClashNodeSelectorModal from './components/modals/ClashNodeSelectorModal.vue'
import PreviewModal from './components/modals/PreviewModal.vue'
import SettingsModal from './components/modals/SettingsModal.vue'
import RemoteModal from './components/modals/RemoteModal.vue'

const store = useMainStore()

// 初始化
onMounted(() => {
  // 初始化主题
  const savedTheme = localStorage.getItem('theme') || 'dark'
  store.theme = savedTheme
  document.documentElement.setAttribute('data-theme', savedTheme)

  // 自动登录
  const token = localStorage.getItem('auth_token')
  if (token) {
    store.isLoggedIn = true
    loadResources()
    loadGroups()
    loadTemplates()
  }
})

// 节点筛选器打开
async function handleOpenNodeSelector(resource) {
  store.nodeSelector.resourceId = resource.id
  store.nodeSelector.resourceName = resource.name
  store.nodeSelector.loading = true
  store.nodeSelector.show = true

  try {
    const res = await authFetch(`${API}/check`, {
      method: 'POST',
      body: { url: resource.url }
    })
    if (res.success) {
      store.nodeSelector.nodes = res.data.nodes || []
      // 恢复已有选择
      const configItem = store.groupForm.config.find(c => c.subId === resource.id)
      if (configItem && configItem.selectedNodes) {
        store.nodeSelector.tempSelected = [...configItem.selectedNodes]
        store.nodeSelector.selected = 'custom'
      } else {
        store.nodeSelector.tempSelected = store.nodeSelector.nodes.map((_, i) => i)
        store.nodeSelector.selected = 'all'
      }
    }
  } catch (e) {
    store.nodeSelector.nodes = []
  }
  store.nodeSelector.loading = false
}

// Clash 策略组节点选择器打开
async function handleOpenClashNodeSelector(groupIndex) {
  store.clashNodeSelector.currentGroup = groupIndex
  store.clashNodeSelector.loading = true
  store.clashNodeSelector.show = true

  // 收集所有节点名，按资源分组
  const allNodes = []
  const nodesByResource = []
  const targetConfig = store.groupForm.config

  for (const item of targetConfig) {
    const resource = store.resources.find(r => r.id === item.subId)
    if (resource) {
      try {
        const res = await authFetch(`${API}/check`, { method: 'POST', body: { url: resource.url } })
        if (res.success && res.data.nodes) {
          const resourceNodes = []
          res.data.nodes.forEach(n => {
            if (n.name && !allNodes.includes(n.name)) {
              allNodes.push(n.name)
              resourceNodes.push(n.name)
            }
          })
          nodesByResource.push({
            subId: resource.id,
            name: resource.name,
            type: resource.type,  // 'node' | 'group' | 'remote'
            nodes: resourceNodes
          })
        }
      } catch (e) { /* 忽略 */ }
    }
  }

  store.clashNodeSelector.allNodeNames = allNodes
  store.clashNodeSelector.nodesByResource = nodesByResource
  store.clashNodeSelector.allGroupNames = store.groupForm.clash_config.groups.map(g => g.name).filter(Boolean)

  // 恢复已有选择
  const pg = store.groupForm.clash_config.groups[groupIndex]
  store.clashNodeSelector.tempSelected = pg && pg.proxies ? [...pg.proxies] : []

  store.clashNodeSelector.loading = false
}
</script>
