<template>
  <view v-if="finance || failure" class="finance-panel flow-summary" :class="{ 'balance-summary': kind === 'balance' }">
    <template v-if="finance && kind === 'balance'">
      <text class="finance-meta">{{ t('account.fundCenter.availableBalance') }}</text>
      <AmountText class="finance-summary-amount" :text="money(finance.subjectAvailableBalance)" />
      <view class="summary-graphic" aria-hidden="true"><AppIcon name="profile-fund-flow" :size="48" /></view>
    </template>
    <template v-else-if="finance">
      <view class="credit-figure">
        <view class="credit-headline">
          <text class="finance-meta">{{ t('account.fundCenter.availableCredit') }}</text>
          <AmountText class="finance-summary-amount" :text="money(finance.credit.availableAmount)" />
        </view>
        <view class="credit-gauge" :aria-label="t('account.fundCenter.creditUsage') + ' ' + usage.toFixed(1) + '%'">
          <view class="gauge-track" :style="{ background: gaugePaint }" aria-hidden="true" />
          <view class="gauge-copy">
            <text class="gauge-percent">{{ Number(usage.toFixed(1)) }}%</text>
            <text class="gauge-label">{{ t('account.fundCenter.creditUsed') }}</text>
          </view>
        </view>
      </view>
      <view class="credit-metrics">
        <view v-for="metric in creditMetrics" :key="metric.label" class="metric-column">
          <text class="finance-meta">{{ metric.label }}</text>
          <AmountText class="metric-value" :text="money(metric.value)" />
        </view>
      </view>
      <view v-if="finance.credit.frozenAmount" class="frozen-metric">
        <text class="finance-meta">{{ t('account.fundCenter.creditFrozen') }}</text>
        <AmountText class="metric-value" :text="money(finance.credit.frozenAmount)" />
      </view>
    </template>
    <view v-if="failure" class="summary-error">
      <text class="finance-meta">{{ failure }}</text>
      <AppButton size="sm" variant="ghost" @tap="load">{{ t('common.retry') }}</AppButton>
    </view>
  </view>
</template>

<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import { t } from '@/shared/i18n/index.js'
import { getDealerFinanceContext } from '@/shared/api/dealerFinance.js'
import { useUserStore } from '@/shared/session/userStore.js'
import AppButton from '@/shared/ui/AppButton/AppButton.vue'
import AppIcon from '@/shared/ui/AppIcon/AppIcon.vue'
import AmountText from '@/shared/ui/AmountText/AmountText.vue'
import { formatFinanceAmount as money } from '../model/financeDisplay.js'

const props = defineProps({
  kind: { type: String, required: true },
  refreshing: { type: Boolean, default: false },
})
const user = useUserStore()
const finance = ref(null)
const failure = ref('')
const loading = ref(false)
const usage = computed(() => {
  const { totalAmount, usedAmount } = finance.value?.credit || {}
  return totalAmount > 0 ? Math.max(0, usedAmount / totalAmount * 100) : 0
})
const visualUsage = computed(() => Math.min(100, usage.value))
const gaugePaint = computed(() => {
  return 'conic-gradient(#d7192d ' + visualUsage.value + '%, #F0F1F4 0)'
})
const creditMetrics = computed(() => {
  const credit = finance.value?.credit
  if (!credit) return []
  return [
    { label: t('account.fundCenter.creditLimit'), value: credit.totalAmount },
    { label: t('account.fundCenter.creditUsed'), value: credit.usedAmount },
    { label: t('account.fundCenter.creditReserved'), value: credit.reservedAmount },
  ]
})

/** 独立刷新当前财务状态，流水筛选不重复拉取汇总。 */
async function load() {
  if (loading.value) return
  const session = user.token
  loading.value = true
  failure.value = ''
  try {
    const result = await getDealerFinanceContext()
    if (session === user.token) finance.value = result
  } catch (error) {
    if (session === user.token) failure.value = error?.message || t('account.withdrawal.loadFailed')
  } finally { loading.value = false }
}

onMounted(load)
watch(() => props.refreshing, refreshing => { if (refreshing) load() })
</script>

<style lang="scss" scoped>
@import '../pages/finance-ui.scss';
.flow-summary { position: relative; margin-bottom: 16px; }
.balance-summary { display: grid; align-content: center; gap: 5px; min-height: 104px; overflow: hidden; background: #fff; }
.balance-summary .finance-meta, .balance-summary .finance-summary-amount { position: relative; z-index: 1; }
.summary-graphic { position: absolute; right: 19px; bottom: 12px; opacity: .22; color: #657489; }
.credit-figure { display: flex; min-width: 0; align-items: center; justify-content: space-between; gap: 14px; padding: 8px 0 22px; }
.credit-headline { display: grid; flex: 1; min-width: 0; gap: 10px; }
.credit-headline .finance-meta { color: #969AA3; font-size: 12px; }
.credit-headline .finance-summary-amount { color: #1C1F25; font-size: 30px; line-height: 1.3; }
.credit-gauge { position: relative; display: flex; flex: 0 0 64px; width: 64px; height: 64px; align-items: center; justify-content: center; }
.gauge-track { position: absolute; inset: 0; border-radius: 50%; }
.gauge-copy { position: relative; display: flex; width: 54px; height: 54px; flex-direction: column; align-items: center; justify-content: center; gap: 2px; border-radius: 50%; background: var(--surface-card, #FFF); }
.gauge-percent { color: var(--color-brand, #D7192D); font-size: 13px; font-weight: 600; line-height: 17px; }
.gauge-label { color: #969AA3; font-size: 10px; line-height: 14px; }
.credit-metrics { display: grid; grid-template-columns: minmax(0, 1.4fr) minmax(0, 1fr) minmax(0, 1fr); gap: 10px; padding-top: 16px; border-top: 1px dashed #EAECF0; }
.metric-column { display: flex; min-width: 0; flex-direction: column; align-items: flex-start; gap: 4px; }
.metric-column:nth-child(2) { align-items: center; }
.metric-column:last-child { align-items: flex-end; }
.metric-column .finance-meta { color: #969AA3; font-size: 12px; }
.metric-value { max-width: 100%; color: #24272D; font-size: 13px; line-height: 18px; font-weight: 600; }
.frozen-metric { display: flex; align-items: center; justify-content: space-between; gap: 12px; margin-top: 12px; padding-top: 12px; border-top: 1px solid #F0F1F4; }
@media (min-width: 700px) { .credit-figure { padding-top: 12px; padding-bottom: 26px; } .credit-headline .finance-summary-amount { font-size: 34px; } }
@media (max-width: 355px) { .credit-figure { gap: 10px; } .credit-gauge { flex-basis: 58px; width: 58px; height: 58px; } .gauge-copy { width: 48px; height: 48px; } .credit-headline .finance-summary-amount { font-size: 25px; } .credit-metrics { gap: 6px; } }
.summary-error { display: flex; gap: 6px; align-items: center; flex-wrap: wrap; }
</style>
