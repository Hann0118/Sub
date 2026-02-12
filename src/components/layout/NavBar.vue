<template>
  <div class="navbar glass-panel rounded-2xl mb-4 sm:mb-8 shadow-xl px-2 sm:px-4">
    <div class="flex-1">
      <a class="btn btn-ghost normal-case text-lg sm:text-2xl font-bold text-adaptive-white">
        <i class="fa-solid fa-bolt text-yellow-500 mr-2"></i> BiaoSUB
      </a>
    </div>
    <div class="flex-none flex gap-1">
      <button @click="toggleTheme" class="btn btn-circle btn-sm sm:btn-md btn-ghost tooltip tooltip-bottom"
        :data-tip="store.theme === 'dark' ? '切换亮色' : '切换深色'">
        <i v-if="store.theme === 'dark'" class="fa-solid fa-sun text-xl text-yellow-400"></i>
        <i v-else class="fa-solid fa-moon text-xl text-adaptive-muted"></i>
      </button>
      <button @click="$emit('openSettings')" class="btn btn-circle btn-sm sm:btn-md btn-ghost tooltip tooltip-bottom"
        data-tip="设置"><i class="fa-solid fa-gear text-xl"></i></button>
      <button @click="logout" class="btn btn-circle btn-sm sm:btn-md btn-ghost text-red-400 tooltip tooltip-bottom"
        data-tip="退出"><i class="fa-solid fa-power-off text-xl"></i></button>
    </div>
  </div>
</template>

<script setup>
import { useMainStore } from '../../stores/main.js'
import { showToast } from '../../utils/helpers.js'

const store = useMainStore()

defineEmits(['openSettings'])

function toggleTheme() {
  store.theme = store.theme === 'dark' ? 'light' : 'dark'
  document.documentElement.setAttribute('data-theme', store.theme)
  localStorage.setItem('theme', store.theme)
}

function logout() {
  store.isLoggedIn = false
  localStorage.removeItem('auth_token')
  showToast('已退出登录')
}
</script>
