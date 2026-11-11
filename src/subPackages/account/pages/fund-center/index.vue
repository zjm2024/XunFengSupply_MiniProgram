<template>
  <AppPageShell>
    <template #header><AppHeader :title="t('account.fundCenter.title')" :show-back="true" /></template>
    <template #content>
      <AppContent width-mode="standard" padding="12px var(--page-padding-x, 16px) 28px"
        :refresher-enabled="true" :refresher-triggered="refreshing"
        @refresherrefresh="refresh" @refresherrestore="restore" @refresherabort="restore">
        <view class="finance-hub">
          <view class="hub-overview">
            <view class="balance-hero">
              <view class="balance-orbit" aria-hidden="true" />
              <view class="balance-copy">
                <view class="balance-heading">
                  <text>{{ t('account.fundCenter.availableBalance') }}</text>
                  <button class="balance-visibility" :aria-label="t(balanceVisible ? 'account.fundCenter.hideBalance' : 'account.fundCenter.showBalance')"
                    @tap="balanceVisible = !balanceVisible">
                    <AppIcon :name="balanceVisible ? 'eye' : 'eye-off'" :size="19" color="#fff" />
                  </button>
                </view>
                <AmountText class="balance-amount" :text="balanceVisible && finance?.canViewBalance ? money(finance.subjectAvailableBalance) : '••••••'" />
              </view>
            </view>
            <view class="credit-pair">
              <view class="credit-stat">
                <text class="finance-meta">{{ t('account.fundCenter.creditLimit') }}</text>
                <AmountText class="credit-amount" :text="money(finance?.credit.totalAmount)" />
              </view>
              <view class="credit-stat">
                <text class="finance-meta">{{ t('account.fundCenter.availableCredit') }}</text>
                <AmountText class="credit-amount" :text="money(finance?.credit.availableAmount)" />
              </view>
            </view>
            <view v-if="error" class="hub-error">
              <text class="finance-meta">{{ error }}</text>
              <AppButton size="sm" variant="ghost" @tap="load">{{ t('common.retry') }}</AppButton>
            </view>
          </view>
          <view class="hub-navigation">
            <view class="quick-grid" :class="{ 'single-action': quickActions.length === 1 }">
              <button v-for="item in quickActions" :key="item.label" class="quick-tile" hover-class="tile-pressed"
                :class="{ 'quick-primary': item.primary }" @tap="open(item.url)">
                <AppIcon :name="item.icon" :size="24" />
                <text>{{ item.label }}</text>
              </button>
            </view>
            <view class="finance-panel hub-links">
              <button v-for="item in links" :key="item.label" class="hub-link" hover-class="tile-pressed" @tap="open(item.url)">
                <AppIcon :name="item.icon" :size="21" />
                <text>{{ item.label }}</text>
                <AppIcon name="chevron-right" :size="16" color="#727983" />
              </button>
            </view>
          </view>
        </view>
      </AppContent>
    </template>
  </AppPageShell>
</template>

<script setup>
import { computed, ref } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import '@/subPackages/account/i18n/register.js'
import { t } from '@/shared/i18n/index.js'
import { routes } from '@/app/config/routes.js'
import { navigator } from '@/app/navigation/navigator.js'
import { useUserStore } from '@/shared/session/userStore.js'
import { getDealerFinanceContext } from '@/shared/api/dealerFinance.js'
import { waitForRefreshAnimation } from '@/shared/utils/refreshAnimation.js'
import AppPageShell from '@/shared/ui/AppPageShell/AppPageShell.vue'
import AppHeader from '@/shared/ui/AppHeader/AppHeader.vue'
import AppContent from '@/shared/ui/AppContent/AppContent.vue'
import AppIcon from '@/shared/ui/AppIcon/AppIcon.vue'
import AppButton from '@/shared/ui/AppButton/AppButton.vue'
import AmountText from '@/shared/ui/AmountText/AmountText.vue'
import { formatFinanceAmount as money } from '../../model/financeDisplay.js'

const user = useUserStore()
const finance = ref(null)
const error = ref('')
const refreshing = ref(false)
const loading = ref(false)
const balanceVisible = ref(true)

const quickActions = computed(() => [
  ...(user.isMainAccount ? [{ label: t('account.withdrawal.apply'), icon: 'profile-fund-flow', url: routes.account.withdrawal({ mode: 'apply' }), primary: true }] : []),
  { label: t('account.titles.recharge'), icon: 'profile-recharge', url: routes.account.recharge(), primary: !user.isMainAccount },
  ...(user.isMainAccount ? [{ label: t('account.fundCenter.bankCards'), icon: 'bank', url: routes.account.withdrawalBankCards() }] : []),
])
const links = computed(() => [
  { label: t('account.fundCenter.balanceDetails'), icon: 'profile-fund-flow', url: routes.account.fundFlow() },
  { label: t('account.fundCenter.creditDetails'), icon: 'profile-credit-flow', url: routes.account.creditFlow() },
  ...(user.isMainAccount ? [{ label: t('account.withdrawal.records'), icon: 'wallet', url: routes.account.withdrawal() }] : []),
  { label: t('account.titles.rechargeRecords'), icon: 'history', url: routes.account.rechargeRecords() },
])

onShow(load)

async function load() {
  if (loading.value) return
  const session = user.token
  loading.value = true
  error.value = ''
  try {
    const result = await getDealerFinanceContext()
    if (session === user.token) finance.value = result
  } catch (failure) {
    if (session === user.token) error.value = failure?.message || t('account.withdrawal.loadFailed')
  } finally { loading.value = false }
}

async function refresh() {
  if (refreshing.value) return
  const startedAt = Date.now()
  refreshing.value = true
  try { await load() }
  finally { await waitForRefreshAnimation(startedAt); refreshing.value = false }
}

function restore() { if (!loading.value) refreshing.value = false }
function open(url) { return navigator.navigateTo(url) }
</script>

<style lang="scss" scoped>
@import '../finance-ui.scss';

.finance-hub, .hub-overview, .hub-navigation { display: grid; gap: 12px; min-width: 0; align-content: start; }
.balance-hero {
  position: relative;
  overflow: hidden;
  min-height: 126px;
  box-sizing: border-box;
  display: flex;
  align-items: center;
  padding: 16px;
  border-radius: var(--radius-feature, 18px);
  color: #fff;
  background: linear-gradient(118deg, #b90d23 6%, #d7192d 66%, #ed4448);
}
.balance-orbit { position: absolute; right: -57px; bottom: -100px; width: 236px; height: 180px; border: 1px solid rgba(255,255,255,.42); border-radius: 50%; transform: rotate(-28deg); pointer-events: none; }
.balance-orbit::after { content: ''; position: absolute; inset: 8px 13px 0; border: 1px solid rgba(255,255,255,.22); border-radius: 50%; }
.balance-copy { position: relative; width: 100%; min-width: 0; }
.balance-heading { display: flex; align-items: center; gap: 4px; font-size: var(--type-body-size, 14px); font-weight: 600; }
.balance-visibility { display: flex; align-items: center; justify-content: center; width: 44px; height: 44px; padding: 0; margin: 0; flex: none; background: transparent; border: 0; }
.balance-amount { display: block; font-size: var(--type-display-size, 28px); line-height: 1.3; }
.credit-pair, .quick-grid { display: grid; gap: 8px; min-width: 0; }
.credit-pair { grid-template-columns: repeat(2, minmax(0, 1fr)); }
.quick-grid { grid-template-columns: repeat(3, minmax(0, 1fr)); }
.quick-grid.single-action { grid-template-columns: 1fr; }
.credit-stat, .quick-tile { min-width: 0; padding: 12px; border-radius: var(--radius-card, 14px); background: var(--glass-card-background, #fff); }
.credit-stat { display: grid; gap: 4px; }
.credit-amount { font-size: var(--type-card-title-size, 16px); line-height: 1.35; }
.quick-tile, .hub-link { border: 0; margin: 0; width: 100%; box-sizing: border-box; color: var(--type-body-color, #1b1c20); text-align: start; font-size: var(--type-body-size, 14px); line-height: 1.4; }
.quick-tile::after, .hub-link::after, .balance-visibility::after { border: 0; }
.quick-tile { display: flex; min-height: 76px; flex-direction: column; justify-content: center; align-items: center; gap: 7px; font-weight: 600; text-align: center; padding-inline: 6px; }
.quick-tile.quick-primary { color: #ad1024; background: var(--glass-card-background, #fff); }
.hub-links { padding: 0 14px; }
.hub-link { display: grid; grid-template-columns: auto minmax(0, 1fr) auto; align-items: center; gap: 10px; padding: 12px 0; min-height: 48px; background: transparent; }
.hub-link + .hub-link { border-top: 1px solid var(--border-color, #eceef1); }
.tile-pressed { opacity: .76; }
.hub-error { display: flex; align-items: center; flex-wrap: wrap; gap: 8px; }
@media (min-width: 700px) {
  .balance-hero { min-height: 158px; padding-inline: 20px; }
}

</style>
