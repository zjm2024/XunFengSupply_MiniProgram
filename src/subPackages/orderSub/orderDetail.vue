<!--
  订单详情页面（分包：orderSub）
  对应业务流程节点：
  订单履约发货 → 查看完整订单详情、物流轨迹、操作日志
-->
<template>
  <AppPageShell>
    <template #header>
      <AppHeader title="订单详情" :show-back="true" />
    </template>
    <template #content>
      <AppContent>
        <view class="order-detail-page" v-if="detail">
          <!-- 状态栏 -->
          <view class="status-header" :class="'status-' + detail.orderStatus">
            <text class="status-text">{{ orderStatusText }}</text>
            <text class="status-desc">{{ orderStatusDesc }}</text>
          </view>

          <!-- 物流信息 -->
          <view class="logistics-card" v-if="detail.shipments && detail.shipments.length > 0">
            <view class="logistics-info">
              <uni-icons type="car" size="20" color="#67C23A" />
              <view class="logistics-text">
                <text class="logistics-company">{{ detail.shipments[0]?.carrierName || '暂无物流信息' }}</text>
                <text class="tracking-no" v-if="detail.shipments[0]?.trackingNo">运单号: {{ detail.shipments[0].trackingNo }}</text>
              </view>
              <uni-icons type="right" size="16" color="#CCC" />
            </view>
          </view>

          <!-- 收货地址 -->
          <view class="address-card">
            <view class="address-icon-wrap">
              <uni-icons type="location" size="20" color="#C41E3A" />
            </view>
            <view class="address-detail">
              <view class="contact-row">
                <text class="name">{{ detail.receiverName || '-' }}</text>
                <text class="phone">{{ detail.receiverPhone || '-' }}</text>
              </view>
              <text class="address-text">{{ fullAddress }}</text>
            </view>
          </view>

          <!-- 商品列表 -->
          <view class="goods-card">
            <view class="card-title">商品信息</view>
            <view
              class="goods-item"
              v-for="item in detail.items"
              :key="item.orderItemId"
            >
              <image class="goods-image" :src="item.imageUrl || '/static/images/jersey-red.png'" mode="aspectFill" />
              <view class="goods-info">
                <text class="goods-name">{{ item.productName }}</text>
                <text class="sku-name">{{ item.skuName }}</text>
                <view class="price-row">
                  <text class="price">¥{{ Number(item.salePrice || 0).toFixed(2) }}</text>
                  <text class="qty">x{{ item.quantity }}</text>
                </view>
              </view>
            </view>
          </view>

          <!-- 订单信息 -->
          <view class="info-card">
            <view class="card-title">订单信息</view>
            <view class="info-row">
              <text class="info-label">订单编号</text>
              <text class="info-value copyable" @click="copyText(detail.orderNo)">{{ detail.orderNo }}</text>
            </view>
            <view class="info-row">
              <text class="info-label">下单时间</text>
              <text class="info-value">{{ formatTime(detail.createdAt) }}</text>
            </view>
            <view class="info-row">
              <text class="info-label">结算方式</text>
              <text class="info-value">{{ detail.paymentMode === PAYMENT_MODE.CASH ? '现款支付' : '授信赊账' }}</text>
            </view>
            <view class="info-row" v-if="detail.customerRemark">
              <text class="info-label">发货备注</text>
              <text class="info-value">{{ detail.customerRemark }}</text>
            </view>
          </view>

          <!-- 状态日志 -->
          <view class="info-card" v-if="detail.statusLogs && detail.statusLogs.length > 0">
            <view class="card-title">操作日志</view>
            <view
              class="log-item"
              v-for="(log, idx) in detail.statusLogs"
              :key="idx"
            >
              <text class="log-time">{{ formatTime(log.createdAt) }}</text>
              <text class="log-text">{{ getStatusLogText(log) }}</text>
            </view>
          </view>

          <!-- 价格明细 -->
          <view class="price-card">
            <view class="price-row">
              <text class="price-label">商品总额</text>
              <text class="price-value">¥{{ Number(detail.goodsAmount || 0).toFixed(2) }}</text>
            </view>
            <view class="price-row" v-if="detail.discountAmount > 0">
              <text class="price-label">优惠金额</text>
              <text class="price-value">-¥{{ Number(detail.discountAmount || 0).toFixed(2) }}</text>
            </view>
            <view class="price-row">
              <text class="price-label">运费</text>
              <text class="price-value">¥{{ Number(detail.freightAmount || 0).toFixed(2) }}</text>
            </view>
            <view class="price-row total">
              <text class="price-label">应付金额</text>
              <text class="price-value highlight">¥{{ Number(detail.payableAmount || 0).toFixed(2) }}</text>
            </view>
            <view class="price-row" v-if="detail.paidAmount > 0">
              <text class="price-label">已支付</text>
              <text class="price-value">¥{{ Number(detail.paidAmount || 0).toFixed(2) }}</text>
            </view>
            <view class="price-row" v-if="detail.refundedAmount > 0">
              <text class="price-label">已退款</text>
              <text class="price-value">¥{{ Number(detail.refundedAmount || 0).toFixed(2) }}</text>
            </view>
          </view>

          <!-- 底部占位，避免内容被 FixedActionBar 遮挡 -->
          <view style="height: 100rpx;" v-if="actionButtons.length > 0" />
        </view>

        <!-- 加载中 -->
        <view v-else class="loading-page">
          <text class="loading-text">加载中...</text>
        </view>
      </AppContent>
    </template>
    <template #footer>
      <FixedActionBar v-if="actionButtons.length > 0">
        <button
          v-for="action in actionButtons"
          :key="action.key"
          class="action-btn"
          :class="action.type"
          @click="handleAction(action.key)"
        >{{ action.label }}</button>
      </FixedActionBar>
    </template>
  </AppPageShell>
</template>

<script setup>
import { ref, computed } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import { getOrderDetail, cancelOrder, confirmReceipt, generateClientRequestId } from '../../api/order.js'
import { ORDER_STATUS, ORDER_STATUS_MAP, PAYMENT_MODE } from '../../config/constant.js'
import AppPageShell from '@/components/AppPageShell/AppPageShell.vue'
import AppHeader from '@/components/AppHeader/AppHeader.vue'
import AppContent from '@/components/AppContent/AppContent.vue'
import FixedActionBar from '@/components/FixedActionBar/FixedActionBar.vue'
import { safeNavigateTo } from '../../utils/routeGuard.js'

const orderId = ref(null)
const detail = ref(null)

onLoad(async (options) => {
  if (options.orderId) {
    orderId.value = Number(options.orderId)
    await loadOrderDetail()
  }
})

/**
 * 加载订单详情
 */
async function loadOrderDetail() {
  try {
    const res = await getOrderDetail(orderId.value)
    detail.value = res
  } catch (e) {
    console.error('加载订单详情失败:', e)
    uni.showToast({ title: e.message || '加载失败', icon: 'none' })
  }
}

// 完整地址
const fullAddress = computed(() => {
  if (!detail.value) return ''
  const d = detail.value
  return `${d.receiverProvince || ''}${d.receiverCity || ''}${d.receiverDistrict || ''}${d.receiverAddress || ''}`
})

// 状态文本映射
const orderStatusText = computed(() => {
  return ORDER_STATUS_MAP[detail.value?.orderStatus]?.text || '未知'
})

const orderStatusDesc = computed(() => {
  const map = {
    [ORDER_STATUS.DRAFT]: '订单已创建',
    [ORDER_STATUS.PENDING_REVIEW]: '您的订单正在由品牌方审核中',
    [ORDER_STATUS.REVIEW_REJECTED]: '订单审核未通过',
    [ORDER_STATUS.PENDING_PAYMENT]: '请在规定时间内完成付款',
    [ORDER_STATUS.PROCESSING]: '品牌方正在为您安排发货',
    [ORDER_STATUS.COMPLETED]: '订单已完成，感谢您的购买',
    [ORDER_STATUS.CANCELLING]: '订单取消中',
    [ORDER_STATUS.CANCELLED]: '订单已取消',
  }
  return map[detail.value?.orderStatus] || ''
})

// 可用操作按钮（基于后端 AllowedActions 或前端状态映射）
const actionButtons = computed(() => {
  if (!detail.value) return []

  // 优先使用后端返回的 AllowedActions
  if (detail.value.allowedActions && detail.value.allowedActions.length > 0) {
    return detail.value.allowedActions.map(action => {
      const actionMap = {
        'pay': { key: 'pay', label: '立即付款', type: 'primary' },
        'cancel': { key: 'cancel', label: '取消订单', type: 'default' },
        'confirm_receipt': { key: 'receive', label: '确认收货', type: 'primary' },
        'logistics': { key: 'logistics', label: '查看物流', type: 'default' },
        'after_sale': { key: 'afterSale', label: '申请售后', type: 'default' },
      }
      return actionMap[action] || { key: action, label: action, type: 'default' }
    })
  }

  // 降级：前端状态映射
  const s = detail.value.orderStatus
  const actions = []
  if (s === ORDER_STATUS.PENDING_PAYMENT) actions.push({ key: 'pay', label: '立即付款', type: 'primary' })
  if ([ORDER_STATUS.PENDING_REVIEW, ORDER_STATUS.PENDING_PAYMENT].includes(s)) {
    actions.push({ key: 'cancel', label: '取消订单', type: 'default' })
  }
  if (s === ORDER_STATUS.PROCESSING) actions.push({ key: 'receive', label: '确认收货', type: 'primary' })
  if ([ORDER_STATUS.PROCESSING, ORDER_STATUS.COMPLETED].includes(s)) {
    actions.push({ key: 'logistics', label: '查看物流', type: 'default' })
  }
  return actions
})

/**
 * 获取状态日志文本
 */
function getStatusLogText(log) {
  const typeText = {
    'ORDER': '订单',
    'PAYMENT': '支付',
    'REFUND': '退款',
    'ERP': 'ERP',
    'WMS': 'WMS',
    'FULFILLMENT': '履约',
    'CANCELLATION': '取消',
  }
  const prefix = typeText[log.statusType] || log.statusType
  const remark = log.remark ? ` - ${log.remark}` : ''
  return `${prefix}状态变更为 ${log.toStatus}${remark}`
}

/**
 * 格式化时间
 */
function formatTime(timeStr) {
  if (!timeStr) return ''
  const d = new Date(timeStr)
  const pad = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`
}

function copyText(text) {
  uni.setClipboardData({ data: text })
}

async function handleAction(key) {
  switch (key) {
    case 'pay':
      safeNavigateTo(`/subPackages/paySub/payPage?orderId=${orderId.value}`)
      break
    case 'cancel':
      uni.showModal({
        title: '提示',
        content: '确定要取消该订单吗？',
        success: async (res) => {
          if (res.confirm) {
            try {
              await cancelOrder({
                orderId: orderId.value,
                clientRequestId: generateClientRequestId(),
              })
              uni.showToast({ title: '取消成功', icon: 'success' })
              setTimeout(() => loadOrderDetail(), 1000)
            } catch (e) {
              uni.showToast({ title: e.message || '取消失败', icon: 'none' })
            }
          }
        }
      })
      break
    case 'receive':
      uni.showModal({
        title: '提示',
        content: '确定已收到商品吗？',
        success: async (res) => {
          if (res.confirm) {
            try {
              await confirmReceipt({
                orderId: orderId.value,
                clientRequestId: generateClientRequestId(),
              })
              uni.showToast({ title: '已确认收货', icon: 'success' })
              setTimeout(() => loadOrderDetail(), 1000)
            } catch (e) {
              uni.showToast({ title: e.message || '操作失败', icon: 'none' })
            }
          }
        }
      })
      break
    case 'logistics':
      // 物流信息已在详情页展示，滚动到顶部
      uni.pageScrollTo({ scrollTop: 0, duration: 300 })
      break
    case 'afterSale':
      safeNavigateTo(`/subPackages/afterSaleSub/applyAfterSale?orderId=${orderId.value}`)
      break
  }
}
</script>

<style lang="scss" scoped>
.order-detail-page {
  min-height: 100%;
  background: var(--bg-color);
}

.loading-page {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 300px;

  .loading-text {
    font-size: 28rpx;
    color: var(--text-secondary);
  }
}

.status-header {
  padding: 40rpx 32rpx;
  color: #fff;

  &.status-10, &.status-20 { background: linear-gradient(135deg, #E6A23C, #F5DAB1); }
  &.status-11 { background: linear-gradient(135deg, #F56C6C, #FDE2E2); }
  &.status-40 { background: linear-gradient(135deg, #409EFF, #B3D8FF); }
  &.status-60 { background: linear-gradient(135deg, #67C23A, #C2E7B0); }
  &.status-90 { background: linear-gradient(135deg, #E6A23C, #F5DAB1); }
  &.status-91 { background: linear-gradient(135deg, #909399, #D3D4D6); }

  .status-text {
    display: block;
    font-size: 36rpx;
    font-weight: 700;
    margin-bottom: 10rpx;
  }

  .status-desc {
    font-size: 26rpx;
    opacity: 0.9;
  }
}

.logistics-card, .address-card, .goods-card, .info-card, .price-card {
  background: #fff;
  margin: 16rpx 24rpx;
  border-radius: 12rpx;
  padding: 28rpx 32rpx;

  .card-title {
    font-size: 30rpx;
    font-weight: 600;
    color: var(--text-primary);
    margin-bottom: 20rpx;
  }
}

.logistics-info {
  display: flex;
  align-items: center;

  .logistics-text {
    flex: 1;
    margin-left: 16rpx;

    .logistics-company {
      display: block;
      font-size: 28rpx;
      color: var(--text-primary);
    }

    .tracking-no {
      display: block;
      font-size: 24rpx;
      color: var(--text-placeholder);
      margin-top: 6rpx;
    }
  }
}

.address-card {
  display: flex;
  align-items: flex-start;

  .address-icon-wrap {
    margin-right: 16rpx;
    padding-top: 4rpx;
  }

  .address-detail {
    flex: 1;

    .contact-row {
      margin-bottom: 8rpx;

      .name {
        font-size: 30rpx;
        font-weight: 600;
        color: var(--text-primary);
        margin-right: 20rpx;
      }

      .phone {
        font-size: 28rpx;
        color: var(--text-secondary);
      }
    }

    .address-text {
      font-size: 26rpx;
      color: var(--text-secondary);
      line-height: 1.5;
    }
  }
}

.goods-item {
  display: flex;
  padding: 16rpx 0;
  border-bottom: 1rpx solid var(--border-color);

  &:last-child { border-bottom: none; }

  .goods-image {
    width: 150rpx;
    height: 150rpx;
    border-radius: 8rpx;
    flex-shrink: 0;
  }

  .goods-info {
    flex: 1;
    margin-left: 20rpx;

    .goods-name {
      font-size: 28rpx;
      color: var(--text-primary);
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
      overflow: hidden;
    }

    .sku-name {
      display: block;
      font-size: 24rpx;
      color: var(--text-placeholder);
      margin-top: 8rpx;
    }

    .price-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-top: auto;
      padding-top: 12rpx;

      .price {
        font-size: 30rpx;
        font-weight: 700;
        color: var(--primary-color);
      }

      .qty {
        font-size: 26rpx;
        color: var(--text-secondary);
      }
    }
  }
}

.info-row {
  display: flex;
  justify-content: space-between;
  padding: 14rpx 0;

  .info-label {
    font-size: 26rpx;
    color: var(--text-secondary);
  }

  .info-value {
    font-size: 26rpx;
    color: var(--text-primary);

    &.copyable {
      color: var(--primary-color);
    }
  }
}

.log-item {
  display: flex;
  flex-direction: column;
  padding: 12rpx 0;
  border-bottom: 1rpx solid var(--border-color);

  &:last-child { border-bottom: none; }

  .log-time {
    font-size: 22rpx;
    color: var(--text-placeholder);
    margin-bottom: 6rpx;
  }

  .log-text {
    font-size: 26rpx;
    color: var(--text-secondary);
  }
}

.price-row {
  display: flex;
  justify-content: space-between;
  padding: 12rpx 0;

  .price-label {
    font-size: 26rpx;
    color: var(--text-secondary);
  }

  .price-value {
    font-size: 26rpx;
    color: var(--text-primary);

    &.highlight {
      font-size: 34rpx;
      font-weight: 700;
      color: var(--primary-color);
    }
  }

  &.total {
    border-top: 1rpx solid var(--border-color);
    margin-top: 8rpx;
    padding-top: 20rpx;
  }
}

.action-btn {
  min-width: 180rpx;
  height: 68rpx;
  line-height: 68rpx;
  font-size: 28rpx;
  border-radius: 34rpx;
  border: none;
  padding: 0 24rpx;

  &.primary {
    background: var(--primary-color);
    color: #fff;
  }

  &.default {
    background: transparent;
    color: var(--text-primary);
    border: 1rpx solid var(--border-color);
  }
}
</style>
