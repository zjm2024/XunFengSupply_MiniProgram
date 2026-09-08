﻿<template>
  <AppPageShell>
    <template #header>
      <app-header title="产品手册" :show-back="true" />
    </template>

    <template #content>
      <AppContent>
        <view class="content">
          <view v-for="item in manuals" :key="item.id" class="manual-item" @click="preview(item)">
            <view class="pdf-icon"><text>PDF</text></view>
            <view class="manual-info">
              <text class="manual-title">{{ item.title }}</text>
              <text class="manual-meta">{{ item.size }} · 更新于 {{ item.date }}</text>
            </view>
            <button class="preview-btn">预览</button>
          </view>
        </view>
      </AppContent>
    </template>
  </AppPageShell>
</template>

<script setup>
import { ref } from 'vue'
import appHeader from '@/shared/ui/AppHeader/AppHeader.vue'
import AppPageShell from '@/shared/ui/AppPageShell/AppPageShell.vue'
import AppContent from '@/shared/ui/AppContent/AppContent.vue'
import { navigator } from '@/app/navigation/navigator.js'
import { routes } from '@/app/config/routes.js'

const manuals = ref([
  { id: '1', title: '2026 产品电子手册', size: '18.6 MB', date: '08/10' },
  { id: '2', title: '2026 秋季新品图册', size: '12.3 MB', date: '08/05' },
  { id: '3', title: '技术参数说明书', size: '5.8 MB', date: '07/20' }
])

function preview(item) {
  navigator.navigateTo(routes.content.manualPreview(item.id))
}
</script>

<style lang="scss" scoped>
.content {
  padding-bottom: env(safe-area-inset-bottom);
}

.manual-item {
  display: grid;
  grid-template-columns: 48px 1fr auto;
  gap: 10px;
  align-items: center;
  background: white;
  border: 1px solid #EFEFF1;
  border-radius: 12px;
  padding: 14px;
  margin-bottom: 10px;

  &:active {
    background: #FCFCFD;
  }
}

.pdf-icon {
  width: 44px;
  height: 52px;
  border: 1px solid #DEDFE3;
  border-radius: 6px;
  display: grid;
  place-items: center;
  color: #D7192D;
  font-size: 10px;
  font-weight: 700;
}

.manual-title {
  font-size: 15px;
  color: #111216;
  display: block;
}

.manual-meta {
  color: #5E626B;
  font-size: 12px;
  margin-top: 2px;
  display: block;
}

.preview-btn {
  border: none;
  color: #D7192D;
  background: transparent;
  font-size: 14px;
  padding: 8px;

  &:active {
    opacity: 0.7;
  }
}
</style>
