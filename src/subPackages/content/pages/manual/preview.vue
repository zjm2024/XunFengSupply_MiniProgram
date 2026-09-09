﻿<template>
  <view class="page">
    <app-header :show-back="true" :title="'手册预览'" @back="goBack" />
    <scroll-view class="page-scroll" scroll-y>
      <view class="content">
        <text class="manual-title">2026 产品电子手册</text>
        <text class="manual-meta">PDF · 18.6 MB · 更新于 2026-08-10</text>
        
        <!-- PDF 预览区域 -->
        <view class="pdf-preview">
          <image src="/static/images/jersey-model.png" mode="widthFix" class="preview-image" />
          <text class="preview-hint">PDF 在线预览功能需要接入真实服务</text>
        </view>

        <button class="download-btn" @click="download">下载手册</button>
        
        <!-- 政策阅读确认 -->
        <view v-if="needConfirm" class="confirm-section">
          <label class="confirm-label"><checkbox :checked="confirmed" @tap="confirmed = !confirmed" /><text>我已阅读并理解以上内容</text></label>
          <button class="confirm-btn" :disabled="!confirmed" @click="handleConfirm">确认已读</button>
        </view>
      </view>
    </scroll-view>
  </view>
</template>

<script setup>
import { ref } from 'vue'
import appHeader from '@/shared/ui/AppHeader/AppHeader.vue'
import { navigator } from '@/app/navigation/navigator.js'

const confirmed = ref(false)
const needConfirm = ref(true)

function goBack() { navigator.back() }
function download() { uni.showToast({ title: '开始下载', icon: 'success' }) }
function handleConfirm() { uni.showToast({ title: '已确认阅读', icon: 'success' }); setTimeout(() => navigator.back(), 1500) }
</script>

<style lang="scss" scoped>
.page { height: 100vh; height: 100dvh; display: flex; overflow: hidden; flex-direction: column; background: #F7F7F8; }
.page-scroll { flex: 1; min-height: 0; }
.content { padding: 32rpx; max-width: 1200rpx; margin: 0 auto; }

.manual-title { font-size: 40rpx; font-weight: 600; color: #111216; display: block; }
.manual-meta { color: #5E626B; font-size: 26rpx; display: block; margin-top: 12rpx; }

.pdf-preview { margin-top: 32rpx; background: white; border-radius: 24rpx; padding: 32rpx; text-align: center; }
.preview-image { width: 100%; border-radius: 16rpx; }
.preview-hint { display: block; color: #989BA3; font-size: 26rpx; margin-top: 24rpx; }

.download-btn, .confirm-btn {
  width: 100%; height: 96rpx; margin-top: 32rpx;
  background: #D7192D; color: white; font-size: 30rpx; font-weight: 650;
  border: none; border-radius: 20rpx;
  
  &:active:not(:disabled) { background: #B91224; }
  &:disabled { background: #EFEFF1; color: #989BA3; }
}

.confirm-section { margin-top: 48rpx; padding-top: 32rpx; border-top: 2rpx solid #EFEFF1; }
.confirm-label { display: flex; align-items: center; gap: 12rpx; font-size: 28rpx; color: #5E626B; margin-bottom: 24rpx; checkbox { accent-color: #D7192D; } }
</style>
