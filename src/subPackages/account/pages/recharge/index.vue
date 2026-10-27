<template>
  <AppPageShell>
    <template #header>
      <AppHeader :title="t('account.titles.recharge')" :show-back="true" />
    </template>

    <template #content>
      <AppContent padding="16px var(--page-padding-x, 16px) 30px">
        <view class="recharge-page">
          <view class="page-grid">
            <view class="overview-column">
              <view class="balance-card">
                <view class="balance-head">
                  <view>
                    <text class="eyebrow">{{ t('account.recharge.availableBalance') }}</text>
                    <AmountText class="balance-value" :text="'¥' + (formatMoney(finance.currentAccount?.availableBalance))" />
                  </view>
                  <view class="wallet-mark"><AppIcon name="wallet" :size="24" color="#D7192D" /></view>
                </view>
                <view class="balance-meta">
                  <view>
                    <text class="meta-label">{{ t('account.recharge.frozenBalance') }}</text>
                    <AmountText class="meta-value" :text="'¥' + (formatMoney(finance.currentAccount?.frozenBalance))" />
                  </view>
                  <view>
                    <text class="meta-label">{{ t('account.recharge.dealerAvailable') }}</text>
                    <AmountText class="meta-value" :text="'¥' + (formatMoney(finance.subjectAvailableBalance))" />
                  </view>
                </view>
                <view class="card-entry" hover-class="card-entry--pressed" @tap="goToFundFlow">
                  <view class="card-entry-copy">
                    <text class="card-entry-title">{{ t('account.recharge.fundFlow') }}</text>
                    <text class="card-entry-desc">{{ t('account.recharge.fundFlowHint') }}</text>
                  </view>
                  <AppIcon name="chevron-right" :size="16" color="#8A9098" />
                </view>
              </view>

              <view class="credit-card">
                <view class="section-head">
                  <view>
                    <text class="section-title">{{ t('account.recharge.credit') }}</text>
                    <text class="section-desc">{{ t('account.recharge.creditHint') }}</text>
                  </view>
                  <text class="credit-status" :class="{ frozen: finance.credit.isFrozen }">
                    {{ finance.credit.isFrozen ? '授信冻结' : '状态正常' }}
                  </text>
                </view>
                <view class="credit-main">
                  <view>
                    <text class="metric-label">{{ t('account.recharge.availableCredit') }}</text>
                    <AmountText class="credit-value" :text="'¥' + (formatMoney(finance.credit.availableAmount))" />
                  </view>
                  <AmountText class="credit-total" :text="t('account.recharge.totalAmount', { amount: formatMoney(finance.credit.totalAmount) })" />
                </view>
                <view class="progress-track">
                  <view class="progress-value" :style="{ width: `${creditUsage}%` }" />
                </view>
                <view class="credit-foot">
                  <AmountText :text="t('account.recharge.usedAmount', { amount: formatMoney(finance.credit.usedAmount) })" />
                  <AmountText :text="t('account.recharge.frozenAmount', { amount: formatMoney(finance.credit.frozenAmount) })" />
                </view>
                <view class="card-entry" hover-class="card-entry--pressed" @tap="goToCreditFlow">
                  <view class="card-entry-copy">
                    <text class="card-entry-title">{{ t('account.recharge.creditFlow') }}</text>
                    <text class="card-entry-desc">{{ t('account.recharge.creditFlowHint') }}</text>
                  </view>
                  <AppIcon name="chevron-right" :size="16" color="#8A9098" />
                </view>
              </view>
            </view>

            <view class="service-column">
              <view class="service-card">
                <view class="section-head">
                  <view>
                    <text class="section-title">{{ t('account.recharge.service') }}</text>
                    <text class="section-desc">{{ t('account.recharge.serviceHint') }}</text>
                  </view>
                </view>

                <view class="channel-picker">
                  <view
                    v-for="channel in paymentChannels"
                    :key="channel.key"
                    class="channel-card"
                    :class="{ selected: selectedChannel === channel.key, disabled: channel.disabled }"
                    hover-class="channel-card--pressed"
                    @tap="selectPaymentChannel(channel)"
                  >
                    <view class="channel-icon" :style="{ color: channel.color }"><AppIcon :name="channel.icon" :size="26" :color="channel.color" :use-original-color="channel.useOriginalColor" /></view>
                    <view class="channel-copy">
                      <view class="channel-title-row">
                        <text class="channel-title">{{ channel.title }}</text>
                        <text class="channel-tag" :class="{ muted: channel.disabled }">{{ channel.disabled ? t('account.recharge.coming') : t('account.recharge.online') }}</text>
                      </view>
                      <text class="channel-desc">{{ channel.description }}</text>
                    </view>
                    <view v-if="!channel.disabled" class="channel-check">{{ selectedChannel === channel.key ? '✓' : '' }}</view>
                  </view>
                </view>
                <view class="recharge-form">
                  <text class="form-label">{{ t('account.recharge.amount') }}</text>
                  <view class="amount-input-wrap">
                    <text class="amount-prefix">¥</text>
                    <input
                      v-model="rechargeAmount"
                      class="amount-input"
                      type="digit"
                      :placeholder="t('account.recharge.amountPlaceholder')"
                      placeholder-class="amount-placeholder"
                      :disabled="submitting"
                      @input="handleAmountChanged"
                    />
                  </view>
                  <view class="quick-amounts">
                    <button
                      v-for="amount in quickAmounts"
                      :key="amount"
                      class="quick-amount"
                      :class="{ active: rechargeAmount === String(amount) }"
                      :disabled="submitting"
                      @tap="selectQuickAmount(amount)"
                    >¥{{ amount }}</button>
                  </view>
                </view>
                <view class="coming-row">
                  <view class="coming-item"><AppIcon name="bank" :size="18" /><text>{{ t('account.recharge.bank') }}</text><text>{{ t('account.recharge.bankLater') }}</text></view>
                </view>

                <button class="finance-btn" :disabled="submitting" @tap="startRecharge">
                  <AppIcon :name="selectedPaymentChannel.icon" :size="18" color="#FFFFFF" />
                  <text>{{ rechargeButtonText }}</text>
                </button>
                <text class="service-note">{{ paymentSupportHint }}</text>
                <view class="card-entry service-entry" hover-class="card-entry--pressed" @tap="goToRecords">
                  <view class="card-entry-copy">
                    <text class="card-entry-title">{{ t('account.recharge.records') }}</text>
                    <text class="card-entry-desc">{{ t('account.recharge.recordsHint') }}</text>
                  </view>
                  <AppIcon name="chevron-right" :size="16" color="#8A9098" />
                </view>
              </view>
            </view>
          </view>

        </view>
      </AppContent>
    </template>
  </AppPageShell>

  <view v-if="nativeQrVisible" class="native-qr-mask" @tap="closeNativeQr">
    <view class="native-qr-sheet" @tap.stop>
      <view class="native-qr-head">
        <view>
          <text class="native-qr-title">{{ t('account.recharge.qrTitle') }}</text>
          <text class="native-qr-number">{{ t('account.recharge.qrNumber', { number: nativeQrNumber }) }}</text>
        </view>
        <button class="native-qr-close" aria-label="close" @tap="closeNativeQr">×</button>
      </view>
      <text class="native-qr-hint">{{ t('account.recharge.qrHint') }}</text>
      <view class="native-qr-code">
        <view v-for="(row, rowIndex) in nativeQrMatrix" :key="rowIndex" class="native-qr-row">
          <view v-for="(dark, columnIndex) in row" :key="columnIndex" class="native-qr-cell" :class="{ dark }" />
        </view>
      </view>
      <button class="native-qr-copy" @tap="copyNativeQrLink">{{ t('account.recharge.qrCopyLink') }}</button>
      <button class="native-qr-done" @tap="closeNativeQr">{{ t('account.recharge.qrClose') }}</button>
    </view>
  </view>
</template>

<script setup>
import { t } from '@/shared/i18n/index.js'
import '@/subPackages/account/i18n/register.js'
import AmountText from '@/shared/ui/AmountText/AmountText.vue'
import { computed, ref } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import AppHeader from '@/shared/ui/AppHeader/AppHeader.vue'
import AppPageShell from '@/shared/ui/AppPageShell/AppPageShell.vue'
import AppContent from '@/shared/ui/AppContent/AppContent.vue'
import AppIcon from '@/shared/ui/AppIcon/AppIcon.vue'
import { createAppRecharge, createNativeRecharge, getDealerFinanceContext } from '@/shared/api/dealerFinance.js'
import { useUserStore } from '@/shared/session/userStore.js'
import { navigator } from '@/app/navigation/navigator.js'
import { routes } from '@/app/config/routes.js'
import { openAppDialog } from '@/shared/composables/useAppDialog.js'
import { createQrMatrix } from '@/shared/utils/qrMatrix.js'

const userStore = useUserStore()
const finance = ref(userStore.financeContext)
const quickAmounts = Object.freeze([100, 500, 1000, 2000])
const paymentChannels = Object.freeze([
  { key: 'wechat', /** 渠道名称按当前语言显示。 */ get title() { return t('account.recharge.wechat') }, icon: 'pay-wechat', color: '#1AAD19', provider: 'wxpay', useOriginalColor: true, /** 渠道说明按当前语言显示。 */ get description() { return t('account.recharge.wechatHint') } },
  { key: 'wechat_native', /** 渠道名称按当前语言显示。 */ get title() { return t('account.recharge.wechatNative') }, icon: 'pay-wechat', color: '#1AAD19', useOriginalColor: true, native: true, /** 渠道说明按当前语言显示。 */ get description() { return t('account.recharge.wechatNativeHint') } },
  { key: 'alipay', /** 渠道名称按当前语言显示。 */ get title() { return t('account.recharge.alipay') }, icon: 'pay-alipay', color: '#1677FF', provider: 'alipay', useOriginalColor: true, /** 渠道说明按当前语言显示。 */ get description() { return t('account.recharge.alipayHint') } },
  { key: 'abc_cashier', /** 渠道名称按当前语言显示。 */ get title() { return t('account.recharge.bank') }, icon: 'bank', color: '#8A9098', provider: null, useOriginalColor: false, disabled: true, /** 渠道说明按当前语言显示。 */ get description() { return t('account.recharge.bankHint') } },
])
const rechargeAmount = ref('')
const submitting = ref(false)
const selectedChannel = ref('wechat')
const availableProviders = ref(null)
const pendingClientRequestId = ref('')
const pendingRequestAmount = ref('')
const pendingRequestChannel = ref('wechat')
const pendingRechargeStorageKey = 'finance:pending-app-recharge'
const nativeQrVisible = ref(false)
const nativeQrLink = ref('')
const nativeQrNumber = ref('')
const nativeQrMatrix = ref([])

const creditUsage = computed(() => {
  const total = Number(finance.value.credit?.totalAmount || 0)
  const used = Number(finance.value.credit?.usedAmount || 0) + Number(finance.value.credit?.frozenAmount || 0)
  return total > 0 ? Math.min(100, Math.max(0, (used / total) * 100)) : 0
})

const selectedPaymentChannel = computed(() => paymentChannels.find(item => item.key === selectedChannel.value) || paymentChannels[0])
const rechargeButtonText = computed(() => submitting.value
  ? t('account.recharge.starting', { channel: selectedPaymentChannel.value.title })
  : t('account.recharge.start', { channel: selectedPaymentChannel.value.title }))
const paymentSupportHint = computed(() => {
  if (selectedPaymentChannel.value.native) return t('account.recharge.wechatNativeHint')
  if (availableProviders.value && !availableProviders.value[selectedChannel.value]) {
    return t('account.recharge.unsupportedHint', { channel: selectedPaymentChannel.value.title })
  }
  return t('account.recharge.balanceHint')
})

onShow(() => {
  loadFinance()
  restorePendingRequest()
  checkPaymentAvailability()
})

async function loadFinance() {
  try {
    const context = await getDealerFinanceContext()
    finance.value = context
    userStore.updateFinanceContext(context)
  } catch (error) {
    console.error('[Recharge] 加载财务上下文失败:', error)
  }
}

function formatMoney(value) {
  const number = Number(value)
  return (Number.isFinite(number) ? number : 0).toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function contactFinance() {
  navigator.navigateTo(routes.content.help())
}

/** 恢复尚未确认的本地幂等键，避免网络中断后重复创建充值单。 */
function restorePendingRequest() {
  const pending = uni.getStorageSync(pendingRechargeStorageKey)
  if (!pending || Date.now() - Number(pending.createdAt || 0) > 30 * 60 * 1000) {
    uni.removeStorageSync(pendingRechargeStorageKey)
    return
  }
  pendingClientRequestId.value = String(pending.clientRequestId || '')
  pendingRequestAmount.value = String(pending.amount || '')
  pendingRequestChannel.value = String(pending.channel || 'wechat')
  if (paymentChannels.some(item => item.key === pendingRequestChannel.value && !item.disabled)) {
    selectedChannel.value = pendingRequestChannel.value
  }
  if (!rechargeAmount.value && pendingRequestAmount.value) rechargeAmount.value = pendingRequestAmount.value
}

/** 检查当前 App 安装包是否编入各支付能力；H5 和未配置包不允许伪装可支付。 */
function checkPaymentAvailability() {
  if (typeof plus === 'undefined') {
    availableProviders.value = { wechat: false, wechat_native: true, alipay: false }
    return
  }
  uni.getProvider({
    service: 'payment',
    success: result => {
      const providers = Array.isArray(result.provider) ? result.provider : []
      availableProviders.value = { wechat: providers.includes('wxpay'), wechat_native: true, alipay: providers.includes('alipay') }
    },
    fail: () => { availableProviders.value = { wechat: false, wechat_native: true, alipay: false } },
  })
}

/** 选择支付渠道；银行收银台等未启用渠道只展示规划状态，不发起请求。 */
function selectPaymentChannel(channel) {
  if (channel.disabled || submitting.value) return
  if (selectedChannel.value !== channel.key) clearPendingRequest()
  selectedChannel.value = channel.key
}

/** 金额变化时废弃旧幂等键，避免同一个客户端请求标识对应不同金额。 */
function handleAmountChanged() {
  if (pendingRequestAmount.value && rechargeAmount.value !== pendingRequestAmount.value) clearPendingRequest()
}

/** 使用快捷金额并执行与手动输入相同的幂等键保护。 */
function selectQuickAmount(amount) {
  rechargeAmount.value = String(amount)
  handleAmountChanged()
}

/** 创建或复用稳定的客户端请求标识，并持久化短时间的未确认支付上下文。 */
function ensureClientRequestId(amount, channel) {
  if (pendingClientRequestId.value
    && pendingRequestAmount.value === amount
    && pendingRequestChannel.value === channel) return pendingClientRequestId.value
  pendingClientRequestId.value = `app-${channel}-recharge-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
  pendingRequestAmount.value = amount
  pendingRequestChannel.value = channel
  uni.setStorageSync(pendingRechargeStorageKey, {
    clientRequestId: pendingClientRequestId.value,
    amount,
    channel,
    createdAt: Date.now(),
  })
  return pendingClientRequestId.value
}

/** 清理已不再可复用的本地充值幂等上下文。 */
function clearPendingRequest() {
  pendingClientRequestId.value = ''
  pendingRequestAmount.value = ''
  uni.removeStorageSync(pendingRechargeStorageKey)
}

/** 校验并解析后端生成的 APP 微信支付参数，拒绝客户端自行拼装签名数据。 */
function parseWeChatPayOrderInfo(clientPayload) {
  let payload = clientPayload
  if (typeof payload === 'string') {
    try {
      payload = JSON.parse(payload)
    } catch (_) {
      throw new Error(t('account.recharge.wechatFormat'))
    }
  }
  const requiredKeys = ['appid', 'partnerid', 'prepayid', 'package', 'noncestr', 'timestamp', 'sign']
  if (!payload || typeof payload !== 'object' || requiredKeys.some(key => !payload[key])) {
    throw new Error(t('account.recharge.wechatMissing'))
  }
  return payload
}

/** 封装原生调起；成功只表示客户端流程返回成功，不代表服务端已经入账。 */
function requestPayment(channel, orderInfo) {
  return new Promise((resolve, reject) => {
    uni.requestPayment({ provider: channel === 'alipay' ? 'alipay' : 'wxpay', orderInfo, success: resolve, fail: reject })
  })
}

/** 发起选定渠道 APP 充值，所有终态均以服务端回调或查单处理后的充值记录为准。 */
async function startRecharge() {
  if (submitting.value) return
  const channel = selectedPaymentChannel.value
  if (channel.disabled) return
  if (!channel.native && availableProviders.value?.[channel.key] !== true) {
    await openAppDialog({ title: t('account.recharge.unavailableTitle', { channel: channel.title }), description: t('account.recharge.unavailableContent', { channel: channel.title }), showCancel: false, confirmText: t('common.confirm') })
    return
  }
  const amount = rechargeAmount.value.trim()
  if (!/^\d+(?:\.\d{1,2})?$/.test(amount) || Number(amount) <= 0) {
    uni.showToast({ title: t('account.recharge.amountInvalid'), icon: 'none' })
    return
  }

  submitting.value = true
  try {
    const createRecharge = channel.native ? createNativeRecharge : createAppRecharge
    const response = await createRecharge({
      channel: channel.key,
      amount: Number(amount),
      clientRequestId: ensureClientRequestId(amount, channel.key),
      fundAccountCode: finance.value.currentAccount?.fundAccountCode || null,
    })
    if ([3, 4].includes(response.status)) {
      clearPendingRequest()
      throw new Error(response.failureMessage || t('account.recharge.createFailed', { channel: channel.title }))
    }
    if (response.status === 2) {
      // 服务端已经确认到账；本地幂等键只服务于当前一次支付，不能复用到下一次同金额充值。
      clearPendingRequest()
      await showPaymentResultPending(t('account.recharge.creditedHint'))
      return
    }
    if (!response.clientPayload) {
      if (channel.native && response.codeUrl) {
        openNativeQr(response)
        return
      }
      await showPaymentResultPending(t('account.recharge.acceptedHint'))
      return
    }

    const orderInfo = channel.key === 'wechat'
      ? parseWeChatPayOrderInfo(response.clientPayload)
      : response.clientPayload
    if (typeof orderInfo !== 'string' && channel.key === 'alipay') throw new Error(t('account.recharge.alipayFormat'))
    await requestPayment(channel.key, orderInfo)
    await showPaymentResultPending(t('account.recharge.requested', { channel: channel.title }))
  } catch (error) {
    const message = String(error?.errMsg || error?.message || '')
    if (/cancel/i.test(message)) {
      uni.showToast({ title: t('account.recharge.cancelled', { channel: channel.title }), icon: 'none' })
    } else {
      uni.showToast({ title: message || t('account.recharge.startFailed', { channel: channel.title }), icon: 'none' })
    }
  } finally {
    submitting.value = false
    await loadFinance()
  }
}

/** 展示服务端返回的 Native 支付二维码；关闭弹层不会清除幂等上下文，便于继续查看或重试。 */
function openNativeQr(response) {
  nativeQrLink.value = String(response.codeUrl || '')
  nativeQrNumber.value = String(response.rechargeNo || '')
  nativeQrMatrix.value = createQrMatrix(nativeQrLink.value)
  nativeQrVisible.value = nativeQrMatrix.value.length > 0
}

/** 关闭 Native 支付二维码弹层，不改变充值单的服务端状态。 */
function closeNativeQr() {
  nativeQrVisible.value = false
}

/** 复制 Native 支付链接，方便在无法直接扫码时转发到其他设备。 */
function copyNativeQrLink() {
  if (!nativeQrLink.value) return
  uni.setClipboardData({
    data: nativeQrLink.value,
    success: () => uni.showToast({ title: t('account.recharge.qrCopied'), icon: 'none' }),
    fail: () => uni.showToast({ title: t('account.recharge.qrCopyFailed'), icon: 'none' }),
  })
}

/** 在客户端调起结束后统一说明服务端确认语义，并引导查看可靠状态。 */
function showPaymentResultPending(content) {
  return new Promise(resolve => {
    openAppDialog({
      title: t('account.recharge.pendingTitle'),
      description: content,
      confirmText: t('account.recharge.viewRecords'),
      cancelText: t('account.recharge.stay'),
    }).then(result => { if (result) goToRecords(); resolve() })
  })
}

function goToRecords() { navigator.navigateTo(routes.account.rechargeRecords()) }
function goToFundFlow() { navigator.navigateTo(routes.account.fundFlow()) }
function goToCreditFlow() { navigator.navigateTo(routes.account.creditFlow()) }
</script>

<style lang="scss" scoped>
.recharge-page { width: 100%; max-width: 1120px; margin: 0 auto; padding-bottom: env(safe-area-inset-bottom); }
.page-grid { display: grid; grid-template-columns: minmax(0, 1fr); gap: 14px; }
.overview-column { display: grid; gap: 14px; }
.balance-card { overflow: hidden; padding: 21px 19px 18px; border-top: 3px solid #D7192D; border-radius: 20px; color: #20242A; background: var(--glass-card-background, rgba(255,255,255,.74)); box-shadow: var(--glass-card-shadow, 0 10px 28px rgba(55,65,80,.07)); -webkit-backdrop-filter: blur(16px); backdrop-filter: blur(16px); }
.balance-head { display: flex; align-items: flex-start; justify-content: space-between; gap: 18px; }
.eyebrow { display: block; color: #747B84; font-size: 12px; }
.balance-value { display: block; margin-top: 8px; font-size: 31px; font-weight: 750; font-variant-numeric: tabular-nums; line-height: 38px; }
.currency { margin-right: 3px; font-size: 17px; font-weight: 600; }
.wallet-mark { display: grid; width: 46px; height: 46px; place-items: center; border: 1px solid #ECEEF1; border-radius: 15px; background: #FFF; }
.balance-meta { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 1px; margin-top: 22px; padding-top: 15px; border-top: 1px solid #ECEEF1; }
.balance-meta > view + view { padding-left: 16px; border-left: 1px solid #ECEEF1; }
.meta-label, .meta-value { display: block; }
.meta-label { color: #8A9098; font-size: 10px; }
.meta-value { margin-top: 4px; color: #262B32; font-size: 14px; font-weight: 650; }
.credit-card, .service-card { padding: 18px; border-radius: 19px; background: var(--glass-card-background, rgba(255,255,255,.74)); box-shadow: var(--glass-card-shadow, 0 10px 28px rgba(55,65,80,.07)); -webkit-backdrop-filter: blur(16px); backdrop-filter: blur(16px); }
.section-head { display: flex; align-items: flex-start; justify-content: space-between; gap: 14px; }
.section-title, .section-desc { display: block; }
.section-title { color: #17191D; font-size: 16px; font-weight: 720; }
.section-desc { margin-top: 4px; color: #8B9098; font-size: 11px; line-height: 17px; }
.credit-status { flex: none; padding: 5px 9px; border-radius: 999px; color: #24724D; background: #EEF7F2; font-size: 10px; font-weight: 650; }
.credit-status.frozen { color: #9B2C25; background: #FFF3F2; }
.credit-main { display: flex; align-items: flex-end; justify-content: space-between; gap: 16px; margin-top: 20px; }
.metric-label { display: block; color: #717680; font-size: 11px; }
.credit-value { display: block; margin-top: 5px; color: #20242B; font-size: 24px; font-weight: 750; font-variant-numeric: tabular-nums; }
.credit-total { color: #8C919A; font-size: 11px; }
.progress-track { height: 6px; margin-top: 16px; overflow: hidden; border-radius: 999px; background: #EEF0F2; }
.progress-value { height: 100%; border-radius: inherit; background: #D7192D; transition: width .25s ease; }
.credit-foot { display: flex; justify-content: space-between; margin-top: 9px; color: #7F848D; font-size: 10px; }
.card-entry { display: flex; align-items: center; justify-content: space-between; gap: 12px; margin-top: 15px; padding-top: 12px; border-top: 1px solid #ECEEF1; }
.card-entry-copy { min-width: 0; }
.card-entry-title, .card-entry-desc { display: block; }
.card-entry-title { color: #30343A; font-size: 12px; font-weight: 680; }
.card-entry-desc { margin-top: 3px; overflow: hidden; color: #969AA3; font-size: 10px; text-overflow: ellipsis; white-space: nowrap; }
.card-entry--pressed { opacity: .68; }
.service-card { height: 100%; box-sizing: border-box; }
.channel-picker { display: grid; gap: 9px; margin-top: 18px; }
.channel-card { position: relative; display: flex; gap: 13px; align-items: center; padding: 12px 14px; border: 1px solid transparent; border-radius: 15px; background: rgba(255,255,255,.48); -webkit-backdrop-filter: blur(12px); backdrop-filter: blur(12px); }
.channel-card.selected { border-color: #D7192D; background: #FFF8F8; box-shadow: 0 5px 14px rgba(215,25,45,.08); }
.channel-card.disabled { opacity: .6; }
.channel-card--pressed { opacity: .72; }
.channel-icon { display: grid; width: 42px; height: 42px; flex: 0 0 42px; place-items: center; border-radius: 13px; background: #FFFFFF; box-shadow: 0 4px 12px rgba(31, 41, 55, .05); }
.channel-copy { min-width: 0; flex: 1; }
.channel-title-row { display: flex; align-items: center; gap: 8px; }
.channel-title { color: #22262D; font-size: 14px; font-weight: 700; }
.channel-tag { padding: 2px 7px; border-radius: 999px; color: #24724D; background: #E9F5EF; font-size: 9px; }
.channel-tag.muted { color: #8B9098; background: #F1F2F4; }
.channel-desc { display: block; margin-top: 5px; color: #777D86; font-size: 11px; line-height: 17px; }
.channel-check { width: 18px; height: 18px; border-radius: 50%; color: #FFF; background: #D7192D; font-size: 13px; line-height: 18px; text-align: center; }
.recharge-form { margin-top: 13px; padding: 13px; border: 1px solid #EDF0F2; border-radius: 15px; background: rgba(255,255,255,.48); }
.form-label { display: block; color: #707680; font-size: 11px; font-weight: 650; }
.amount-input-wrap { display: flex; align-items: center; gap: 6px; margin-top: 7px; padding: 0 10px; border-radius: 11px; background: #FFF; }
.amount-prefix { color: #20242A; font-size: 19px; font-weight: 700; }
.amount-input { min-width: 0; height: 42px; flex: 1; color: #20242A; font-size: 18px; font-weight: 700; }
.amount-placeholder { color: #B3B7BE; font-size: 12px; font-weight: 400; }
.quick-amounts { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 7px; margin-top: 10px; }
.quick-amount { height: 29px; padding: 0; border: 1px solid #E6E9EC; border-radius: 9px; color: #5F6670; background: #FFF; font-size: 10px; line-height: 27px; }
.quick-amount::after { border: 0; }
.quick-amount.active { color: #C51327; border-color: #F1BAC1; background: #FFF2F3; }
.coming-row { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 9px; margin-top: 10px; }
.coming-item { display: grid; grid-template-columns: 22px 1fr auto; align-items: center; gap: 6px; min-height: 42px; padding: 0 10px; border-radius: 12px; color: #737982; background: rgba(255,255,255,.42); -webkit-backdrop-filter: blur(10px); backdrop-filter: blur(10px); font-size: 10px; }
.coming-item > text:last-child { color: #A2A6AD; font-size: 9px; }
.finance-btn { display: flex; width: 100%; height: 48px; align-items: center; justify-content: center; gap: 8px; margin: 15px 0 0; border: 0; border-radius: 13px; color: #FFFFFF; background: #D7192D; font-size: 14px; font-weight: 700; box-shadow: 0 8px 18px rgba(215, 25, 45, .17); }
.finance-btn::after { border: 0; }
.service-note { display: block; margin-top: 10px; color: #9499A2; font-size: 10px; line-height: 16px; text-align: center; }
.service-entry { margin-top: 13px; }
.native-qr-mask { position: fixed; z-index: 1000; inset: 0; display: flex; align-items: center; justify-content: center; padding: 16px; background: rgba(20, 25, 34, .55); }
.native-qr-sheet { width: 360px; max-width: calc(100vw - 32px); box-sizing: border-box; padding: 22px 20px 18px; border-radius: 22px; background: #FFF; box-shadow: 0 18px 50px rgba(20, 25, 34, .24); }
.native-qr-head { display: flex; align-items: flex-start; justify-content: space-between; gap: 12px; }
.native-qr-title, .native-qr-number { display: block; }
.native-qr-title { color: #20242A; font-size: 18px; font-weight: 750; line-height: 25px; }
.native-qr-number { margin-top: 4px; color: #9499A2; font-size: 10px; line-height: 15px; }
.native-qr-close { width: 32px; height: 32px; margin: -5px -5px 0 0; padding: 0; border: 0; color: #8A9098; background: transparent; font-size: 25px; line-height: 30px; }
.native-qr-close::after, .native-qr-copy::after, .native-qr-done::after { border: 0; }
.native-qr-hint { display: block; margin-top: 14px; color: #6F7680; font-size: 12px; line-height: 18px; }
.native-qr-code { display: flex; width: 240px; max-width: calc(100vw - 72px); height: 240px; max-height: calc(100vw - 72px); flex-direction: column; margin: 18px auto 16px; padding: 12px; box-sizing: border-box; background: #FFF; border: 1px solid #ECEEF1; border-radius: 14px; }
.native-qr-row { display: flex; min-height: 0; flex: 1; }
.native-qr-cell { min-width: 0; min-height: 0; flex: 1; background: #FFF; }
.native-qr-cell.dark { background: #14171C; }
.native-qr-copy, .native-qr-done { display: block; width: 100%; height: 42px; margin: 0; border-radius: 11px; font-size: 13px; line-height: 42px; }
.native-qr-copy { color: #D7192D; background: #FFF3F4; }
.native-qr-done { margin-top: 9px; color: #FFF; background: #D7192D; }
@media screen and (min-width: 760px) {
  .page-grid { grid-template-columns: minmax(0, 1fr) minmax(0, 1fr); gap: 18px; }
  .overview-column { grid-template-columns: minmax(0, 1.08fr) minmax(0, .92fr); grid-column: 1 / -1; gap: 18px; }
  .service-column { grid-column: 1 / -1; }
  .service-card { display: grid; grid-template-columns: minmax(0, 1fr) minmax(260px, .7fr); column-gap: 22px; }
  .service-card > .section-head, .service-card > .channel-picker, .service-card > .recharge-form { grid-column: 1; }
  .coming-row, .finance-btn, .service-note { grid-column: 2; }
  .coming-row { grid-row: 1 / span 2; align-content: start; margin-top: 0; }
  .finance-btn { align-self: end; }
}
@media screen and (min-width: 1020px) {
  .page-grid { grid-template-columns: minmax(0, 1.05fr) minmax(360px, .95fr); }
  .overview-column { grid-template-columns: 1fr; grid-column: auto; }
  .service-column { grid-column: auto; }
  .service-card { display: block; }
  .coming-row, .finance-btn, .service-note { grid-column: auto; }
  .coming-row { margin-top: 10px; }
}

/* 金额按实际可用宽度缩字，父布局允许收缩。 */
.balance-head > view:first-child, .balance-meta > view, .credit-main > view { min-width: 0; }
.balance-head > view:first-child, .credit-main > view { flex: 1; }
.wallet-mark { flex: none; }
.credit-foot { min-width: 0; flex-wrap: wrap; gap: 6px 12px; }
.credit-foot .amount-text { font-size: inherit; }
</style>
