﻿<template>
  <AppPageShell>
    <template #header>
      <app-header title="优惠券" :show-back="true" />
    </template>

    <template #content>
      <AppContent>
        <view class="content">
          <!-- Tab 切换，改用带数量的renderTabs -->
         <view class="segment-tabs">
            <view class="tabs-inner">
              <button v-for="tab in renderTabs" :key="tab.key" class="tab-btn"
                :class="{ 'is-active': activeTab === tab.key }" @click="activeTab = tab.key">{{ tab.label }}</button>
            </view>
          </view>

          <!-- 优惠券列表 -->
          <view class="voucher-list">
            <view v-for="item in filteredList" :key="item.id" class="voucher-card" :class="{ 'is-disabled': item.status === 'expired' || item.status === 'used' }">
              <!-- 左侧金额 -->
              <view class="voucher-left">
                <view class="amount-wrapper">
                  <text class="currency">¥</text>
                  <text class="amount">{{ item.amount }}</text>
                </view>
                <text class="condition">满{{ item.minAmount }}可用</text>
              </view>

              <!-- 分割线 -->
              <view class="divider">
                <view class="divider-circle top"></view>
                <view class="divider-line"></view>
                <view class="divider-circle bottom"></view>
              </view>

              <!-- 右侧信息 -->
              <view class="voucher-right">
                <text class="voucher-name">{{ item.name }}</text>
                <text class="voucher-time">{{ item.startTime }} - {{ item.endTime }}</text>
                <text class="voucher-scope">{{ item.scope }}</text>

                <!-- 操作按钮 -->
                <button
                  v-if="item.status === 'available'"
                  class="use-btn"
                  @click="useVoucher(item)"
                >立即使用</button>
                <status-tag-new
                  v-else-if="item.status === 'used'"
                  type="default"
                  text="已使用"
                />
                <status-tag-new
                  v-else-if="item.status === 'expired'"
                  type="default"
                  text="已过期"
                />
              </view>
            </view>

            <!-- 空状态 -->
            <AppPageState
              v-if="filteredList.length === 0"
              state="empty"
              title="暂无优惠券"
              description="可输入上方兑换码领取优惠券，关注平台营销活动"
            >
              <template #illustration>
                <AppSvgIllustration :svg="noCouponSvg" size="lg" />
              </template>
            </AppPageState>
          </view>

          <view class="bottom-spacer"></view>
        </view>
      </AppContent>
    </template>
  </AppPageShell>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import appHeader from '@/shared/ui/AppHeader/AppHeader.vue'
import statusTagNew from '@/shared/ui/StatusTag/StatusTag.vue'
import AppPageState from '@/shared/ui/AppPageState/AppPageState.vue'
import AppPageShell from '@/shared/ui/AppPageShell/AppPageShell.vue'
import AppContent from '@/shared/ui/AppContent/AppContent.vue'
import AppSvgIllustration from '@/shared/ui/AppSvgIllustration/AppSvgIllustration.vue'
import noCouponSvg from '../../../../shared/assets/illustrations/no-coupon.svg?raw'

const tabs = [
  { key: 'available', label: '可使用', count: 0 },
  { key: 'used', label: '已使用', count: 0 },
  { key: 'expired', label: '已过期', count: 0 }
]

const activeTab = ref('available')
const exchangeCode = ref('')
const exchangeLoading = ref(false)

const voucherList = ref([])

// 按状态统计数量
const tabCountInfo = computed(()=>{
  const available = voucherList.value.filter(i=>i.status === 'available').length
  const used = voucherList.value.filter(i=>i.status === 'used').length
  const expired = voucherList.value.filter(i=>i.status === 'expired').length
  return {available,used,expired}
})
// 给tab追加数量
const renderTabs = computed(()=>{
  return tabs.map(tab=>{
    return {...tab, label: `${tab.label}(${tabCountInfo.value[tab.key]})`}
  })
})

const filteredList = computed(() => {
  return voucherList.value.filter(item => item.status === activeTab.value)
})

function useVoucher(item) {
  uni.showToast({ title: '跳转至商品列表', icon: 'none' })
}

// 兑换逻辑增加loading、去空格、防重复提交
function exchangeVoucher() {
  const code = exchangeCode.value.trim()
  if (!code) {
    uni.showToast({ title: '请输入兑换码', icon: 'none' })
    return
  }
  if(exchangeLoading.value) return
  exchangeLoading.value = true
  uni.showLoading({ title: '兑换中...' })
  setTimeout(() => {
    uni.hideLoading()
    uni.showToast({ title: '兑换成功', icon: 'success' })
    exchangeCode.value = ''
    exchangeLoading.value = false
    // 兑换成功后重新拉取优惠券列表
    // fetchVoucherList()
  }, 1000)
}
// 回车触发兑换
function onExchangeEnter() {
  exchangeVoucher()
}
</script>


<style lang="scss" scoped>
.content {
  padding-bottom: env(safe-area-inset-bottom);
}

.segment-tabs {
  border-bottom: 1px solid #EFEFF1;
  margin-bottom: 16px;
}

.tabs-inner {
  display: flex;
  justify-content: center; /* 核心：整体居中 */
  gap: 32px; /* 增大tab之间距离，原来18px → 32px，更宽松好看 */
}

.tab-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 44px;
  padding: 0 4px;
  white-space: nowrap;
  border: none;
  background: transparent;
  color: #5E626B;
  font-size: 14px;

  &.is-active {
    color: #D7192D;
    border-bottom: 2px solid #D7192D;
    font-weight: 650;
  }
}


.voucher-list {
  display: grid;
  gap: 12px;
}

.voucher-card {
  display: flex;
  background: linear-gradient(135deg, #D7192D 0%, #E8384F 100%);
  border-radius: 10px;
  overflow: hidden;

  &.is-disabled {
    background: linear-gradient(135deg, #B0B0B0 0%, #C0C0C0 100%);
  }
}

.voucher-left {
  width: 110px; /* 稳定 px */
  padding: 16px 12px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: white;
}

.amount-wrapper {
  display: flex;
  align-items: baseline;
}

.currency {
  font-size: 14px; /* 稳定 px */
  font-weight: 600;
}

.amount {
  font-size: 32px; /* 稳定 px */
  font-weight: 700;
  line-height: 1;
}

.condition {
  font-size: 11px;
  margin-top: 4px;
  opacity: 0.9;
}

.divider {
  position: relative;
  width: 12px; /* 稳定 px */
  display: flex;
  flex-direction: column;
  align-items: center;
}

.divider-circle {
  width: 16px; /* 稳定 px */
  height: 16px;
  background: #F7F7F8;
  border-radius: 50%;
  flex-shrink: 0;

  &.top {
    margin-top: -8px;
  }

  &.bottom {
    margin-bottom: -8px;
  }
}

.divider-line {
  width: 1px;
  flex: 1;
  background: repeating-linear-gradient(
    to bottom,
    #F7F7F8 0,
    #F7F7F8 6px,
    transparent 6px,
    transparent 10px
  );
  margin: 4px 0;
}

.voucher-right {
  flex: 1;
  padding: 12px;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  color: white;
}

.voucher-name {
  font-size: 15px; /* 稳定 px */
  font-weight: 600;
  display: block;
}

.voucher-time {
  font-size: 11px;
  opacity: 0.85;
  margin-top: 4px;
  display: block;
}

.voucher-scope {
  font-size: 11px;
  opacity: 0.75;
  margin-top: 2px;
  display: block;
}

.use-btn {
  align-self: flex-start;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 28px; /* 稳定 px */
  padding: 0 12px;
  margin-top: 8px;
  background: white;
  color: #D7192D;
  font-size: 12px;
  font-weight: 600;
  border: none;
  border-radius: 14px;

  &:active {
    opacity: 0.9;
  }
}

/* 兑换区域 */
.exchange-section {
  margin-top: 16px;
}

.exchange-card {
  background: white;
  border: 1px solid #EFEFF1; /* 稳定 px */
  border-radius: 12px;
  padding: 16px;
}

.exchange-title {
  font-size: 15px; /* 稳定 px */
  font-weight: 600;
  color: #111216;
  display: block;
  margin-bottom: 12px;
}

.exchange-input-wrapper {
  display: flex;
  gap: 8px;
}

.exchange-input {
  flex: 1;
  height: 40px; /* 稳定 px */
  padding: 0 12px;
  background: #F7F7F8;
  border: 1px solid #EFEFF1;
  border-radius: 7px;
  font-size: 14px;
  color: #111216;

  &:focus {
    border-color: #D7192D;
  }
}

.placeholder {
  color: #989BA5;
}

.exchange-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  min-width: 80px; /* 稳定 px */
  height: 40px;
  background: #D7192D;
  color: white;
  font-size: 14px;
  font-weight: 600;
  border: none;
  border-radius: 7px;

  &:active {
    background: #B91224;
  }
}

.bottom-spacer {
  height: 24px;
}
.exchange-section {
  margin: 16px 0;
}
.exchange-tip {
  margin-top: 8px;
  font-size: 12px;
  color: #5E626B;
  display: block;
}
.exchange-btn {
  &[disabled] {
    opacity: 0.6;
  }
}

</style>
