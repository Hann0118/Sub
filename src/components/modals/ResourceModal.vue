<template>
  <dialog class="modal" :class="{ 'modal-open': store.resourceModal.show }">
    <div class="modal-box glass-panel max-w-2xl">
      <h3 class="font-bold text-xl text-adaptive-white mb-6 flex items-center gap-2">
        <i class="fa-solid fa-database text-primary"></i>
        {{ store.resourceModal.isEdit ? '编辑资源' : '添加资源' }}
      </h3>

      <!-- 类型切换（仅新增时显示） -->
      <div v-if="!store.resourceModal.isEdit" class="flex gap-2 mb-4">
        <button class="btn flex-1 gap-2"
          :class="store.resourceForm.type === 'node' ? 'btn-primary' : 'btn-ghost border border-panel-border'"
          @click="store.resourceForm.type = 'node'">
          <i class="fa-solid fa-server"></i> 自建节点
        </button>
        <button class="btn flex-1 gap-2"
          :class="store.resourceForm.type === 'group' ? 'btn-warning' : 'btn-ghost border border-panel-border'"
          @click="store.resourceForm.type = 'group'">
          <i class="fa-solid fa-folder-tree"></i> 节点组
        </button>
      </div>

      <!-- 名称 -->
      <div class="form-control mb-4">
        <label class="label">
          <span class="label-text text-adaptive-muted">
            名称 <span v-if="store.resourceForm.type === 'group'" class="text-error">*</span>
          </span>
        </label>
        <input v-model="store.resourceForm.name" type="text"
          :placeholder="store.resourceForm.type === 'node' ? '留空自动跟随节点链接名称' : '请输入节点组名称（必填）'"
          class="input input-bordered bg-adaptive-input w-full"
          :class="{'input-error': nameError}" />
        <label v-if="nameError" class="label">
          <span class="label-text-alt text-error">节点组名称不能为空</span>
        </label>
      </div>

      <!-- 提示 -->
      <div v-if="!store.resourceModal.isEdit && store.resourceForm.type === 'node'" class="mb-3">
        <div class="alert alert-info py-2 text-xs">
          <i class="fa-solid fa-circle-info"></i>
          支持批量导入：粘贴多条节点链接，每条自动识别为独立资源
        </div>
      </div>

      <!-- 内容 -->
      <div class="form-control mb-6">
        <label class="label"><span class="label-text text-adaptive-muted">内容</span></label>
        <textarea v-model="store.resourceForm.url" rows="5"
          :placeholder="store.resourceForm.type === 'node'
            ? '粘贴节点链接（每行一个）\n支持 vmess://, vless://, ss://, trojan://, hysteria2://, tuic://'
            : '粘贴多条节点链接，将作为一个节点组管理'"
          class="textarea textarea-bordered bg-adaptive-input w-full font-mono text-xs"></textarea>
      </div>

      <div class="modal-action">
        <button class="btn btn-ghost" @click="store.resourceModal.show = false">取消</button>
        <button class="btn" :class="store.resourceForm.type === 'node' ? 'btn-primary' : 'btn-warning'"
          @click="saveResource" :disabled="store.submitting">
          <span v-if="store.submitting" class="loading loading-spinner loading-sm"></span>
          {{ store.resourceModal.isEdit ? '保存修改' : '添加' }}
        </button>
      </div>
    </div>
    <form method="dialog" class="modal-backdrop" @click="store.resourceModal.show = false"></form>
  </dialog>
</template>

<script setup>
import { ref } from 'vue'
import { useMainStore } from '../../stores/main.js'
import { authFetch, loadResources } from '../../api/index.js'
import { showToast, updateLinkName } from '../../utils/helpers.js'
import { API } from '../../api/config.js'

const store = useMainStore()
const nameError = ref(false)

async function saveResource() {
  if (!store.resourceForm.url) { showToast('请输入内容', 'error'); return }

  // 节点组必须填名称
  if (store.resourceForm.type === 'group' && !store.resourceForm.name) {
    nameError.value = true
    return
  }
  nameError.value = false

  store.submitting = true
  try {
    if (store.resourceModal.isEdit) {
      const body = { ...store.resourceForm }
      // 编辑自建节点时，如果改了名称，同步更新链接中的名称
      if (body.type === 'node' && body.name && body.url) {
        body.url = updateLinkName(body.url, body.name)
      }
      await authFetch(`${API}/subs/${body.id}`, { method: 'PUT', body })
    } else {
      await authFetch(`${API}/subs`, { method: 'POST', body: store.resourceForm })
    }
    showToast(store.resourceModal.isEdit ? '修改成功' : '添加成功')
    store.resourceModal.show = false
    loadResources()
  } catch (e) { showToast('操作失败', 'error') }
  store.submitting = false
}
</script>
