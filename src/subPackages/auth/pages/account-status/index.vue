﻿<!--
  账号冻结提示页（分包：accountSub）
  对应业务流程节点：
  签约准入 → 账号冻结停用拦截页
  全局路由守卫 → 冻结账号强制跳转至此页面
-->
<template>
  <AppPageShell>
    <template #header>
      <AppStatusBarSpacer />
    </template>
    <template #content>
      <AppContent>
        <view class="frozen-page">
          <view class="frozen-icon">
            <AppIcon name="lock" size="120rpx" color="#F56C6C" :stroke-width="1.6" />
          </view>
          
          <text class="frozen-title">账号已被冻结</text>
          <text class="frozen-reason">{{ frozenReason || '您的账号因违规操作已被暂时冻结' }}</text>
          
          <view class="frozen-tips">
            <text class="tips-title">可能的原因：</text>
            <text class="tips-item">• 多次逾期未付款</text>
            <text class="tips-item">• 恶意拒收商品</text>
            <text class="tips-item">• 违反平台交易规则</text>
            <text class="tips-item">• 资质信息异常</text>
          </view>

          <view class="action-buttons">
            <button class="contact-btn" @click="contactService">联系客服申诉</button>
            <button class="back-btn" @click="goBack">返回</button>
          </view>
        </view>
      </AppContent>
    </template>
  </AppPageShell>
</template>

<script setup>
import { ref } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import { useUserStore } from '@/shared/session/userStore.js'
import AppPageShell from '@/shared/ui/AppPageShell/AppPageShell.vue'
import AppContent from '@/shared/ui/AppContent/AppContent.vue'
import AppIcon from '@/shared/ui/AppIcon/AppIcon.vue'
import AppStatusBarSpacer from '../../../../shared/ui/AppStatusBarSpacer/AppStatusBarSpacer.vue'
import { navigator } from '@/app/navigation/navigator.js'
import { LOGIN } from '@/app/config/routes.js'

const userStore = useUserStore()
const frozenReason = ref('')

onLoad((options) => {
  if (options.reason) {
    frozenReason.value = decodeURIComponent(options.reason)
  }
})

/**
 * 联系客服申诉
 */
// TODO: 接入真实客服电话
function contactService() {
  uni.showModal({
    title: '联系客服',
    content: '请拨打经销商服务热线',
    showCancel: false
  })
}

/**
 * 返回上一页或退出
 */
function goBack() {
  // 清除登录态并返回登录页
  userStore.logout()
  navigator.reLaunch(LOGIN)
}
</script>

<style lang="scss" scoped>
.frozen-page {
  min-height: 100%;
  background: #fff;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding-top: 200rpx;
  
  .frozen-icon {
    margin-bottom: 40rpx;
  }
  
  .frozen-title {
    font-size: 40rpx;
    font-weight: 700;
    color: var(--text-primary);
    margin-bottom: 20rpx;
  }
  
  .frozen-reason {
    font-size: 28rpx;
    color: var(--text-secondary);
    max-width: 600rpx;
    text-align: center;
    line-height: 1.6;
    margin-bottom: 48rpx;
  }
  
  .frozen-tips {
    width: 620rpx;
    background: #FFF7F7;
    border-radius: 12rpx;
    padding: 28rpx 32rpx;
    margin-bottom: 60rpx;
    
    .tips-title {
      display: block;
      font-size: 26rpx;
      color: var(--text-primary);
      font-weight: 600;
      margin-bottom: 16rpx;
    }
    
    .tips-item {
      display: block;
      font-size: 26rpx;
      color: var(--text-secondary);
      line-height: 2;
    }
  }
  
  .action-buttons {
    display: flex;
    gap: 24rpx;
    
    .contact-btn, .back-btn {
      width: 260rpx;
      height: 84rpx;
      line-height: 84rpx;
      border-radius: 42rpx;
      font-size: 30rpx;
      border: none;
    }
    
    .contact-btn {
      background: var(--primary-color);
      color: #fff;
    }
    
    .back-btn {
      background: var(--bg-color);
      color: var(--text-secondary);
    }
  }
}
</style>
