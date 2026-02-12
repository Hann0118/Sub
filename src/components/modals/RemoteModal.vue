<template>
  <dialog class="modal" :class="{ 'modal-open': store.remoteModal.show }">
    <div class="modal-box glass-panel max-w-2xl">
      <h3 class="font-bold text-xl text-adaptive-white mb-6 flex items-center gap-2">
        <i class="fa-solid fa-globe text-success"></i> 远程订阅
      </h3>

      <!-- 订阅链接 -->
      <div class="form-control mb-4">
        <label class="label"><span class="label-text text-adaptive-muted">订阅链接</span></label>
        <input v-model="store.remoteModal.url" type="text" placeholder="https://..."
          class="input input-bordered bg-adaptive-input w-full" />
      </div>

      <!-- 名称（可选） -->
      <div class="form-control mb-4">
        <label class="label"><span class="label-text text-adaptive-muted">名称（可选）</span></label>
        <input v-model="store.remoteModal.name" type="text" placeholder="自动识别"
          class="input input-bordered bg-adaptive-input w-full" />
      </div>

      <!-- UA 选择（新增） -->
      <div class="form-control mb-6">
        <label class="label">
          <span class="label-text text-adaptive-muted">客户端标识 (User-Agent)</span>
          <div class="tooltip tooltip-left" data-tip="若导入失败或节点不全，请尝试切换此选项">
            <i class="fa-regular fa-circle-question text-adaptive-muted opacity-60"></i>
          </div>
        </label>
        <select v-model="store.remoteModal.ua" class="select select-bordered bg-adaptive-input w-full">
          <option value="clash-verge/v1.7.7">Clash Verge (默认 - 获取 YAML)</option>
          <option value="v2rayNG/1.8.5">v2rayNG (通用 - 获取 Base64 节点列表)</option>
          <option value="ClashMeta/1.0">Clash Meta (Meta 格式)</option>
        </select>
        <label class="label">
           <span class="label-text-alt text-adaptive-muted text-opacity-50">
             某些机场的通用链接会根据客户端标识返回不同格式。如果遇到“无法解析”或“节点丢失”，通常切换到 v2rayNG 即可解决。
           </span>
        </label>
      </div>

      <div class="modal-action">
        <button class="btn btn-ghost" @click="store.remoteModal.show = false">取消</button>
        <button class="btn btn-success" @click="submitRemote" :disabled="store.remoteModal.loading">
          <span v-if="store.remoteModal.loading" class="loading loading-spinner loading-sm"></span>
          {{ store.remoteModal.loading ? '获取中...' : '导入' }}
        </button>
      </div>
    </div>
    <form method="dialog" class="modal-backdrop" @click="store.remoteModal.show = false"></form>
  </dialog>
</template>

<script setup>
import { useMainStore } from '../../stores/main.js'
import { authFetch, loadResources } from '../../api/index.js'
import { showToast } from '../../utils/helpers.js'
import { API } from '../../api/config.js'

const store = useMainStore()

async function submitRemote() {
    if (!store.remoteModal.url) { showToast('请输入订阅链接', 'error'); return }

    store.remoteModal.loading = true
    try {
      // 提交时带上 UA 参数
      const res = await authFetch(`${API}/remote`, {
        method: 'POST',
        body: { 
          url: store.remoteModal.url, 
          name: store.remoteModal.name,
          ua: store.remoteModal.ua 
        }
      })
      if (res.success) {
        showToast(`导入成功：${res.data.nodeCount}个节点`)
        store.remoteModal.show = false
        store.remoteModal.url = ''
        store.remoteModal.name = ''
        // UA 保持上次选择，不重置，方便用户连续操作
        loadResources()
      } else {
        showToast(res.error || '导入失败', 'error')
      }
    } catch (e) { showToast('导入失败', 'error') }
    store.remoteModal.loading = false
}
</script>
