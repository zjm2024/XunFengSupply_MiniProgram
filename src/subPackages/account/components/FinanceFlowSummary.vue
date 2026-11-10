<template>
  <view v-if="finance || failure" class="finance-panel flow-summary" :class="{ 'balance-summary': kind === 'balance' }">
    <template v-if="finance && kind === 'balance'">
      <text class="finance-meta">{{ t('account.fundCenter.availableBalance') }}</text>
      <AmountText class="finance-summary-amount" :text="money(finance.subjectAvailableBalance)" />
      <view class="summary-graphic" aria-hidden="true"><AppIcon name="profile-fund-flow" :size="48" /></view>
    </template>
    <template v-else-if="finance">
      <view class="credit-figure">
        <view class="credit-gauge" aria-hidden="true">
          <view class="gauge-track" :style="{ background: gaugePaint }" />
          <view class="gauge-cutout" />
        </view>
        <view class="credit-headline">
          <text class="finance-meta">{{ t('account.fundCenter.availableCredit') }}</text>
          <AmountText class="finance-summary-amount" :text="money(finance.credit.availableAmount)" />
        </view>
      </view>
      <view v-for="metric in creditMetrics" :key="metric.label" class="metric-line">
        <text class="finance-meta">{{ metric.label }}</text>
        <AmountText class="metric-value" :text="money(metric.value)" />
      </view>
      <view class="usage-line"><text class="finance-meta">{{ t('account.fundCenter.creditUsage') }}</text><text>{{ usage.toFixed(1) }}%</text></view>
      <view class="usage-track"><view class="usage-fill" :style="{ width: visualUsage + '%' }" /></view>
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
  const degrees = visualUsage.value * 1.8
  return 'conic-gradient(from 270deg, #d7192d 0deg ' + degrees + 'deg, #e8ecf1 ' + degrees + 'deg 180deg, transparent 180deg)'
})
const creditMetrics = computed(() => {
  const credit = finance.value?.credit
  if (!credit) return []
  return [
    { label: t('account.fundCenter.creditLimit'), value: credit.totalAmount },
    { label: t('account.fundCenter.creditUsed'), value: credit.usedAmount },
    ...(credit.reservedAmount ? [{ label: t('account.fundCenter.creditReserved'), value: credit.reservedAmount }] : []),
    ...(credit.frozenAmount ? [{ label: t('account.fundCenter.creditFrozen'), value: credit.frozenAmount }] : []),
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
.credit-figure { position: relative; min-height: 111px; text-align: center; display: grid; justify-items: center; }
.credit-gauge { position: absolute; top: 0; width: 200px; height: 100px; max-width: 100%; overflow: hidden; pointer-events: none; }
.gauge-track { width: 100%; aspect-ratio: 1; border-radius: 50%; background: #e8ecf1; }
.gauge-cutout { position: absolute; inset: 9px 9px auto; aspect-ratio: 1; border-radius: 50%; background: #fff; }
.credit-headline { z-index: 1; align-self: end; display: grid; gap: 3px; width: 100%; max-width: 100%; min-width: 0; padding: 28px 0 8px; justify-items: center; }
.metric-line, .usage-line { min-width: 0; display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 1.4fr); align-items: center; gap: 8px; padding-top: 12px; }
.metric-line > :last-child, .usage-line > :last-child { justify-self: end; text-align: right; }
.metric-value, .usage-line > :last-child { font-size: 14px; font-weight: 650; }
.usage-track { height: 6px; margin-top: 8px; border-radius: 4px; background: #edf0f4; }
.usage-fill { height: 100%; border-radius: inherit; background: #d7192d; }
.summary-error { display: flex; gap: 6px; align-items: center; flex-wrap: wrap; }
</style>
