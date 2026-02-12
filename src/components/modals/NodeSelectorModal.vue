<template>
  <dialog class="modal" :class="{ 'modal-open': store.nodeSelector.show }">
    <div class="modal-box glass-panel max-w-2xl">
      <h3 class="font-bold text-xl text-adaptive-white mb-4 flex items-center gap-2">
        <i class="fa-solid fa-filter text-accent"></i> 节点筛选 - {{ store.nodeSelector.resourceName }}
      </h3>

      <div v-if="store.nodeSelector.loading" class="text-center py-8">
        <span class="loading loading-spinner loading-lg text-primary"></span>
      </div>

      <div v-else>
        <div class="mb-4 flex gap-2">
          <button class="btn btn-xs" :class="store.nodeSelector.selected === 'all' ? 'btn-primary' : 'btn-ghost'"
            @click="selectAllNodes">全部</button>
          <button class="btn btn-xs" :class="store.nodeSelector.selected === 'custom' ? 'btn-accent' : 'btn-ghost'"
            @click="store.nodeSelector.selected = 'custom'">自定义</button>
        </div>

        <div v-if="store.nodeSelector.selected === 'custom'"
          class="space-y-1 max-h-64 overflow-y-auto custom-scrollbar">
          <div v-for="(node, i) in store.nodeSelector.nodes" :key="i"
            class="flex items-center gap-2 p-2 rounded-lg bg-adaptive-input hover:bg-primary/10 transition-all cursor-pointer"
            @click="toggleNodeSelection(i)">
            <input type="checkbox" class="checkbox checkbox-primary checkbox-xs"
              :checked="store.nodeSelector.tempSelected.includes(i)" @click.stop="toggleNodeSelection(i)" />
            <span class="text-sm text-adaptive-white truncate">{{ node.name || `节点 ${i + 1}` }}</span>
          </div>
        </div>
      </div>

      <div class="modal-action">
        <button class="btn btn-ghost" @click="cancel">取消</button>
        <button class="btn btn-accent" @click="confirm">确认筛选</button>
      </div>
    </div>
    <form method="dialog" class="modal-backdrop" @click="cancel"></form>
  </dialog>
</template>

<script setup>
import { useMainStore } from '../../stores/main.js'
import { showToast } from '../../utils/helpers.js'

const store = useMainStore()

function selectAllNodes() {
  store.nodeSelector.selected = 'all'
  store.nodeSelector.tempSelected = store.nodeSelector.nodes.map((_, i) => i)
}

function toggleNodeSelection(idx) {
  store.nodeSelector.selected = 'custom'
  const pos = store.nodeSelector.tempSelected.indexOf(idx)
  if (pos === -1) store.nodeSelector.tempSelected.push(idx)
  else store.nodeSelector.tempSelected.splice(pos, 1)
}

function confirm() {
  // 更新聚合组配置中的筛选信息
  const resId = store.nodeSelector.resourceId
  const configItem = store.groupForm.config.find(c => c.subId === resId)
  if (configItem) {
    if (store.nodeSelector.selected === 'all') {
      delete configItem.filter
      delete configItem.selectedNodes
      delete configItem.include
    } else {
      configItem.selectedNodes = store.nodeSelector.tempSelected
      const selectedNames = store.nodeSelector.tempSelected.map(i => store.nodeSelector.nodes[i]?.name || '').filter(Boolean)
      configItem.filter = `${selectedNames.length}/${store.nodeSelector.nodes.length}个节点`
      configItem.include = selectedNames
    }
  }
  store.nodeSelector.show = false
  showToast('筛选已应用')
}

function cancel() {
  store.nodeSelector.show = false
}
</script>
