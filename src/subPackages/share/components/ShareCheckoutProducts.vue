<template>
  <view v-if="groups.length" class="checkout-product-groups">
    <view v-for="group in groups" :key="group.key" class="checkout-spu-group">
      <CheckoutSpuHeader
        :name="group.name"
        :image="group.items.find(item => item.imageUrl)?.imageUrl || ''"
        :meta="t('commerce.checkout.groupCount', { count: group.items.length, quantity: group.quantity })"
        :amount="groupSubtotal(group)"
        :subtotal-label="t('commerce.checkout.productSubtotal')"
        :collapsed="isCollapsed(group.key)"
        @toggle="toggle(group.key)"
      />
      <view v-if="!isCollapsed(group.key)" class="product-list">
        <view v-for="item in group.items" :key="item.skuId" class="product-row">
          <view class="product-info">
            <text class="product-name">{{ item.specDesc || t('commerce.checkout.defaultVariant') }}</text>
            <view class="product-meta"><AmountText :text="'¥' + item.unitPrice" /></view>
          </view>
          <view class="product-amount">
            <AmountText class="product-line-total" :text="'¥' + item.lineAmount" />
            <text class="product-quantity">× {{ item.quantity }}</text>
          </view>
        </view>
      </view>
    </view>
    <text class="checkout-list-count">{{ t('commerce.checkout.listCount', counts) }}</text>
  </view>
</template>

<script setup>
import { computed, ref } from 'vue'
import { t } from '@/shared/i18n/index.js'
import '@/subPackages/commerce/i18n/register.js'
import AmountText from '@/shared/ui/AmountText/AmountText.vue'
import CheckoutSpuHeader from '../../commerce/components/CheckoutSpuHeader.vue'
import { shareProductGroups, shareGroupAmount } from '../model/shareOrderPresentation.js'

const props = defineProps({ items: { type: Array, required: true } })
const groups = computed(() => shareProductGroups(props.items))
const counts = computed(() => ({
  products: groups.value.length,
  skus: props.items.length,
  quantity: groups.value.reduce((sum, group) => sum + group.quantity, 0),
}))
const collapsed = ref({})

/** 优先按服务端成交行金额汇总商品小计。 */
function groupSubtotal(group) {
  const quotedLines = group.items.map(item => ({ unitPrice: item.lineAmount, quantity: 1 }))
  const amount = shareGroupAmount({ items: quotedLines }) ?? shareGroupAmount(group)
  return amount == null ? '—' : '¥' + amount
}

/** 默认收起，防止初次加载挂载全部规格。 */
function isCollapsed(key) {
  return collapsed.value[key] ?? true
}

/** 只改变目标商品的展开状态。 */
function toggle(key) {
  collapsed.value = { ...collapsed.value, [key]: !isCollapsed(key) }
}
</script>

<style scoped lang="scss">
@import '../../commerce/components/checkout-product-groups.scss';
</style>
