<template>
  <view class="page">
    <app-header :show-back="true" :title="'账户资料'" @back="goBack" />
    <scroll-view class="page-scroll" scroll-y :style="{ height: scrollHeight }">
      <view class="content">
        <view class="form-card">
          <view class="data-row"><text class="row-label">经销商名称</text><text class="row-value">华东体育用品经销商</text></view>
          <view class="data-row"><text class="row-label">客户编号</text><text class="row-value">XF-310082</text></view>
          <view class="data-row"><text class="row-label">客户等级</text><text class="row-value">B 类客户</text></view>
          <view class="data-row"><text class="row-label">账号状态</text><status-tag-new type="success" text="正常" /></view>
          <view class="data-row"><text class="row-label">联系人</text><text class="row-value">张先生</text></view>
          <view class="data-row"><text class="row-label">联系电话</text><text class="row-value">138 **** 5678</text></view>
        </view>
        <button class="save-btn" @click="save">保存修改</button>
      </view>
    </scroll-view>
  </view>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import appHeader from '@/components/AppHeader/AppHeader.vue'
import statusTagNew from '@/components/StatusTag/StatusTag.vue'

const scrollHeight = ref('calc(100vh - 100px)')
onMounted(() => { try { const s = uni.getSystemInfoSync(); scrollHeight.value = `calc(100vh - ${(s.statusBarHeight||44) + 56}px)` } catch(e){} })
function goBack() { uni.navigateBack() }
function save() { uni.showToast({ title: '资料已更新', icon: 'success' }) }
</script>

<style lang="scss" scoped>
.page { min-height: 100vh; background: #F7F7F8; }
.page-scroll { flex: 1; }
.content { padding: 24rpx 32rpx; max-width: 1200rpx; margin: 0 auto; }

.form-card { background: white; border: 2rpx solid #EFEFF1; border-radius: 24rpx; overflow: hidden; }
.data-row {
  display: grid; grid-template-columns: 1fr auto; gap: 20rpx;
  padding: 26rpx 32rpx; border-top: 2rpx solid #EFEFF1;
  &:first-child { border-top: none; }
}
.row-label { font-size: 28rpx; color: #5E626B; }
.row-value { font-size: 28rpx; color: #111216; font-weight: 500; text-align: right; }

.save-btn { width: 100%; height: 96rpx; margin-top: 48rpx; background: #D7192D; color: white; font-size: 30rpx; font-weight: 650; border: none; border-radius: 20rpx; &:active { background: #B91224; } }
</style>
