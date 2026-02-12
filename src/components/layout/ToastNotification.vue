<template>
  <div v-if="store.toast.show" class="toast toast-bottom toast-end z-50">
    <div class="alert shadow-lg text-white"
      :class="store.toast.type === 'success' ? 'alert-success' : 'alert-error'">
      <span>{{ store.toast.message }}</span>
    </div>
  </div>
</template>

<script setup>
import { useMainStore } from '../../stores/main.js'
const store = useMainStore()
</script>
