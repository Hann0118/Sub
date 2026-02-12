<template>
  <div class="tabs tabs-boxed glass-panel mb-4 sm:mb-8 p-1.5 shadow-xl border border-panel-border overflow-hidden">
    <a class="tab tab-sm sm:tab-lg flex-1 transition-all duration-300 gap-1 sm:gap-2 !h-10 sm:!h-12"
      :class="{'tab-active bg-primary text-white shadow-md': store.currentTab === 'resources'}"
      @click="store.currentTab = 'resources'">
      <i class="fa-solid fa-database text-lg"></i> <span class="font-bold">资源池</span>
    </a>
    <a class="tab tab-sm sm:tab-lg flex-1 transition-all duration-300 gap-1 sm:gap-2 !h-10 sm:!h-12"
      :class="{'tab-active bg-accent text-white shadow-md': store.currentTab === 'groups'}"
      @click="store.currentTab = 'groups'">
      <i class="fa-solid fa-layer-group text-lg"></i> <span class="font-bold">聚合订阅组</span>
    </a>
  </div>
</template>

<script setup>
import { useMainStore } from '../../stores/main.js'
const store = useMainStore()
</script>
