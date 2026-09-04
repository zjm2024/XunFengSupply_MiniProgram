<template>
  <AppPageShell>
    <template #header>
      <app-header title="对账账单" :show-back="true" />
    </template>

    <template #content>
      <AppContent>
        <view class="content">
          <view class="summary-card">
            <text class="card-title">2026 年 8 月账单</text>
            <view class="metrics">
              <view class="metric">
                <text class="m-label">应还</text>
                <text class="m-value">¥86,320</text>
              </view>
              <view class="metric">
                <text class="m-label">已还</text>
                <text class="m-value">¥20,000</text>
              </view>
              <view class="metric">
                <text class="m-label">待还</text>
                <text class="m-value warning">¥66,320</text>
              </view>
            </view>
            <text class="hint">到期日：2026-08-25</text>
          </view>

          <view class="list-card">
            <text class="list-title">账单明细</text>
            <view v-for="item in bills" :key="item.id" class="data-row">
              <view>
                <text class="row-name">{{ item.no }}</text>
                <text class="row-desc">{{ item.desc }}</text>
              </view>
              <text class="row-amount">¥{{ item.amount.toLocaleString() }}</text>
            </view>
            <button class="submit-btn" @click="pay">立即还款</button>
          </view>
        </view>
      </AppContent>
    </template>
  </AppPageShell>
</template>

<script setup>
import { ref } from 'vue'
import appHeader from '@/components/AppHeader/AppHeader.vue'
import AppPageShell from '@/components/AppPageShell/AppPageShell.vue'
import AppContent from '@/components/AppContent/AppContent.vue'

const bills = ref([
  { id: 1, no: 'PO20260810001', desc: '08-10 · 比赛服订单', amount: 28680 },
  { id: 2, no: 'PO20260805003', desc: '08-05 · 羽毛球订单', amount: 18900 }
])

function pay() {
  uni.showToast({ title: '已进入还款流程', icon: 'success' })
}
</script>

<style lang="scss" scoped>
.content {
  padding-bottom: env(safe-area-inset-bottom);
}

.summary-card, .list-card {
  background: white;
  border: 1px solid #EFEFF1; /* 稳定 px */
  border-radius: 12px;
  padding: 16px;
  margin-bottom: 12px;
}

.card-title, .list-title {
  font-size: 16px; /* 稳定 px */
  font-weight: 600;
  color: #111216;
  display: block;
  margin-bottom: 12px;
}

.metrics {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 1px;
  background: #EFEFF1;
  border-radius: 6px;
  overflow: hidden;
  margin-bottom: 8px;
}

.metric {
  background: white;
  padding: 12px 8px;
  text-align: center;
}

.m-label {
  font-size: 11px; /* 稳定 px */
  color: #5E626B;
  display: block;
}

.m-value {
  font-size: 18px; /* 稳定 px */
  font-weight: 600;
  color: #111216;
  font-variant-numeric: tabular-nums;
  display: block;
  margin-top: 3px;

  &.warning {
    color: #B42318;
  }
}

.hint {
  color: #5E626B;
  font-size: 13px;
  display: block;
}

.data-row {
  display: grid;
  grid-template-columns: 1fr auto;
  gap: 10px;
  padding: 13px 0;
  border-top: 1px solid #EFEFF1;

  &:first-of-type {
    border-top: none;
  }
}

.row-name {
  font-size: 14px;
  font-weight: 500;
  color: #111216;
  display: block;
}

.row-desc {
  color: #5E626B;
  font-size: 12px;
  margin-top: 2px;
  display: block;
}

.row-amount {
  font-size: 15px;
  font-weight: 500;
  color: #111216;
  font-variant-numeric: tabular-nums;
  align-self: center;
}

.submit-btn {
  width: 100%;
  height: 48px; /* 稳定 px */
  margin-top: 16px;
  background: #D7192D;
  color: white;
  font-size: 15px;
  font-weight: 650;
  border: none;
  border-radius: 10px;

  &:active {
    background: #B91224;
  }
}
</style>
