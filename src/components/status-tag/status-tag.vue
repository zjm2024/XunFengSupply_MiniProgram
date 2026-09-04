<!--
  订单/售后状态标签组件
  统一渲染：待审核、待付款、处理中、已完成、已取消等全部状态
  支持三种类型：order（订单）、afterSale（售后）、bill（账单）
-->
<template>
  <view class="status-tag" :class="[typeClass, 'status-' + statusValue]">
    <text class="tag-text">{{ currentLabel }}</text>
  </view>
</template>

<script setup>
import { computed } from 'vue'
import { ORDER_STATUS, ORDER_STATUS_MAP, AFTER_SALE_STATUS, AFTER_SALE_STATUS_MAP, BILL_STATUS } from '../../config/constant.js'

const props = defineProps({
  // 状态值
  statusValue: { type: [Number, String], default: 0 },
  // 类型: order / afterSale / bill
  type: { type: String, default: 'order' }
})

// 当前标签文本
const currentLabel = computed(() => {
  const statusNum = Number(props.statusValue)

  switch (props.type) {
    case 'order':
      return ORDER_STATUS_MAP[statusNum]?.text || '未知'
    case 'afterSale':
      return AFTER_SALE_STATUS_MAP[statusNum]?.text || '未知'
    case 'bill':
      // BILL_STATUS 是对象形式 {value, label}
      const billStatus = Object.values(BILL_STATUS).find(s => s.value === statusNum)
      return billStatus?.label || '未知'
    default:
      return '未知'
  }
})

// 类型样式类名
const typeClass = computed(() => `tag-${props.type}`)
</script>

<style lang="scss" scoped>
.status-tag {
  display: inline-flex;
  align-items: center;
  padding: 4rpx 16rpx;
  border-radius: 6rpx;
  font-size: 22rpx;
  white-space: nowrap;

  .tag-text {
    line-height: 1.4;
  }
}

/* 订单状态颜色（与后端 OrderStatus 枚举值对齐） */
.tag-order {
  &.status-0 { background: #F4F4F5; color: #909399; }    // 草稿
  &.status-10 { background: #FDF6EC; color: #E6A23C; }   // 待审核
  &.status-11 { background: #FEF0F0; color: #F56C6C; }   // 审核驳回
  &.status-20 { background: #FDF6EC; color: #E6A23C; }  // 待付款
  &.status-40 { background: #EBF5FF; color: #409EFF; }   // 处理中
  &.status-60 { background: #EBF9E9; color: #67C23A; }   // 已完成
  &.status-90 { background: #FDF6EC; color: #E6A23C; }  // 取消中
  &.status-91 { background: #F4F4F5; color: #909399; }    // 已取消
}

/* 售后状态颜色 */
.tag-afterSale {
  &.status-0 { background: #FDF6EC; color: #E6A23C; }   // 已申请
  &.status-1 { background: #FDF6EC; color: #E6A23C; }   // 待审核
  &.status-2 { background: #EBF5FF; color: #409EFF; }   // 待退货
  &.status-3 { background: #EBF5FF; color: #409EFF; }   // 退货中
  &.status-4 { background: #EBF9E9; color: #67C23A; }   // 已收货
  &.status-5 { background: #FDF6EC; color: #E6A23C; }   // 退款中
  &.status-6 { background: #EBF9E9; color: #67C23A; }   // 已完成
  &.status-7 { background: #FEF0F0; color: #F56C6C; }   // 已驳回
  &.status-8 { background: #FEF0F0; color: #F56C6C; }   // 失败
  &.status-9 { background: #F4F4F5; color: #909399; }   // 已关闭
}

/* 账单状态颜色 */
.tag-bill {
  &.status-0 { background: #FDF6EC; color: #FF9800; }   // 未结算
  &.status-1 { background: #FDF6EC; color: #E6A23C; }   // 部分结算
  &.status-2 { background: #EBF9E9; color: #67C23A; }   // 已结清
  &.status-3 { background: #FEF0F0; color: #F56C6C; }   // 已逾期
}
</style>
