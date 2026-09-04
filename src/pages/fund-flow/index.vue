<template>
  <AppPageShell>
    <template #header>
      <app-header title="资金流水" :show-back="true" />
    </template>

    <template #content>
      <AppContent>
        <view class="content">
          <view class="list-card">
            <text class="list-title">近期资金流水</text>
            <view v-for="item in flows" :key="item.id" class="data-row">
              <view><text class="row-name">{{ item.title }}</text><text class="row-desc">{{ item.desc }}</text></view>
              <text class="row-amount" :class="item.type">{{ item.amount }}</text>
            </view>
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

const flows = ref([
  { id: 1, title: '订单付款', desc: '今天 10:32 · PO20260810001', amount: '−¥12,600', type: 'negative' },
  { id: 2, title: '充值到账', desc: '08-20 11:08 · 线上充值', amount: '+¥50,000', type: 'positive' },
  { id: 3, title: '对账还款', desc: '08-18 16:45', amount: '−¥20,000', type: 'negative' }
])
</script>

<style lang="scss" scoped>
.content {
  padding-bottom: env(safe-area-inset-bottom);
}

.list-card {
  background: white;
  border: 1px solid #EFEFF1; /* 稳定 px */
  border-radius: 12px;
  padding: 16px;
}

.list-title {
  font-size: 16px; /* 稳定 px */
  font-weight: 600;
  color: #111216;
  display: block;
  margin-bottom: 12px;
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
  align-self: center;
  font-variant-numeric: tabular-nums;

  &.positive { color: #168A52; }
  &.negative { color: #B42318; }
}
</style>
