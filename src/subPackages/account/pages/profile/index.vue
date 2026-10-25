﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿<template>
  <view class="page">
    <app-header :show-back="true" :title="t('account.titles.profile')" @back="goBack" />
    <scroll-view class="page-scroll" scroll-y>
      <view class="content">
        <view class="form-card">
          <view class="data-row"><text class="row-label">{{ t('account.profile.dealerName') }}</text><text class="row-value">华东体育用品经销商</text></view>
          <view class="data-row"><text class="row-label">{{ t('account.profile.customerId') }}</text><text class="row-value">XF-310082</text></view>
          <view class="data-row"><text class="row-label">{{ t('account.profile.grade') }}</text><text class="row-value">B 类客户</text></view>
          <view class="data-row"><text class="row-label">{{ t('account.profile.status') }}</text><status-tag-new type="success" text="正常" /></view>
          <view class="data-row"><text class="row-label">{{ t('account.profile.contact') }}</text><text class="row-value">张先生</text></view>
          <view class="data-row"><text class="row-label">{{ t('account.profile.phone') }}</text><text class="row-value">138 **** 5678</text></view>
        </view>
        <button class="save-btn" @click="save">{{ t('account.profile.save') }}</button>
      </view>
    </scroll-view>
  </view>
</template>

<script setup>
import { t } from '@/shared/i18n/index.js'
import '@/subPackages/account/i18n/register.js'
import appHeader from '@/shared/ui/AppHeader/AppHeader.vue'
import statusTagNew from '@/shared/ui/StatusTag/StatusTag.vue'
import { navigator } from '@/app/navigation/navigator.js'

function goBack() { navigator.back() }
/** 保留资料页占位保存动作，仅按当前语言显示反馈。 */
function save() { uni.showToast({ title: t('account.profile.saved'), icon: 'success' }) }
</script>

<style lang="scss" scoped>
.page { height: 100vh; height: 100dvh; display: flex; overflow: hidden; flex-direction: column; background: #F7F7F8; }
.page-scroll { flex: 1; min-height: 0; }
.content { padding: 24rpx 32rpx; max-width: 1200rpx; margin: 0 auto; }

.form-card { background: rgba(255,255,255,.74); border-radius: 24rpx; overflow: hidden; box-shadow: 0 10px 28px rgba(55,65,80,.07); -webkit-backdrop-filter: blur(16px); backdrop-filter: blur(16px); }
.data-row {
  display: grid; grid-template-columns: 1fr auto; gap: 20rpx;
  padding: 26rpx 32rpx; border-top: 2rpx solid #EFEFF1;
  &:first-child { border-top: none; }
}
.row-label { font-size: 14px; color: #5E626B; }
.row-value { font-size: 14px; color: #111216; font-weight: 500; text-align: right; }

.save-btn { display: flex; align-items: center; justify-content: center; width: 100%; height: 96rpx; margin-top: 48rpx; background: #D7192D; color: white; font-size: 15px; font-weight: 650; border: none; border-radius: 20rpx; &:active { background: #B91224; } }
</style>
