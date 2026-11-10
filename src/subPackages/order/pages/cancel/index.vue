<!--
  取消订单原因选择页面（分包：order）
  对应业务流程节点：
  订单待付款/待审核 → 选择取消原因，确认后提交取消
-->
<template>
  <AppPageShell>
    <template #header>
      <AppHeader :title="t('order.titles.cancel')" :show-back="true" />
    </template>
    <template #content>
      <AppContent width-mode="standard" padding="0 var(--page-padding-x, 16px)">
        <view class="cancel-page" v-if="orderId">
          <!-- 订单信息摘要 -->
          <view class="order-summary">
            <text class="order-no">{{ t('order.cancel.orderNo') }}{{ orderNo || orderId }}</text>
          </view>

          <!-- 提示文本 -->
          <text class="hint-text">{{ t('order.cancel.chooseReason') }}</text>

          <!-- 原因列表 -->
          <view class="reason-list">
            <view
              v-for="reason in cancelReasons"
              :key="reason.code"
              class="reason-item"
              :class="{
                active: selectedReasonCode === reason.code,
                'is-other': reason.code === 'other'
              }"
              @click="selectedReasonCode = reason.code"
            >
              <text class="reason-text">{{ t(reason.labelKey) }}</text>
              <view class="reason-check" :class="{ checked: selectedReasonCode === reason.code }">
                <AppIcon v-if="selectedReasonCode === reason.code" name="check" :size="14" color="#FFFFFF" />
              </view>
            </view>
          </view>

          <!-- 其他原因输入框 -->
          <view class="reason-input-block" v-if="selectedReasonCode === 'other'">
            <view class="input-label-text">
              <text class="required-mark">*</text>
               <text class="label-text">{{ t('order.cancel.fillReason') }}</text>
            </view>
            <textarea :placeholder-style="$inputPlaceholderStyle"
              class="reason-textarea"
              :value="customReason"
              @input="customReason = $event.detail.value"
              :placeholder="t('order.cancel.reasonPlaceholder')"
              placeholder-class="reason-placeholder"
              maxlength="200"
              :auto-height="true"
            />
            <text class="char-count">{{ customReason.length }}/200</text>
          </view>


        </view>
      </AppContent>
    </template>
    <template #footer>
      <FixedActionBar width-mode="standard" :show-border="false">
        <view class="cancel-footer">
        <AppButton class="submit-btn" block :disabled="!canSubmit" :loading="submitting" @tap="handleSubmit">
          {{ submitting ? t('order.cancel.submitting') : t('order.cancel.confirm') }}
        </AppButton>
        </view>
      </FixedActionBar>
    </template>
  </AppPageShell>
</template>

<script setup>
import { t } from '@/shared/i18n/index.js'
import '@/subPackages/order/i18n/register.js'
import { ref, computed } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import { cancelOrder, generateClientRequestId } from '../../api/orderApi.js'
import AppPageShell from '@/shared/ui/AppPageShell/AppPageShell.vue'
import AppHeader from '@/shared/ui/AppHeader/AppHeader.vue'
import AppContent from '@/shared/ui/AppContent/AppContent.vue'
import AppIcon from '@/shared/ui/AppIcon/AppIcon.vue'
import FixedActionBar from '@/shared/ui/FixedActionBar/FixedActionBar.vue'
import AppButton from '@/shared/ui/AppButton/AppButton.vue'
import { navigator } from '@/app/navigation/navigator.js'
import { routes } from '@/app/config/routes.js'

const orderId = ref(null)
const orderNo = ref('')
const selectedReasonCode = ref('')
const customReason = ref('')
const submitting = ref(false)

// 取消原因列表
const cancelReasons = Object.freeze([
  { code: 'changed_mind', labelKey: 'order.cancel.reasons.changedMind', reason: '不想要了/改变主意' },
  { code: 'duplicate_order', labelKey: 'order.cancel.reasons.duplicateOrder', reason: '重复下单' },
  { code: 'wrong_info', labelKey: 'order.cancel.reasons.wrongInfo', reason: '商品信息/地址填写错误' },
  { code: 'price_reason', labelKey: 'order.cancel.reasons.priceReason', reason: '价格原因/更便宜的选择' },
  { code: 'delivery_too_slow', labelKey: 'order.cancel.reasons.deliveryTooSlow', reason: '发货太慢' },
  { code: 'other', labelKey: 'order.cancel.reasons.other', reason: '其他原因' },
])

// 是否可以提交
const canSubmit = computed(() => {
  if (!selectedReasonCode.value) return false
  if (selectedReasonCode.value === 'other') {
    return customReason.value.trim().length > 0
  }
  return true
})

onLoad((options) => {
  if (options.orderId) {
    orderId.value = Number(options.orderId)
  }
  if (options.orderNo) {
    orderNo.value = options.orderNo
  }
})

/**
 * 提交取消申请
 */
async function handleSubmit() {
  if (!canSubmit.value || submitting.value) return
  submitting.value = true

  const selected = cancelReasons.find(r => r.code === selectedReasonCode.value)
  const params = {
    orderId: orderId.value,
    clientRequestId: generateClientRequestId(),
  }

  if (selectedReasonCode.value === 'other') {
    params.reasonCode = 'other'
    params.reason = customReason.value.trim()
  } else {
    params.reasonCode = selectedReasonCode.value
    // reason 是订单取消事实/审计文本，必须保留原始中文；页面展示只使用 labelKey。
    params.reason = selected?.reason || null
  }

  try {
    await cancelOrder(params)
    uni.showToast({ title: t('order.cancel.success'), icon: 'success' })
    // 返回订单详情页（重新加载状态）
    setTimeout(() => {
      navigator.redirectTo(routes.order.detail(orderId.value))
    }, 300)
  } catch (e) {
    uni.showToast({ title: e.message || t('order.cancel.failed'), icon: 'none' })
  } finally {
    submitting.value = false
  }
}
</script>

<style lang="scss" scoped>
.cancel-page {
  width: 100%;
  max-width: 640px;
  box-sizing: border-box;
  margin: 0 auto;
  padding: 16px 0 24px;
  color: var(--text-primary, #1B1C20);
}
.order-summary {
  padding: 18px 20px;
  margin-bottom: 24px;
  background: var(--surface-card, #FFFFFF);
  border-radius: var(--radius-card, 16px);
}
.order-no {
  display: block;
  color: var(--text-secondary, #62666F);
  font-size: var(--type-body-size, 14px);
  line-height: 22px;
  overflow-wrap: anywhere;
}
.hint-text {
  display: block;
  margin: 0 0 12px;
  font-size: var(--type-card-title-size, 16px);
  line-height: 24px;
  font-weight: var(--font-weight-semibold, 600);
}
.reason-list {
  overflow: hidden;
  margin-bottom: 16px;
  background: var(--surface-card, #FFFFFF);
  border-radius: var(--radius-card, 16px);
}
.reason-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  min-height: 56px;
  padding: 14px 20px;
  box-sizing: border-box;
  transition: background-color 160ms ease;
  cursor: pointer;
}
.reason-item + .reason-item { border-top: 1px solid var(--divider-color, #ECEEF2); }
.reason-item:active { background: var(--bg-subtle, #F7F8FA); }
.reason-item.active { background: var(--bg-subtle, #F7F8FA); }
.reason-text { flex: 1; min-width: 0; font-size: var(--type-body-size, 14px); line-height: 22px; }
.reason-check {
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  width: 20px;
  height: 20px;
  box-sizing: border-box;
  border: 1px solid var(--border-color, #D9DCE2);
  border-radius: 50%;
}
.reason-check.checked { background: var(--primary-color, #D7192D); border-color: var(--primary-color, #D7192D); }
.reason-input-block {
  padding: 18px 20px;
  border-radius: var(--radius-card, 16px);
  background: var(--surface-card, #FFFFFF);
  animation: reason-reveal 160ms ease-out;
}
.input-label-text { display: flex; align-items: center; gap: 4px; margin-bottom: 10px; }
.required-mark { color: var(--danger-color, #B42318); }
.label-text { font-size: var(--type-body-size, 14px); line-height: 22px; font-weight: 500; }
.reason-textarea {
  width: 100%;
  min-height: 112px;
  max-height: 224px;
  padding: 12px;
  box-sizing: border-box;
  border: 1px solid var(--border-color, #D9DCE2);
  border-radius: var(--radius-control, 12px);
  background: var(--bg-subtle, #F7F8FA);
  color: var(--text-primary, #1B1C20);
  font-size: var(--type-body-size, 14px);
  line-height: 22px;
}
.reason-placeholder { color: var(--text-placeholder, #969AA3); font-size: var(--input-placeholder-size, 13px); }
.char-count { display: block; margin-top: 8px; color: var(--text-secondary, #62666F); text-align: right; font-size: var(--type-caption-size, 12px); line-height: 18px; }
.cancel-footer { width: 100%; max-width: 640px; margin: 0 auto; }
.submit-btn { font-size: var(--type-body-size, 14px); line-height: 20px; }
@keyframes reason-reveal { from { opacity: 0; transform: translateY(-4px); } to { opacity: 1; transform: translateY(0); } }
@media (prefers-reduced-motion: reduce) { .reason-item { transition: none; } .reason-input-block { animation: none; } }
</style>
