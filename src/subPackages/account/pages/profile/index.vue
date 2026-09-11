﻿﻿﻿﻿﻿﻿﻿﻿﻿<template>
  <view class="page">
    <app-header :show-back="true" :title="'账户资料'" @back="goBack" />
    <scroll-view class="page-scroll" scroll-y>
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
import appHeader from '@/shared/ui/AppHeader/AppHeader.vue'
import statusTagNew from '@/shared/ui/StatusTag/StatusTag.vue'
import { navigator } from '@/app/navigation/navigator.js'

function goBack() { navigator.back() }
function save() { uni.showToast({ title: '资料已更新', icon: 'success' }) }
</script>

<style lang="scss" scoped>
.page { height: 100vh; height: 100dvh; display: flex; overflow: hidden; flex-direction: column; background: #F7F7F8; }
.page-scroll { flex: 1; min-height: 0; }
.content { padding: 24rpx 32rpx; max-width: 1200rpx; margin: 0 auto; }

.form-card { background: white; border: 2rpx solid #EFEFF1; border-radius: 24rpx; overflow: hidden; }
.data-row {
  display: grid; grid-template-columns: 1fr auto; gap: 20rpx;
  padding: 26rpx 32rpx; border-top: 2rpx solid #EFEFF1;
  &:first-child { border-top: none; }
}
.row-label { font-size: 28rpx; color: #5E626B; }
.row-value { font-size: 28rpx; color: #111216; font-weight: 500; text-align: right; }

.save-btn { display: flex; align-items: center; justify-content: center; width: 100%; height: 96rpx; margin-top: 48rpx; background: #D7192D; color: white; font-size: 30rpx; font-weight: 650; border: none; border-radius: 20rpx; &:active { background: #B91224; } }
</style>
