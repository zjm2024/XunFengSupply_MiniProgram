<template>
  <AppPageShell>
    <template #header>
      <AppHeader title="确认订单" :show-back="true" />
    </template>

    <template #content>
      <AppContent padding="16px var(--page-padding-x, 16px) 24px">
        <AppPageState
          :state="pageState"
          :title="stateTitle"
          :description="stateDescription"
          :action-text="stateActionText"
          icon-type="order"
          @retry="handleStateAction"
        >
          <view class="checkout-page">
            <view v-if="hasPriceChanged" class="price-notice">
              <AppIcon name="info" :size="17" color="#B76500" />
              <text>商品价格已按最新经销商价格重新核算，请确认后提交。</text>
            </view>

            <view v-if="previewError" class="preview-notice">
              <AppIcon name="alert" :size="17" color="#B42318" />
              <text>{{ previewError }}</text>
              <button class="notice-action button-center" @click="refreshPreview()">重新核价</button>
            </view>

            <view class="checkout-grid">
              <view class="checkout-main">
                <view class="section-card fulfillment-card">
                  <view class="section-heading">
                    <view class="heading-icon">
                      <AppIcon name="location" :size="20" />
                    </view>
                    <view class="heading-copy">
                      <text class="section-title">收货信息</text>
                      <text class="section-subtitle">物流配送必须选择有效收货地址</text>
                    </view>
                    <text v-if="selectedAddress?.isDefault" class="section-badge">默认</text>
                  </view>

                  <button class="address-entry" :class="{ empty: !hasAddress }" @click="goToAddress">
                    <template v-if="hasAddress">
                      <view class="contact-block">
                        <view class="contact-line">
                          <text class="contact-name">{{ receiverName }}</text>
                          <text v-if="receiverPhone" class="contact-phone">{{ receiverPhone }}</text>
                        </view>
                        <text class="contact-address">{{ receiverAddress }}</text>
                      </view>
                      <view class="address-action">
                        <text>更换</text>
                        <AppIcon name="chevron-right" :size="17" color="#90939A" />
                      </view>
                    </template>
                    <template v-else>
                      <view class="empty-address-icon">
                        <AppIcon name="plus" :size="18" color="#D7192D" />
                      </view>
                      <view class="empty-address-copy">
                        <text class="empty-address-title">请新增收货地址</text>
                        <text class="empty-address-desc">保存后将自动用于本次订单</text>
                      </view>
                      <AppIcon name="chevron-right" :size="18" color="#D7192D" />
                    </template>
                  </button>
                </view>

                <view class="section-card products-card">
                  <view class="section-heading product-heading">
                    <view class="heading-icon">
                      <AppIcon name="order" :size="20" />
                    </view>
                    <view class="heading-copy">
                      <text class="section-title">商品清单</text>
                      <text class="section-subtitle">{{ checkoutGroups.length }} 个商品 · {{ displayItems.length }} 个 SKU · 共 {{ totalQuantity }} 件</text>
                    </view>
                    <view class="verified-label">
                      <AppIcon name="shield-check" :size="14" />
                      <text>服务端核价</text>
                    </view>
                  </view>

                  <view class="checkout-spu-list">
                    <view v-for="group in checkoutGroups" :key="group.key" class="checkout-spu-group">
                      <button class="checkout-spu-header" @tap="toggleCheckoutGroup(group.key)">
                        <view class="checkout-spu-copy">
                          <text class="checkout-spu-name">{{ group.name }}</text>
                          <text class="checkout-spu-meta">{{ group.skuCount }} 个 SKU · {{ group.totalQuantity }} 件</text>
                        </view>
                        <text class="checkout-spu-total">¥{{ formatMoney(group.totalAmount) }}</text>
                        <AppIcon
                          name="chevron-right"
                          :size="17"
                          class="checkout-collapse-icon"
                          :class="{ expanded: !isCheckoutGroupCollapsed(group.key) }"
                        />
                      </button>

                      <view v-show="!isCheckoutGroupCollapsed(group.key)" class="product-list">
                        <view
                          v-for="item in group.items"
                          :key="item.skuId"
                          class="product-row"
                          :class="{ 'has-stock-risk': item.stockInsufficient }"
                        >
                          <AppProductImage
                            class="product-image"
                            :src="item.image"
                            :stock="item.availableStock"
                            :fallback-icon-size="26"
                          />
                          <view class="product-info">
                            <text class="product-name">{{ item.skuName || '默认规格' }}</text>
                            <text class="product-spec">SKU：{{ item.code || item.skuId }}</text>
                            <view class="product-meta">
                              <text>¥{{ formatMoney(item.salePrice) }} / {{ item.unit }}</text>
                              <text>× {{ item.quantity }}</text>
                            </view>
                            <text v-if="item.stockInsufficient" class="stock-risk">
                              可用库存 {{ item.availableStock }}，当前需要 {{ item.quantity }}
                            </text>
                          </view>
                          <view class="product-amount">
                            <text>¥{{ formatMoney(item.totalAmount) }}</text>
                            <text v-if="item.listPrice > item.salePrice" class="list-price">
                              ¥{{ formatMoney(item.listPrice * item.quantity) }}
                            </text>
                          </view>
                        </view>
                      </view>
                    </view>
                  </view>

                  <view v-if="!stockAvailable" class="stock-warning">
                    <AppIcon name="alert" :size="16" color="#B42318" />
                    <text>{{ stockWarningText }}</text>
                  </view>
                </view>
              </view>

              <view class="checkout-side">
                <view class="section-card options-card">
                  <view class="compact-heading">
                    <text class="section-title">配送方式</text>
                    <text v-if="previewing" class="refreshing-text">正在核价…</text>
                  </view>
                  <view class="delivery-fixed">
                    <view class="choice-icon active-icon">
                      <AppIcon name="truck" :size="19" />
                    </view>
                    <view class="choice-copy">
                      <text class="choice-title">物流配送</text>
                      <text class="choice-desc">由商城统一安排承运与发货</text>
                    </view>
                    <text class="fixed-label">默认</text>
                  </view>
                </view>

                <view class="section-card options-card">
                  <view class="compact-heading">
                    <text class="section-title">结算方式</text>
                    <text class="section-subtitle">提交后不可修改</text>
                  </view>
                  <view class="option-grid">
                    <button
                      v-for="option in paymentOptions"
                      :key="option.value"
                      class="choice-option"
                      :class="{ active: paymentMode === option.value, disabled: option.disabled }"
                      :disabled="option.disabled || submitting"
                      @click="selectPayment(option)"
                    >
                      <view class="choice-icon">
                        <view
                          v-if="option.iconSvg"
                          class="payment-asset-icon"
                          :style="{ backgroundImage: svgBackground(option.iconSvg) }"
                        />
                        <AppIcon v-else :name="option.icon" :size="19" />
                      </view>
                      <view class="choice-copy">
                        <text class="choice-title">{{ option.label }}</text>
                        <text class="choice-desc">{{ option.description }}</text>
                      </view>
                      <view class="radio-mark">
                        <view class="radio-dot"></view>
                      </view>
                    </button>
                  </view>
                  <view v-if="paymentMode === PAYMENT_MODE.CASH" class="cash-channel-panel">
                    <view class="channel-heading">
                      <text class="channel-title">选择支付通道</text>
                      <text class="channel-tip">订单提交后进入收银台</text>
                    </view>
                    <view class="channel-grid">
                      <button
                        v-for="channel in cashPaymentChannels"
                        :key="channel.value"
                        class="channel-option button-center"
                        :class="{ active: paymentChannel === channel.value }"
                        :disabled="submitting"
                        @click="paymentChannel = channel.value"
                      >
                        <view
                          v-if="channel.iconSvg"
                          class="channel-asset-icon"
                          :style="{ backgroundImage: svgBackground(channel.iconSvg) }"
                        />
                        <AppIcon v-else :name="channel.icon" :size="19" />
                        <text>{{ channel.label }}</text>
                        <AppIcon
                          v-if="paymentChannel === channel.value"
                          name="check"
                          :size="13"
                          color="#D7192D"
                        />
                      </button>
                    </view>
                  </view>
                  <view v-if="paymentMode === PAYMENT_MODE.COMBINATION" class="allocation-panel">
                    <view class="channel-heading">
                      <text class="channel-title">分配支付金额</text>
                      <text class="channel-tip">仅显示状态正常且已授权参与组合支付的账户</text>
                    </view>
                    <view
                      v-for="account in availablePaymentAccounts"
                      :key="'balance-' + account.accountCustomerId"
                      class="allocation-row"
                    >
                      <checkbox
                        :checked="isSourceSelected(balanceKey(account))"
                        color="#D7192D"
                        @tap.stop="toggleBalanceAccount(account)"
                      />
                      <view class="allocation-copy" @tap="toggleBalanceAccount(account)">
                        <text class="allocation-name">{{ account.isMaster ? '主账户' : (account.realName || account.username) }}</text>
                        <text class="allocation-available">可用 ¥{{ formatMoney(account.availableBalance) }} · 冻结 ¥{{ formatMoney(account.frozenBalance) }}</text>
                      </view>
                      <input
                        v-if="isSourceSelected(balanceKey(account))"
                        class="allocation-input"
                        type="digit"
                        :value="allocationAmounts[balanceKey(account)]"
                        placeholder="0.00"
                        @input="setAllocationAmount(balanceKey(account), $event.detail.value)"
                      />
                    </view>
                    <text class="credit-hint">本单统一占用主体授信 ¥{{ formatMoney(payableAmount) }}；剩余可用授信 ¥{{ formatMoney(finance.credit.availableAmount) }}</text>
                    <view class="allocation-total">
                      <text>已分配 ¥{{ formatMoney(allocationTotal) }}</text>
                      <text>应付 ¥{{ formatMoney(payableAmount) }}</text>
                    </view>
                    <text v-if="allocationValidationReason" class="credit-hint">{{ allocationValidationReason }}</text>
                  </view>
                </view>

                <view class="section-card detail-card">
                  <view class="setting-row">
                    <view class="setting-label">
                      <AppIcon name="invoice" :size="18" />
                      <text>发票</text>
                    </view>
                    <text class="setting-value">订单完成后申请</text>
                  </view>

                  <view class="remark-block">
                    <view class="remark-heading">
                      <view class="setting-label">
                        <AppIcon name="edit" :size="18" />
                        <text>订单备注</text>
                      </view>
                      <text class="remark-count">{{ customerRemark.length }}/200</text>
                    </view>
                    <textarea
                      v-model="customerRemark"
                      class="remark-input"
                      maxlength="200"
                      placeholder="可填写交期、包装或收货要求"
                      placeholder-class="remark-placeholder"
                      :disabled="submitting"
                    />
                  </view>
                </view>

                <view class="section-card summary-card">
                  <view class="compact-heading">
                    <text class="section-title">订单汇总</text>
                    <text class="verified-text">价格以提交时服务端结果为准</text>
                  </view>

                  <view class="amount-list">
                    <view class="amount-row">
                      <text>商品金额</text>
                      <text>¥{{ formatMoney(goodsAmount) }}</text>
                    </view>
                    <view v-if="discountAmount > 0" class="amount-row discount">
                      <text>优惠金额</text>
                      <text>-¥{{ formatMoney(discountAmount) }}</text>
                    </view>
                    <view class="amount-row">
                      <text>配送费用</text>
                      <text>{{ freightAmount > 0 ? ('¥' + formatMoney(freightAmount)) : '免运费' }}</text>
                    </view>
                  </view>

                  <view class="payable-row">
                    <view>
                      <text class="payable-label">应付金额</text>
                      <text class="payable-quantity">共 {{ totalQuantity }} 件</text>
                    </view>
                    <view class="payable-price">
                      <text class="currency">¥</text>
                      <text>{{ formatMoney(payableAmount) }}</text>
                    </view>
                  </view>

                  <view class="agreement-row" @click="agreed = !agreed">
                    <view class="agreement-check" :class="{ checked: agreed }">
                      <AppIcon v-if="agreed" name="check" :size="14" color="#FFFFFF" />
                    </view>
                    <text>我已阅读并同意《经销商交易协议》</text>
                  </view>
                  <text v-if="submitDisabledReason" class="submit-hint">{{ submitDisabledReason }}</text>

                  <view class="secure-tip">
                    <AppIcon name="shield-check" :size="15" color="#168A52" />
                    <text>库存与价格将在提交前再次校验，重复点击不会重复创建订单。</text>
                  </view>
                </view>
              </view>
            </view>
          </view>
        </AppPageState>
      </AppContent>
    </template>

    <template #footer>
      <FixedActionBar v-if="pageState === PageStatus.CONTENT">
        <view class="checkout-footer">
          <view class="footer-summary">
            <text class="footer-count">共 {{ totalQuantity }} 件</text>
            <view class="footer-price">
              <text class="footer-label">应付</text>
              <text class="footer-currency">¥</text>
              <text class="footer-amount">{{ formatMoney(payableAmount) }}</text>
            </view>
          </view>
          <button
            class="submit-btn button-center"
            :class="{ 'is-disabled': !canSubmit }"
            :disabled="!canSubmit"
            @click="prepareSubmit"
          >
            {{ submitButtonText }}
          </button>
        </view>
      </FixedActionBar>
    </template>
  </AppPageShell>

  <ConfirmPopup
    v-model="confirmModalVisible"
    title="确认提交订单？"
    :description="confirmDescription"
    :preview-text="confirmPreviewText"
    confirm-text="确认提交"
    :confirm-disabled="submitting"
    :close-on-overlay="!submitting"
    @confirm="confirmSubmit"
  />
</template>

<script setup>
import { computed, ref } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import { createOrder, generateClientRequestId, previewOrder } from '../../api/checkoutApi.js'
import { removeItems } from '../../api/cartApi.js'
import { getAddressList } from '../../../account/api/addressApi.js'
import { useCart } from '../../composables/useCart.js'
import { PAYMENT_MODE, DELIVERY_TYPE } from '@/app/config/constant.js'
import { PageStatus } from '@/shared/model/pageState.js'
import { useUserStore } from '@/shared/session/userStore.js'
import AppPageShell from '@/shared/ui/AppPageShell/AppPageShell.vue'
import AppContent from '@/shared/ui/AppContent/AppContent.vue'
import AppPageState from '@/shared/ui/AppPageState/AppPageState.vue'
import AppHeader from '@/shared/ui/AppHeader/AppHeader.vue'
import FixedActionBar from '@/shared/ui/FixedActionBar/FixedActionBar.vue'
import ConfirmPopup from '@/shared/ui/ConfirmPopup/ConfirmPopup.vue'
import AppProductImage from '@/shared/ui/AppProductImage/AppProductImage.vue'
import AppIcon from '@/shared/ui/AppIcon/AppIcon.vue'
import { navigator } from '@/app/navigation/navigator.js'
import { routes } from '@/app/config/routes.js'
import { confirmDealerOrderPayment, getDealerFinanceContext } from '@/shared/api/dealerFinance.js'
import { groupItemsBySpu } from '../../model/cartGrouping.js'
import cashPaySvg from '@/shared/assets/illustrations/pay/icon-cash-pay.svg?raw'
import combinePaySvg from '@/shared/assets/illustrations/pay/icon-combine-pay.svg?raw'
import wechatPaySvg from '@/shared/assets/illustrations/pay/payment-wechat-pay.svg?raw'
import alipaySvg from '@/shared/assets/illustrations/pay/payment-alipay.svg?raw'

const userStore = useUserStore()
const { cartStore, loadCart, flush } = useCart()

const pageState = ref(PageStatus.LOADING)
const errorMessage = ref('')
const checkoutItems = ref([])
const previewData = ref(null)
const previewing = ref(false)
const previewError = ref('')
const deliveryType = ref(DELIVERY_TYPE.DELIVERY)
const paymentMode = ref(PAYMENT_MODE.COMBINATION)
const paymentChannel = ref('wechat')
const selectedAddress = ref(null)
const customerRemark = ref('')
const agreed = ref(false)
const confirmModalVisible = ref(false)
const submitting = ref(false)
const clientRequestId = ref('')
const collapsedCheckoutGroupKeys = ref({})
const finance = ref(userStore.financeContext)
const selectedSources = ref([])
const allocationAmounts = ref({})
let previewSequence = 0

const cashPaymentChannels = [
  { value: 'wechat', label: '微信支付', iconSvg: wechatPaySvg },
  { value: 'alipay', label: '支付宝', iconSvg: alipaySvg },
  { value: 'bank-card', label: '银行卡', icon: 'bank' },
]

const hasAddress = computed(() => Number(selectedAddress.value?.id) > 0)
const receiverName = computed(() => selectedAddress.value?.name || '')
const receiverPhone = computed(() => selectedAddress.value?.phone || '')
const receiverAddress = computed(() => selectedAddress.value?.fullAddress || '')
const addressId = computed(() => hasAddress.value ? Number(selectedAddress.value.id) : null)

const localAmount = computed(() => checkoutItems.value.reduce(
  (sum, item) => sum + number(item.price) * number(item.quantity),
  0,
))

const displayItems = computed(() => {
  if (previewData.value?.items?.length) return previewData.value.items
  return checkoutItems.value.map(item => ({
    ...item,
    name: item.name || '商品',
    salePrice: number(item.price),
    listPrice: number(item.listPrice || item.price),
    totalAmount: number(item.price) * number(item.quantity),
    availableStock: number(item.stock, Number.MAX_SAFE_INTEGER),
    stockInsufficient: number(item.stock, Number.MAX_SAFE_INTEGER) < number(item.quantity),
  }))
})
const checkoutGroups = computed(() => groupItemsBySpu(displayItems.value))

const totalQuantity = computed(() => displayItems.value.reduce(
  (sum, item) => sum + number(item.quantity),
  0,
))
const goodsAmount = computed(() => number(previewData.value?.goodsAmount, localAmount.value))
const discountAmount = computed(() => number(previewData.value?.discountAmount))
const freightAmount = computed(() => number(previewData.value?.freightAmount))
const payableAmount = computed(() => number(
  previewData.value?.payableAmount,
  goodsAmount.value - discountAmount.value + freightAmount.value,
))
const stockAvailable = computed(() => previewData.value?.stockAvailable !== false)
const insufficientSkus = computed(() => previewData.value?.insufficientSkus || [])
const stockWarningText = computed(() => insufficientSkus.value.length
  ? '以下规格库存不足：' + insufficientSkus.value.join('、')
  : '部分商品库存不足，请返回购物车调整数量后重试。',
)
const hasPriceChanged = computed(() =>
  Boolean(previewData.value) && Math.abs(localAmount.value - goodsAmount.value) >= 0.01,
)

const availableCreditAmount = computed(() => Math.max(0, number(finance.value.credit?.availableAmount)))
const paymentOptions = computed(() => [
  {
    value: PAYMENT_MODE.CASH,
    label: '现款支付',
    description: '订单提交后在线付款',
    iconSvg: cashPaySvg,
    disabled: false,
  },
  {
    value: PAYMENT_MODE.COMBINATION,
    label: '账户组合支付',
    description: '主账户与一个或多个子账户可用余额组合分摊',
    iconSvg: combinePaySvg,
    disabled: false,
  },
])

const availablePaymentAccounts = computed(() => (finance.value.accounts || []).filter(account =>
  account.accountStatus === 1
  && account.financeStatus === 1
  && account.canParticipateCombinationPay
))
const allocationTotal = computed(() => selectedSources.value.reduce(
  (sum, key) => sum + number(allocationAmounts.value[key]),
  0,
))
const creditEligibilityReason = computed(() => {
  if (finance.value.credit.status === 2) return '经销商主体授信已冻结，当前禁止下单'
  if (finance.value.credit.status !== 1) return '经销商主体授信未启用，当前禁止下单'
  if (payableAmount.value > availableCreditAmount.value) return '订单金额不能超过经销商剩余可用授信'
  return ''
})
const allocationValidationReason = computed(() => {
  if (paymentMode.value !== PAYMENT_MODE.COMBINATION) return ''
  if (creditEligibilityReason.value) return creditEligibilityReason.value
  if (!selectedSources.value.length) return '请至少选择一个余额支付账户'
  if (selectedSources.value.some(key => number(allocationAmounts.value[key]) <= 0)) {
    return '已选择资金来源的分摊金额必须大于 0'
  }
  for (const account of availablePaymentAccounts.value) {
    const key = balanceKey(account)
    if (isSourceSelected(key) && number(allocationAmounts.value[key]) > account.availableBalance) {
      return (account.realName || account.username || '账户') + '的分摊金额超过可用余额'
    }
  }
  if (Math.abs(allocationTotal.value - payableAmount.value) >= 0.005) {
    return '分摊合计必须等于订单应付金额'
  }
  return ''
})

const submitDisabledReason = computed(() => {
  if (!userStore.canOrder) return finance.value.credit.status === 2
    ? '经销商主体授信已冻结，当前禁止下单'
    : '当前账号状态暂不允许提交订单'
  if (creditEligibilityReason.value) return creditEligibilityReason.value
  if (!hasAddress.value) return '请先新增并选择收货地址'
  if (!stockAvailable.value) return '存在库存不足商品，请调整后重新结算'
  if (paymentMode.value === PAYMENT_MODE.COMBINATION && allocationValidationReason.value) {
    return allocationValidationReason.value
  }
  if (!agreed.value) return '请阅读并同意经销商交易协议'
  if (previewError.value) return '订单核价失败，请重新核价'
  return ''
})
const canSubmit = computed(() =>
  checkoutItems.value.length > 0
  && Boolean(previewData.value)
  && userStore.canOrder
  && !creditEligibilityReason.value
  && hasAddress.value
  && stockAvailable.value
  && !previewError.value
  && agreed.value
  && (paymentMode.value !== PAYMENT_MODE.COMBINATION || !allocationValidationReason.value)
  && !previewing.value
  && !submitting.value,
)
const submitButtonText = computed(() => {
  if (submitting.value) return '提交中…'
  if (previewing.value) return '核价中…'
  return '提交订单'
})

const stateTitle = computed(() => {
  if (pageState.value === PageStatus.EMPTY) return '暂无可结算商品'
  if (pageState.value === PageStatus.ERROR) return '结算信息加载失败'
  return ''
})
const stateDescription = computed(() => {
  if (pageState.value === PageStatus.EMPTY) return '请返回购物车选择需要采购的商品'
  return errorMessage.value || '网络异常，请稍后重试'
})
const stateActionText = computed(() =>
  pageState.value === PageStatus.EMPTY ? '返回购物车' : '重新加载',
)
const confirmDescription = computed(() => {
  const paymentText = paymentMode.value === PAYMENT_MODE.COMBINATION ? '账户组合支付' : '现款支付'
  const channelText = paymentMode.value === PAYMENT_MODE.CASH
    ? '（' + (cashPaymentChannels.find(item => item.value === paymentChannel.value)?.label || '在线支付') + '）'
    : ''
  return '本单共 ' + totalQuantity.value + ' 件，将使用' + paymentText + channelText + '并通过物流配送完成履约。'
})
const confirmPreviewText = computed(() => '应付金额 ¥' + formatMoney(payableAmount.value))

onLoad(() => {
  loadCheckoutData()
})

function number(value, fallback = 0) {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : fallback
}

function svgBackground(svg) {
  const normalized = String(svg || '')
    .replace(/<\?xml[\s\S]*?\?>/gi, '')
    .replace(/<!doctype[\s\S]*?>/gi, '')
    .trim()
  return normalized
    ? `url("data:image/svg+xml;charset=UTF-8,${encodeURIComponent(normalized)}")`
    : ''
}

function valueOf(source, camelKey, pascalKey, fallback = undefined) {
  return source?.[camelKey] ?? source?.[pascalKey] ?? fallback
}

function formatMoney(value) {
  return number(value).toLocaleString('zh-CN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
}

function balanceKey(account) {
  return 'balance:' + account.accountCustomerId
}

function isSourceSelected(key) {
  return selectedSources.value.includes(key)
}

function setAllocationAmount(key, value) {
  allocationAmounts.value = { ...allocationAmounts.value, [key]: value }
}

function toggleBalanceAccount(account) {
  const key = balanceKey(account)
  toggleSource(key, Math.min(account.availableBalance, Math.max(0, payableAmount.value - allocationTotal.value)))
}

function toggleSource(key, suggestedAmount) {
  if (isSourceSelected(key)) {
    selectedSources.value = selectedSources.value.filter(item => item !== key)
    const next = { ...allocationAmounts.value }
    delete next[key]
    allocationAmounts.value = next
    return
  }
  selectedSources.value = [...selectedSources.value, key]
  setAllocationAmount(key, suggestedAmount > 0 ? suggestedAmount.toFixed(2) : '')
}

function buildAllocations() {
  return selectedSources.value.map(key => ({
      payMethod: 'balance',
      accountCustomerId: Number(key.split(':')[1]),
      amount: number(allocationAmounts.value[key]),
  }))
}

function autoAllocatePayment() {
  selectedSources.value = []
  allocationAmounts.value = {}
  let remaining = payableAmount.value
  for (const account of availablePaymentAccounts.value) {
    if (remaining <= 0) break
    const amount = Math.min(remaining, account.availableBalance)
    if (amount <= 0) continue
    const key = balanceKey(account)
    selectedSources.value.push(key)
    allocationAmounts.value[key] = amount.toFixed(2)
    remaining = Number((remaining - amount).toFixed(2))
  }
}

function toggleCheckoutGroup(groupKey) {
  collapsedCheckoutGroupKeys.value = {
    ...collapsedCheckoutGroupKeys.value,
    [groupKey]: !collapsedCheckoutGroupKeys.value[groupKey],
  }
}

function isCheckoutGroupCollapsed(groupKey) {
  return Boolean(collapsedCheckoutGroupKeys.value[groupKey])
}

function buildOrderItems() {
  return checkoutItems.value
    .map(item => ({
      SkuId: number(item.skuId),
      Quantity: Math.max(1, number(item.quantity, 1)),
    }))
    .filter(item => item.SkuId > 0)
}

function normalizePreview(raw = {}) {
  const sourceItems = valueOf(raw, 'items', 'Items', [])
  const cartItemMap = new Map(checkoutItems.value.map(item => [String(item.skuId), item]))
  const items = (Array.isArray(sourceItems) ? sourceItems : []).map(source => {
    const skuId = number(valueOf(source, 'skuId', 'SkuId'))
    const cartItem = cartItemMap.get(String(skuId)) || {}
    const salePrice = number(valueOf(source, 'salePrice', 'SalePrice'), number(cartItem.price))
    const listPrice = number(valueOf(source, 'listPrice', 'ListPrice'), salePrice)
    const quantity = Math.max(1, number(valueOf(source, 'quantity', 'Quantity'), cartItem.quantity || 1))
    const availableStock = number(
      valueOf(source, 'availableStock', 'AvailableStock'),
      number(cartItem.stock, Number.MAX_SAFE_INTEGER),
    )
    return {
      cartItemId: cartItem.cartItemId,
      productId: cartItem.productId,
      skuId,
      name: cartItem.name || valueOf(source, 'productName', 'ProductName') || valueOf(source, 'skuName', 'SkuName') || '商品',
      skuName: cartItem.skuName || valueOf(source, 'skuName', 'SkuName') || '',
      code: cartItem.code || '',
      image: valueOf(source, 'imageUrl', 'ImageUrl') || cartItem.image,
      unit: cartItem.unit || '件',
      salePrice,
      listPrice,
      quantity,
      totalAmount: number(valueOf(source, 'totalAmount', 'TotalAmount'), salePrice * quantity),
      availableStock,
      stockInsufficient: availableStock < quantity,
    }
  })

  return {
    items,
    goodsAmount: number(valueOf(raw, 'goodsAmount', 'GoodsAmount')),
    discountAmount: number(valueOf(raw, 'discountAmount', 'DiscountAmount')),
    freightAmount: number(valueOf(raw, 'freightAmount', 'FreightAmount')),
    payableAmount: number(valueOf(raw, 'payableAmount', 'PayableAmount')),
    stockAvailable: valueOf(raw, 'stockAvailable', 'StockAvailable', true) !== false,
    insufficientSkus: valueOf(raw, 'insufficientSkus', 'InsufficientSkus', []) || [],
  }
}

async function loadCheckoutData() {
  pageState.value = PageStatus.LOADING
  errorMessage.value = ''
  previewError.value = ''
  previewData.value = null
  clientRequestId.value = ''

  try {
    await flush()
    await loadCart({ silent: true })
    const selected = cartStore.selectedItems
    if (selected.length === 0) {
      checkoutItems.value = []
      pageState.value = PageStatus.EMPTY
      return
    }
    if (cartStore.summary.isOverLimit) {
      throw new Error('单次采购金额不能超过 10 万元，请返回购物车分批结算')
    }

    checkoutItems.value = selected.map(item => ({ ...item }))
    await loadDefaultAddress()
    const [result, financeContext] = await Promise.all([
      refreshPreview({ silent: true }),
      getDealerFinanceContext(),
    ])
    if (!result) throw new Error(previewError.value || '订单核价失败')
    finance.value = financeContext
    userStore.updateFinanceContext(financeContext)
    autoAllocatePayment()
    pageState.value = PageStatus.CONTENT
  } catch (error) {
    errorMessage.value = error?.message || '结算信息加载失败，请稍后重试'
    pageState.value = PageStatus.ERROR
  }
}

async function refreshPreview({ silent = false } = {}) {
  if (checkoutItems.value.length === 0 || previewing.value) return null
  const requestId = ++previewSequence
  const previousPreview = previewData.value
  previewing.value = true
  previewError.value = ''

  try {
    const raw = await previewOrder({
      Items: buildOrderItems(),
      AddressId: addressId.value,
      DeliveryType: deliveryType.value,
    })
    if (requestId !== previewSequence) return null
    const normalized = normalizePreview(raw)
    if (normalized.items.length === 0) throw new Error('服务端未返回可结算商品')
    previewData.value = normalized
    return normalized
  } catch (error) {
    if (requestId === previewSequence) {
      previewData.value = previousPreview
      previewError.value = error?.message || '订单核价失败，请稍后重试'
      if (!silent) uni.showToast({ title: previewError.value, icon: 'none' })
    }
    return null
  } finally {
    if (requestId === previewSequence) previewing.value = false
  }
}

function selectPayment(option) {
  if (option.disabled || submitting.value) {
    if (option.disabled) uni.showToast({ title: '当前支付方式不可用', icon: 'none' })
    return
  }
  paymentMode.value = option.value
}

async function loadDefaultAddress() {
  const list = await getAddressList()
  const currentId = Number(selectedAddress.value?.id) || 0
  selectedAddress.value = list.find(item => item.id === currentId)
    || list.find(item => item.isDefault)
    || list[0]
    || null
}

function goToAddress() {
  navigator.navigateTo(routes.account.address({ selectMode: true }), {
    events: {
      addressSelected: async (address) => {
        selectedAddress.value = address || null
        await refreshPreview()
      },
    },
  })
}

async function prepareSubmit() {
  if (!canSubmit.value) return
  const result = await refreshPreview()
  if (!result || !result.stockAvailable) return
  if (paymentMode.value === PAYMENT_MODE.COMBINATION
    && Math.abs(allocationTotal.value - payableAmount.value) >= 0.005) {
    autoAllocatePayment()
  }
  if (!canSubmit.value) return
  confirmModalVisible.value = true
}

async function confirmSubmit() {
  if (submitting.value || !canSubmit.value) return
  confirmModalVisible.value = false
  submitting.value = true
  if (!clientRequestId.value) clientRequestId.value = generateClientRequestId()

  const orderedCartIds = checkoutItems.value
    .map(item => number(item.cartItemId))
    .filter(Boolean)

  try {
    const response = await createOrder({
      ClientRequestId: clientRequestId.value,
      Items: buildOrderItems(),
      AddressId: addressId.value,
      PaymentMode: paymentMode.value,
      DeliveryType: deliveryType.value,
      CustomerRemark: customerRemark.value.trim() || null,
    })
    const orderId = valueOf(response, 'orderId', 'OrderId')
    if (!orderId) throw new Error('订单创建成功但未返回订单编号')

    if (paymentMode.value === PAYMENT_MODE.COMBINATION) {
      await confirmDealerOrderPayment({
        orderId,
        clientRequestId: clientRequestId.value,
        allocations: buildAllocations(),
      })
    }

    try {
      if (orderedCartIds.length) await removeItems(orderedCartIds)
    } catch (cleanupError) {
      console.warn('[Checkout] 订单已创建，但购物车清理失败:', cleanupError)
    }
    cartStore.optimisticRemove(orderedCartIds)

    uni.showToast({ title: '订单提交成功', icon: 'success' })
    setTimeout(() => {
      if (paymentMode.value === PAYMENT_MODE.CASH) {
        navigator.redirectTo(routes.order.pay(orderId, {
          paymentMode: paymentMode.value,
          paymentChannel: paymentChannel.value,
        }))
        return
      }
      navigator.redirectTo(routes.order.detail(orderId))
    }, 600)
  } catch (error) {
    uni.showToast({ title: error?.message || '订单提交失败，请重试', icon: 'none' })
  } finally {
    submitting.value = false
  }
}

function handleStateAction() {
  if (pageState.value === PageStatus.EMPTY) {
    navigator.back()
    return
  }
  loadCheckoutData()
}
</script>

<style lang="scss" scoped>
@use '@/shared/styles/variable.scss' as *;

.checkout-page {
  width: 100%;
  max-width: 1120px;
  margin: 0 auto;
  padding-bottom: 4px;
  box-sizing: border-box;
}

.checkout-grid {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: 12px;
}

.checkout-main,
.checkout-side {
  display: flex;
  min-width: 0;
  flex-direction: column;
  gap: 12px;
}

.section-card {
  overflow: hidden;
  border-radius: 16px;
  background: var(--surface-card, #FFFFFF);
  box-shadow: 0 5px 18px rgba(17, 18, 22, 0.045);
}

.section-heading {
  display: flex;
  min-height: 64px;
  align-items: center;
  gap: 11px;
  padding: 14px 16px;
  box-sizing: border-box;
}

.heading-icon {
  display: flex;
  width: 28px;
  height: 28px;
  flex: 0 0 28px;
  align-items: center;
  justify-content: center;
  border-radius: 8px;
  color: #50657A;
  background: #EEF2F5;
}

.heading-copy {
  display: flex;
  min-width: 0;
  flex: 1;
  flex-direction: column;
  gap: 3px;
}

.section-title {
  color: var(--color-text-primary, #111216);
  font-size: var(--type-card-title-size, 16px);
  font-weight: 650;
  line-height: 22px;
}

.section-subtitle,
.refreshing-text {
  color: var(--color-text-secondary, #676A73);
  font-size: var(--type-caption-size, 12px);
  line-height: 17px;
}

.section-badge {
  padding: 4px 9px;
  border-radius: 12px;
  color: #4C6072;
  background: #EEF2F5;
  font-size: 11px;
  line-height: 16px;
}

.address-entry {
  display: flex;
  width: calc(100% - 32px);
  min-height: 78px;
  align-items: center;
  gap: 12px;
  margin: 0 16px 16px;
  padding: 13px 14px;
  border: 0;
  border-radius: 13px;
  color: var(--color-text-primary, #111216);
  background: var(--surface-subtle, #F8F9FA);
  text-align: left;
  box-sizing: border-box;

  &::after {
    border: 0;
  }

  &.empty {
    background: #F6F8FA;
  }
}

.address-entry .contact-block {
  min-width: 0;
  flex: 1;
  margin: 0;
}

.address-action {
  display: flex;
  flex: none;
  align-items: center;
  gap: 2px;
  color: var(--color-text-secondary, #676A73);
  font-size: 12px;
}

.empty-address-icon {
  display: flex;
  width: 38px;
  height: 38px;
  flex: 0 0 38px;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  background: #EAF0F4;
}

.empty-address-copy {
  display: flex;
  min-width: 0;
  flex: 1;
  flex-direction: column;
  gap: 3px;
}

.empty-address-title {
  color: #34495B;
  font-size: 14px;
  font-weight: 650;
}

.empty-address-desc {
  color: #6C7680;
  font-size: 11px;
}

.contact-block {
  margin: 0 16px 16px 65px;
}

.contact-line {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 12px;
}

.contact-name {
  color: var(--color-text-primary, #111216);
  font-size: 15px;
  font-weight: 600;
  line-height: 22px;
}

.contact-phone {
  color: var(--color-text-secondary, #676A73);
  font-size: 14px;
}

.contact-address {
  display: block;
  margin-top: 6px;
  color: var(--color-text-secondary, #676A73);
  font-size: 13px;
  line-height: 20px;
}

.profile-warning,
.stock-warning,
.price-notice,
.preview-notice {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  color: #8A4B00;
  background: #FFF8ED;
  font-size: 12px;
  line-height: 18px;
}

.profile-warning {
  margin: 0 16px 16px;
  padding: 10px 12px;
  border-radius: 10px;
}

.price-notice,
.preview-notice {
  margin-bottom: 12px;
  padding: 11px 13px;
  border-radius: 12px;
}

.preview-notice {
  color: #8A1C15;
  background: #FFF3F2;
}

.price-notice > text,
.preview-notice > text {
  min-width: 0;
  flex: 1;
}

.notice-action {
  flex: none;
  margin: -6px -7px -6px 0;
  padding: 6px 8px;
  border: 0;
  color: var(--color-brand, #D7192D);
  background: transparent;
  font-size: 12px;
  line-height: 18px;

  &::after {
    border: 0;
  }
}

.verified-label,
.verified-text {
  display: flex;
  flex: none;
  align-items: center;
  gap: 4px;
  color: #168A52;
  font-size: 11px;
}

.verified-text {
  color: var(--color-text-tertiary, #94969C);
}

.checkout-spu-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 12px 14px 14px;
}

.checkout-spu-group {
  overflow: hidden;
  border-radius: 13px;
  background: var(--surface-subtle, #F8F9FA);
}

.checkout-spu-header {
  display: grid;
  width: 100%;
  min-height: 62px;
  grid-template-columns: minmax(0, 1fr) auto 28px;
  align-items: center;
  gap: 10px;
  margin: 0;
  padding: 10px 12px;
  border: 0;
  border-radius: 0;
  color: var(--color-text-primary, #111216);
  background: var(--surface-subtle, #F8F9FA);
  text-align: left;
  box-sizing: border-box;
}

.checkout-spu-header::after {
  border: 0;
}

.checkout-spu-copy {
  min-width: 0;
}

.checkout-spu-name {
  display: block;
  overflow: hidden;
  font-size: var(--type-body-size, 14px);
  font-weight: 650;
  line-height: 20px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.checkout-spu-meta {
  display: block;
  margin-top: 3px;
  color: var(--color-text-tertiary, #94969C);
  font-size: 11px;
  line-height: 16px;
}

.checkout-spu-total {
  color: var(--color-text-primary, #111216);
  font-size: 13px;
  font-weight: 650;
  font-variant-numeric: tabular-nums;
}

.checkout-collapse-icon {
  color: var(--color-text-secondary, #676A73);
  transition: transform 180ms ease;
}

.checkout-collapse-icon.expanded {
  transform: rotate(90deg);
}

.product-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 8px;
}

.product-row {
  display: grid;
  grid-template-columns: 72px minmax(0, 1fr) auto;
  gap: 12px;
  align-items: center;
  padding: 12px;
  border-radius: 11px;
  background: var(--surface-card, #FFFFFF);
}

.product-image {
  width: 72px;
  height: 72px;
  border-radius: 10px;
}

.product-info {
  display: flex;
  min-width: 0;
  flex-direction: column;
}

.product-name {
  display: -webkit-box;
  overflow: hidden;
  color: var(--color-text-primary, #111216);
  font-size: 14px;
  font-weight: 600;
  line-height: 20px;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
}

.product-spec {
  overflow: hidden;
  margin-top: 4px;
  color: var(--color-text-secondary, #676A73);
  font-size: 12px;
  line-height: 17px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.product-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 7px;
  color: var(--color-text-secondary, #676A73);
  font-size: 12px;
}

.product-amount {
  display: flex;
  align-self: stretch;
  align-items: flex-end;
  justify-content: center;
  flex-direction: column;
  color: var(--color-text-primary, #111216);
  font-size: 14px;
  font-weight: 650;
  font-variant-numeric: tabular-nums;
}

.list-price {
  margin-top: 5px;
  color: var(--color-text-tertiary, #94969C);
  font-size: 11px;
  font-weight: 400;
  text-decoration: line-through;
}

.stock-risk {
  margin-top: 5px;
  color: #B42318;
  font-size: 11px;
  line-height: 16px;
}

.stock-warning {
  margin: 0 16px 16px;
  padding: 10px 12px;
  border-radius: 10px;
  color: #8A1C15;
  background: #FFF3F2;
}

.compact-heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 15px 16px 12px;
}

.options-card {
  padding-bottom: 14px;
}

.delivery-fixed {
  display: flex;
  min-height: 62px;
  align-items: center;
  gap: 10px;
  margin: 0 14px;
  padding: 10px 12px;
  border: 1px solid #DDE3E8;
  border-radius: 12px;
  background: #F7F9FA;
  box-sizing: border-box;
}

.active-icon {
  color: #50657A;
  background: #EAF0F4;
}

.fixed-label {
  flex: none;
  padding: 3px 8px;
  border-radius: 999px;
  color: #4C6072;
  background: #E9EEF2;
  font-size: 10px;
  font-weight: 600;
}

.option-grid {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: 9px;
  padding: 0 14px;
}

.choice-option {
  display: flex;
  width: 100%;
  min-height: 62px;
  align-items: center;
  gap: 10px;
  margin: 0;
  padding: 10px 12px;
  border: 1px solid var(--color-border, #E4E6EB);
  border-radius: 12px;
  color: var(--color-text-primary, #111216);
  background: var(--surface-card, #FFFFFF);
  text-align: left;
  box-sizing: border-box;

  &::after {
    border: 0;
  }

  &.active {
    border-color: rgba(215, 25, 45, 0.46);
    background: #FFFFFF;
    box-shadow: inset 0 0 0 1px rgba(215, 25, 45, 0.18);
  }

  &.disabled {
    color: var(--color-text-disabled, #B2B4BA);
    background: var(--surface-subtle, #F7F8FA);
  }
}

.choice-icon {
  display: flex;
  width: 34px;
  height: 34px;
  flex: 0 0 34px;
  align-items: center;
  justify-content: center;
  border-radius: 10px;
  color: var(--color-text-secondary, #676A73);
  background: var(--surface-subtle, #F7F8FA);
}

.choice-option.active .choice-icon {
  color: var(--color-brand, #D7192D);
  background: #F5F6F8;
}

.payment-asset-icon,
.channel-asset-icon {
  flex: none;
  background-position: center;
  background-repeat: no-repeat;
  background-size: contain;
}

.payment-asset-icon {
  width: 25px;
  height: 25px;
}

.channel-asset-icon {
  width: 21px;
  height: 21px;
}

.choice-copy {
  display: flex;
  min-width: 0;
  flex: 1;
  flex-direction: column;
  gap: 2px;
}

.choice-title {
  color: inherit;
  font-size: var(--type-body-size, 14px);
  font-weight: 600;
  line-height: 20px;
}

.choice-desc {
  overflow: hidden;
  color: var(--color-text-secondary, #676A73);
  font-size: 11px;
  line-height: 16px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.choice-option.disabled .choice-desc {
  color: var(--color-text-disabled, #B2B4BA);
}

.radio-mark {
  display: flex;
  width: 18px;
  height: 18px;
  flex: 0 0 18px;
  align-items: center;
  justify-content: center;
  border: 1.5px solid var(--color-border-strong, #D2D4D9);
  border-radius: 50%;
  box-sizing: border-box;
}

.choice-option.active .radio-mark {
  border-color: var(--color-brand, #D7192D);
}

.radio-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: transparent;
}

.choice-option.active .radio-dot {
  background: var(--color-brand, #D7192D);
}

.credit-hint {
  display: block;
  margin: 9px 15px 0;
  color: var(--color-text-tertiary, #94969C);
  font-size: 11px;
  line-height: 16px;
}

.cash-channel-panel,
.allocation-panel {
  margin: 12px 14px 0;
  padding-top: 12px;
  border-top: 1px solid var(--color-divider, #F0F1F3);
}

.allocation-row {
  display: flex;
  align-items: center;
  gap: 8px;
  min-height: 54px;
  border-bottom: 1px solid var(--color-divider, #F0F1F3);
}

.allocation-copy {
  min-width: 0;
  flex: 1;
}

.allocation-name,
.allocation-available {
  display: block;
}

.allocation-name {
  color: var(--color-text-primary, #111216);
  font-size: 13px;
  font-weight: 600;
}

.allocation-available {
  margin-top: 2px;
  color: var(--color-text-tertiary, #94969C);
  font-size: 10px;
}

.allocation-input {
  width: 88px;
  height: 34px;
  padding: 0 8px;
  border: 1px solid var(--color-border-strong, #D2D4D9);
  border-radius: 8px;
  text-align: right;
  font-size: 13px;
}

.allocation-total {
  display: flex;
  justify-content: space-between;
  padding-top: 10px;
  color: var(--color-text-primary, #111216);
  font-size: 12px;
  font-weight: 600;
}

.channel-heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  margin-bottom: 9px;
}

.channel-title {
  color: var(--color-text-primary, #111216);
  font-size: 13px;
  font-weight: 600;
}

.channel-tip {
  color: var(--color-text-tertiary, #94969C);
  font-size: 10px;
}

.channel-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 8px;
}

.channel-option {
  display: flex;
  min-width: 0;
  height: 42px;
  align-items: center;
  justify-content: center;
  gap: 5px;
  margin: 0;
  padding: 0 8px;
  border: 1px solid var(--color-border, #E4E6EB);
  border-radius: 10px;
  color: var(--color-text-secondary, #676A73);
  background: #FFFFFF;
  font-size: 11px;
  white-space: nowrap;

  &::after {
    border: 0;
  }

  &.active {
    border-color: rgba(215, 25, 45, 0.42);
    color: var(--color-brand, #D7192D);
    background: #FFFFFF;
    box-shadow: inset 0 0 0 1px rgba(215, 25, 45, 0.14);
  }
}

.detail-card {
  padding: 0 16px 16px;
}

.setting-row,
.remark-heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.setting-row {
  min-height: 52px;
  border-bottom: 1px solid var(--color-divider, #F0F1F3);
}

.setting-label {
  display: flex;
  align-items: center;
  gap: 9px;
  color: var(--color-text-primary, #111216);
  font-size: 14px;
  font-weight: 550;
}

.setting-value,
.remark-count {
  color: var(--color-text-secondary, #676A73);
  font-size: 12px;
}

.remark-block {
  padding-top: 15px;
}

.remark-input {
  width: 100%;
  height: 86px;
  margin-top: 12px;
  padding: 11px 12px;
  border: 1px solid var(--color-border, #E4E6EB);
  border-radius: 11px;
  color: var(--color-text-primary, #111216);
  background: var(--surface-subtle, #F7F8FA);
  font-size: 13px;
  line-height: 20px;
  box-sizing: border-box;
}

.summary-card {
  padding: 0 16px 16px;
}

.summary-card .compact-heading {
  padding-right: 0;
  padding-left: 0;
}

.amount-list {
  display: flex;
  flex-direction: column;
  gap: 11px;
  padding: 2px 0 15px;
  border-bottom: 1px solid var(--color-divider, #F0F1F3);
}

.amount-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  color: var(--color-text-secondary, #676A73);
  font-size: 13px;
  font-variant-numeric: tabular-nums;
}

.amount-row.discount {
  color: var(--color-brand, #D7192D);
}

.payable-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 0;
}

.payable-label {
  display: block;
  color: var(--color-text-primary, #111216);
  font-size: 14px;
  font-weight: 650;
}

.payable-quantity {
  display: block;
  margin-top: 3px;
  color: var(--color-text-tertiary, #94969C);
  font-size: 11px;
}

.payable-price {
  color: var(--color-brand, #D7192D);
  font-size: 24px;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  line-height: 30px;
}

.currency {
  margin-right: 2px;
  font-size: 14px;
}

.agreement-row {
  display: flex;
  align-items: center;
  gap: 8px;
  color: var(--color-text-secondary, #676A73);
  font-size: 12px;
  line-height: 18px;
}

.agreement-check {
  display: flex;
  width: 19px;
  height: 19px;
  flex: 0 0 19px;
  align-items: center;
  justify-content: center;
  border: 1px solid var(--color-border-strong, #D2D4D9);
  border-radius: 6px;
  background: #FFFFFF;
  box-sizing: border-box;
}

.agreement-check.checked {
  border-color: var(--color-brand, #D7192D);
  background: var(--color-brand, #D7192D);
}

.submit-hint {
  display: block;
  margin: 8px 0 0 27px;
  color: #B76500;
  font-size: 11px;
  line-height: 16px;
}

.secure-tip {
  display: flex;
  align-items: flex-start;
  gap: 7px;
  margin-top: 14px;
  padding: 10px 11px;
  border-radius: 10px;
  color: #3E6854;
  background: #F1F8F4;
  font-size: 11px;
  line-height: 17px;
}

.checkout-footer {
  display: flex;
  width: 100%;
  max-width: 1120px;
  align-items: center;
  justify-content: space-between;
  gap: 14px;
}

.footer-summary {
  min-width: 0;
}

.footer-count {
  display: block;
  color: var(--color-text-secondary, #676A73);
  font-size: 11px;
  line-height: 15px;
}

.footer-price {
  display: flex;
  align-items: baseline;
  margin-top: 2px;
  color: var(--color-brand, #D7192D);
  font-variant-numeric: tabular-nums;
}

.footer-label {
  margin-right: 5px;
  color: var(--color-text-primary, #111216);
  font-size: 12px;
}

.footer-currency {
  font-size: 13px;
  font-weight: 650;
}

.footer-amount {
  font-size: 21px;
  font-weight: 700;
}

.submit-btn {
  width: 136px;
  height: 46px;
  flex: 0 0 136px;
  margin: 0;
  padding: 0 18px;
  border: 0;
  border-radius: 12px;
  color: #FFFFFF;
  background: var(--color-brand, #D7192D);
  font-size: var(--type-label-size, 15px);
  font-weight: 650;
  line-height: var(--type-button-line-height, 20px);

  &::after {
    border: 0;
  }

  &.is-disabled {
    color: var(--color-text-disabled, #B2B4BA);
    background: var(--surface-subtle, #F1F2F4);
  }
}

@media (min-width: 600px) {
  .option-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (min-width: 800px) {
  .checkout-grid {
    grid-template-columns: minmax(0, 1.48fr) minmax(320px, 0.82fr);
    align-items: start;
    gap: 16px;
  }

  .checkout-spu-list {
    padding: 14px 16px 16px;
  }

  .checkout-main,
  .checkout-side {
    gap: 16px;
  }

  .checkout-side .option-grid {
    grid-template-columns: minmax(0, 1fr);
  }

  .section-card {
    border-radius: 18px;
  }

  .product-row {
    grid-template-columns: 84px minmax(0, 1fr) auto;
  }

  .product-image {
    width: 84px;
    height: 84px;
  }

  .checkout-footer {
    padding: 0 4px;
  }

  .submit-btn {
    width: 176px;
    flex-basis: 176px;
  }
}

@media (max-width: 420px) {
  .section-heading {
    padding-right: 13px;
    padding-left: 13px;
  }

  .contact-block {
    margin-right: 13px;
    margin-left: 62px;
  }

  .channel-grid {
    grid-template-columns: minmax(0, 1fr);
  }

  .channel-option {
    justify-content: flex-start;
    padding: 0 12px;
  }

  .product-list {
    padding: 0 13px;
  }

  .product-row {
    grid-template-columns: 64px minmax(0, 1fr);
    gap: 10px;
  }

  .product-image {
    width: 64px;
    height: 64px;
  }

  .product-amount {
    grid-column: 2;
    align-items: flex-start;
    margin-top: -4px;
  }

  .submit-btn {
    width: 124px;
    flex-basis: 124px;
  }
}
</style>
