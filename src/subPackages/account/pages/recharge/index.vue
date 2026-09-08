<template>
  <AppPageShell>
    <template #header>
      <app-header title="充值中心" :show-back="true" />
    </template>

    <template #content>
      <AppContent>
        <view class="content">
          <view class="summary-card">
            <text class="card-title">账户余额</text>
            <text class="amount">¥26,800.00</text>
            <text class="hint">可用于订单抵扣，不可叠加活动优惠。</text>
          </view>

          <view class="form-card">
            <text class="form-title">充值金额</text>
            <label class="form-label">
              <text>金额（元）</text>
              <input class="form-input" type="number" placeholder="请输入充值金额" />
            </label>
            <view class="quick-amounts">
              <button v-for="a in [5000, 10000, 20000]" :key="a" class="quick-btn" @click="setAmount(a)">¥{{ a.toLocaleString() }}</button>
            </view>
            <label class="form-label">
              <text>充值方式</text>
              <picker :range="['线上充值', '对公充值']" @change="onMethodChange">
                <input class="form-input" :value="payMode" disabled />
              </picker>
            </label>
            <button class="submit-btn" @click="submit">确认充值</button>
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

const payMode = ref('线上充值')

function setAmount(v) {
  uni.showToast({ title: `已选择 ¥${v}`, icon: 'none' })
}

function onMethodChange(e) {
  payMode.value = ['线上充值', '对公充值'][e.detail.value]
}

function submit() {
  uni.showToast({ title: '充值申请已提交', icon: 'success' })
}
</script>

<style lang="scss" scoped>
.content {
  padding-bottom: env(safe-area-inset-bottom);
}

.summary-card, .form-card {
  background: white;
  border: 1px solid #EFEFF1; /* 稳定 px */
  border-radius: 12px;
  padding: 16px;
  margin-bottom: 12px;
}

.card-title {
  font-size: 16px; /* 稳定 px */
  font-weight: 600;
  color: #111216;
  display: block;
}

.amount {
  font-size: 28px; /* 稳定 px */
  font-weight: 700;
  color: #D7192D;
  font-variant-numeric: tabular-nums;
  display: block;
  margin: 8px 0;
}

.hint {
  color: #5E626B;
  font-size: 13px;
  display: block;
}

.form-title {
  font-size: 16px; /* 稳定 px */
  font-weight: 600;
  color: #111216;
  display: block;
  margin-bottom: 12px;
}

.form-label {
  display: grid;
  gap: 6px;
  margin-bottom: 12px;

  text {
    font-size: 14px;
    color: #5E626B;
  }
}

.form-input {
  height: 46px; /* 稳定 px */
  border: 1px solid #DEDFE3;
  border-radius: 10px;
  padding: 0 12px;
  font-size: 15px;
  background: white;
}

.quick-amounts {
  display: flex;
  gap: 8px;
  margin: -8px 0 12px;
}

.quick-btn {
  flex: 1;
  height: 36px; /* 稳定 px */
  border: 1px solid #DEDFE3;
  background: white;
  border-radius: 8px;
  font-size: 13px;
  color: #111216;

  &:active {
    background: #F7F7F8;
  }
}

.submit-btn {
  width: 100%;
  height: 48px; /* 稳定 px */
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
