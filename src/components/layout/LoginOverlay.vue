<template>
  <div class="fixed inset-0 z-[999] flex items-center justify-center bg-black/70 backdrop-blur-md">
    <div class="card w-full max-w-sm mx-4 glass-panel shadow-2xl overflow-hidden">
      <div class="card-body text-center p-8">
        <div class="mb-6"><i class="fa-solid fa-shield-halved text-6xl text-primary animate-pulse"></i></div>
        <h2 class="card-title justify-center text-2xl text-adaptive-white mb-2">BiaoSUB</h2>
        <p class="text-adaptive-muted text-sm mb-6">请输入管理密码</p>
        <input type="password" v-model="store.loginPassword" placeholder="输入密码..."
          class="input input-bordered w-full bg-adaptive-input text-center text-lg tracking-widest"
          @keyup.enter="handleLogin" />
        <button class="btn btn-primary w-full mt-4" @click="handleLogin" :disabled="store.loginLoading">
          <span v-if="store.loginLoading" class="loading loading-spinner loading-sm"></span>
          {{ store.loginLoading ? '验证中...' : '登录' }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { useMainStore } from '../../stores/main.js'
import { authFetch, loadResources, loadGroups, loadTemplates } from '../../api/index.js'
import { showToast } from '../../utils/helpers.js'
import { API } from '../../api/config.js'

const store = useMainStore()

async function handleLogin() {
  if (!store.loginPassword) return
  store.loginLoading = true
  try {
    const res = await fetch(`${API}/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password: store.loginPassword })
    })
    const data = await res.json()
    if (data.success) {
      store.isLoggedIn = true
      localStorage.setItem('auth_token', store.loginPassword)
      store.loginPassword = ''
      loadResources()
      loadGroups()
      loadTemplates()
      showToast('登录成功')
    } else {
      showToast('密码错误', 'error')
    }
  } catch (e) {
    showToast('登录失败', 'error')
  }
  store.loginLoading = false
}

defineExpose({ handleLogin })
</script>
