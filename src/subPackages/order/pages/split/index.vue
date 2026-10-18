<template>
  <AppPageShell>
    <template #header>
      <AppHeader title="订单按地址拆单" :show-back="true" />
    </template>

    <template #content>
      <AppContent>
        <view class="allocation-page">
          <view v-if="loading" class="state-card">正在读取订单拆单信息…</view>

          <template v-else-if="context">
            <view class="hero-card">
              <text class="eyebrow">订单 {{ orderNo }}</text>
              <text class="hero-title">每件商品，送到正确的地址</text>
              <text class="hero-copy">整件商品可以直接更换地址；数量大于 1 时，还可以拆分到多个地址。</text>
              <view class="hero-summary">
                <view><text class="summary-value">{{ sourceItems.length }}</text><text class="summary-label">款商品</text></view>
                <view class="summary-divider" />
                <view><text class="summary-value">{{ totalQuantity }}</text><text class="summary-label">件</text></view>
                <view class="summary-divider" />
                <view><text class="summary-value">{{ deliveryGroupCount }}</text><text class="summary-label">个地址</text></view>
              </view>
            </view>

            <view v-if="lastSplitFailureReason" class="notice-card">
              上次订单拆单未通过：{{ lastSplitFailureReason }}。请调整后重新提交。
            </view>

            <template v-if="existingSplits.length">
              <view class="section-heading">
                <text>拆分子单</text>
                <text class="section-note">共 {{ existingSplits.length }} 单</text>
              </view>
              <view class="readonly-grid">
                <view v-for="split in existingSplits" :key="splitIdOf(split)" class="split-card readonly-card">
                  <view class="card-head">
                    <view>
                      <text class="card-title">{{ valueOf(split, 'splitName', 'SplitName', '拆分子单') }}</text>
                      <text class="card-subtitle">{{ valueOf(split, 'splitNo', 'SplitNo', '') }}</text>
                    </view>
                    <text class="status-tag">{{ splitStatusText(valueOf(split, 'status', 'Status', 0)) }}</text>
                  </view>
                  <view class="readonly-address">
                    <text class="address-person">{{ valueOf(split, 'receiverName', 'ReceiverName', '') }}　{{ valueOf(split, 'receiverPhone', 'ReceiverPhone', '') }}</text>
                    <text class="address-detail">{{ valueOf(split, 'fullAddress', 'FullAddress', '') }}</text>
                  </view>
                  <view v-for="item in itemsOf(split)" :key="`${splitIdOf(split)}-${itemIdOf(item)}`" class="readonly-item">
                    <AppImage class="item-image" width="100%" height="100%" :src="valueOf(item, 'imageUrl', 'ImageUrl', '')" mode="aspectFill" />
                    <view class="item-copy">
                      <text class="item-name">{{ valueOf(item, 'productName', 'ProductName', '') }}</text>
                      <text class="item-spec">{{ valueOf(item, 'skuName', 'SkuName', '') }}</text>
                    </view>
                    <text class="readonly-quantity">×{{ quantityOf(item) }}</text>
                  </view>
                </view>
              </view>
            </template>

            <template v-else>
              <view v-if="disabledReason" class="notice-card">{{ disabledReason }}</view>

              <view v-if="!disabledReason && !addresses.length" class="empty-address-card">
                <view class="empty-icon"><AppIcon name="location" :size="24" color="#d7192d" /></view>
                <text class="empty-title">还没有可用收货地址</text>
                <text class="empty-copy">新增地址后即可按地址拆分订单。</text>
                <button class="secondary-button button-center" @tap="openAddressManager">新增收货地址</button>
              </view>

              <template v-else-if="!disabledReason">
                <view class="guide-card">
                  <view class="guide-item"><text class="guide-number">1</text><text>先添加需要配送的收货地址。</text></view>
                  <view class="guide-item"><text class="guide-number">2</text><text>在每个地址下分配商品数量，同一个 SKU 可以分到多个地址。</text></view>
                  <view class="guide-item"><text class="guide-number">3</text><text>每个拆分地址至少需要 1 件商品，商品总数量必须全部分配。</text></view>
                </view>

                <view class="section-heading address-section-heading">
                  <view>
                    <text class="section-title">按收货地址拆分</text>
                    <text class="section-note">已使用 {{ addressGroups.length }} 个地址</text>
                  </view>
                  <button
                    class="manage-address"
                    :disabled="!canAddAddressGroup"
                    @tap="addAddressGroup"
                  >{{ canAddAddressGroup ? '添加拆分地址' : '无法继续添加' }}</button>
                </view>

                <view class="address-group-list">
                  <view
                    v-for="(group, groupIndex) in addressGroups"
                    :key="group.key"
                    class="address-group-card"
                  >
                    <view class="address-group-head">
                      <view class="address-group-copy">
                        <text class="address-group-title">拆分地址 {{ groupIndex + 1 }}</text>
                        <text v-if="group.address" class="address-group-contact">
                          {{ group.address.name }}　{{ group.address.phone }}
                        </text>
                      </view>
                      <button
                        v-if="addressGroups.length > 1"
                        class="remove-address-button"
                        @tap="removeAddressGroup(group.addressId)"
                      >移除地址</button>
                    </view>

                    <view v-if="group.address" class="group-address-detail">
                      {{ group.address.fullAddress }}
                    </view>

                    <view class="group-item-list">
                      <view v-for="item in sourceItems" :key="group.key + '-' + itemIdOf(item)" class="group-item-row">
                        <AppImage
                          class="item-image group-item-image"
                          width="100%"
                          height="100%"
                          :src="valueOf(item, 'imageUrl', 'ImageUrl', '')"
                          mode="aspectFill"
                        />
                        <view class="item-copy">
                          <text class="item-name">{{ valueOf(item, 'productName', 'ProductName', '') }}</text>
                          <text class="item-spec">订单数量 {{ quantityOf(item) }} 件</text>
                        </view>
                        <view class="group-item-quantity">
                          <text class="quantity-label">分配数量</text>
                          <QuantityStepper
                            :model-value="quantityAtAddress(group.addressId, itemIdOf(item))"
                            :min="1"
                            :max="maximumForAddressItem(group.addressId, itemIdOf(item))"
                            :allow-zero="canSetAddressItemZero(group.addressId, itemIdOf(item))"
                            size="sm"
                            @update:model-value="setAddressItemQuantity(group.addressId, itemIdOf(item), $event)"
                          />
                        </view>
                      </view>
                    </view>

                    <view class="address-group-total">
                      <text>本地址分配</text>
                      <text class="address-group-total-number">{{ groupTotalQuantity(group.addressId) }} 件</text>
                    </view>
                  </view>
                </view>

                <view class="allocation-summary" :class="{ invalid: Boolean(validationError) }">
                  <view>
                    <text class="allocation-title">{{ validationError || '商品数量已完整分配' }}</text>
                    <text class="allocation-copy">系统将按收货地址生成 {{ deliveryGroupCount }} 个拆分子单</text>
                  </view>
                  <text class="allocation-total">{{ totalQuantity }} 件</text>
                </view>
              </template>
              <view class="bottom-space" />
            </template>
          </template>
        </view>
      </AppContent>
    </template>

    <template v-if="!loading && context && !existingSplits.length" #footer>
      <FixedActionBar>
        <button class="submit-button button-center" :disabled="!canSubmit || submitting" @tap="submitSplits">
          {{ submitting ? '正在生成拆分子单…' : submitButtonText }}
        </button>
      </FixedActionBar>
    </template>
  </AppPageShell>
</template>

<script setup>
import { computed, ref } from 'vue'
import { onLoad, onShow } from '@dcloudio/uni-app'
import AppPageShell from '@/shared/ui/AppPageShell/AppPageShell.vue'
import AppHeader from '@/shared/ui/AppHeader/AppHeader.vue'
import AppContent from '@/shared/ui/AppContent/AppContent.vue'
import AppIcon from '@/shared/ui/AppIcon/AppIcon.vue'
import AppImage from '@/shared/ui/AppImage/AppImage.vue'
import FixedActionBar from '@/shared/ui/FixedActionBar/FixedActionBar.vue'
import QuantityStepper from '@/shared/ui/QuantityStepper/QuantityStepper.vue'
import { navigator } from '@/app/navigation/navigator.js'
import { routes } from '@/app/config/routes.js'
import {
  addAllocation,
  buildFulfillmentGroups,
  changeAllocationAddress,
  changeAllocationQuantity,
  createAllocationPlan,
  removeAllocation,
  validateAllocationPlan,
} from '../../domain/fulfillmentAllocation.js'
import {
  createFulfillmentSplits,
  generateClientRequestId,
  getFulfillmentAddressList,
  getFulfillmentSplitContext,
} from '../../api/orderApi.js'

const orderId = ref(0)
const context = ref(null)
const addresses = ref([])
const allocationPlan = ref([])
const loading = ref(true)
const submitting = ref(false)
const pageReady = ref(false)

const valueOf = (source, camel, pascal, fallback = undefined) => source?.[camel] ?? source?.[pascal] ?? fallback
const orderNo = computed(() => valueOf(context.value, 'orderNo', 'OrderNo', ''))
const disabledReason = computed(() => valueOf(context.value, 'disabledReason', 'DisabledReason', ''))
const sourceItems = computed(() => valueOf(context.value, 'items', 'Items', []) || [])
const existingSplits = computed(() => valueOf(context.value, 'splits', 'Splits', []) || [])
const lastSplitFailureReason = computed(() => valueOf(context.value, 'lastSplitFailureReason', 'LastSplitFailureReason', ''))
const canEdit = computed(() => valueOf(context.value, 'canSplit', 'CanSplit', false) === true)
const addressIds = computed(() => addresses.value.map(item => item.id))
const usedAddressIds = computed(() => {
  const ids = []
  for (const item of allocationPlan.value) {
    for (const allocation of item.allocations || []) {
      const addressId = Number(allocation.addressId)
      if (addressId > 0 && !ids.includes(addressId)) ids.push(addressId)
    }
  }
  return ids
})
const addressGroups = computed(() => usedAddressIds.value.map(addressId => ({
  key: String(addressId),
  addressId,
  address: addressById(addressId),
})))
const canAddAddressGroup = computed(() => (
  addressGroups.value.length < 10
  && addresses.value.some(address => !usedAddressIds.value.includes(address.id))
  && totalQuantity.value > addressGroups.value.length
))
const totalQuantity = computed(() => sourceItems.value.reduce((sum, item) => sum + quantityOf(item), 0))
const deliveryGroups = computed(() => buildFulfillmentGroups(allocationPlan.value))
const deliveryGroupCount = computed(() => deliveryGroups.value.length)
const validationError = computed(() => validateAllocationPlan(allocationPlan.value, addressIds.value))
const canSubmit = computed(() => canEdit.value && !validationError.value && !submitting.value)
const submitButtonText = computed(() => deliveryGroupCount.value > 1
  ? `生成 ${deliveryGroupCount.value} 个拆分子单`
  : '确认订单拆分')

onLoad(async options => {
  orderId.value = Number(options.orderId) || 0
  await loadData()
  pageReady.value = true
})

onShow(async () => {
  if (!pageReady.value || loading.value || existingSplits.value.length) return
  await refreshAddresses()
})

/** 加载配送上下文和地址，并建立不会丢失数量的商品分配方案。 */
async function loadData() {
  loading.value = true
  try {
    const [splitContext, addressList] = await Promise.all([
      getFulfillmentSplitContext(orderId.value),
      getFulfillmentAddressList(),
    ])
    context.value = splitContext
    addresses.value = addressList
    if (!existingSplits.value.length && canEdit.value) initializePlan()
  } catch (error) {
    uni.showToast({ title: error?.message || '订单拆单信息加载失败', icon: 'none' })
  } finally {
    loading.value = false
  }
}

/** 使用默认地址初始化商品分配；页面按地址分组展示，同一 SKU 可进入多个地址。 */
function initializePlan() {
  const preferred = addresses.value.find(item => item.isDefault) || addresses.value[0]
  allocationPlan.value = createAllocationPlan(sourceItems.value, preferred?.id || 0)
}

/** 从地址管理返回后刷新列表，并只修复已被删除的地址，不覆盖用户已完成的分配。 */
async function refreshAddresses() {
  try {
    addresses.value = await getFulfillmentAddressList()
    const validIds = new Set(addresses.value.map(item => item.id))
    const fallbackId = (addresses.value.find(item => item.isDefault) || addresses.value[0])?.id || 0
    allocationPlan.value = allocationPlan.value.map(item => {
      const used = new Set()
      return {
        ...item,
        allocations: item.allocations.map(allocation => {
          let addressId = validIds.has(allocation.addressId) ? allocation.addressId : 0
          if (!addressId) {
            addressId = addresses.value.find(address => !used.has(address.id))?.id || fallbackId
          }
          used.add(addressId)
          return { ...allocation, addressId }
        }),
      }
    })
  } catch (error) {
    uni.showToast({ title: error?.message || '收货地址刷新失败', icon: 'none' })
  }
}

function findPlanItem(orderItemId) {
  return allocationPlan.value.find(item => item.orderItemId === Number(orderItemId))
}

function allocationIndexAtAddress(orderItemId, addressId) {
  const planItem = findPlanItem(orderItemId)
  return planItem?.allocations?.findIndex(allocation => allocation.addressId === Number(addressId)) ?? -1
}

function quantityAtAddress(addressId, orderItemId) {
  const planItem = findPlanItem(orderItemId)
  const allocation = planItem?.allocations?.find(item => item.addressId === Number(addressId))
  return Number(allocation?.quantity || 0)
}

function maximumForAddressItem(addressId, orderItemId) {
  const planItem = findPlanItem(orderItemId)
  if (!planItem) return 0
  const targetIndex = allocationIndexAtAddress(orderItemId, addressId)
  if (targetIndex < 0 && planItem.allocations.length === 1) {
    const sourceAddressId = planItem.allocations[0].addressId
    if (groupTotalQuantity(sourceAddressId) > 1) return planItem.totalQuantity
  }
  const otherQuantity = (planItem.allocations || [])
    .filter(allocation => allocation.addressId !== Number(addressId))
    .reduce((sum, allocation) => sum + Number(allocation.quantity || 0), 0)
  return Math.max(0, planItem.totalQuantity - otherQuantity)
}

function canSetAddressItemZero(addressId, orderItemId) {
  const planItem = findPlanItem(orderItemId)
  const targetIndex = allocationIndexAtAddress(orderItemId, addressId)
  return Boolean(
    planItem
    && targetIndex >= 0
    && (planItem.allocations.length > 1 || addressGroups.value.length > 1),
  )
}

function addAddressGroup() {
  if (!canAddAddressGroup.value) {
    uni.showToast({ title: '请先保证有可拆分的商品数量', icon: 'none' })
    return
  }
  const candidate = addresses.value.find(address => !usedAddressIds.value.includes(address.id))
  if (!candidate) return

  const splitPlanIndex = allocationPlan.value.findIndex(item => (
    (item.allocations || []).some(allocation => allocation.quantity > 1)
  ))
  if (splitPlanIndex >= 0) {
    allocationPlan.value[splitPlanIndex] = addAllocation(
      allocationPlan.value[splitPlanIndex],
      candidate.id,
    )
    return
  }

  const movablePlanIndex = allocationPlan.value.findIndex(item => (
    item.allocations?.length === 1
    && groupTotalQuantity(item.allocations[0].addressId) > 1
  ))
  if (movablePlanIndex >= 0) {
    allocationPlan.value[movablePlanIndex] = changeAllocationAddress(
      allocationPlan.value[movablePlanIndex],
      0,
      candidate.id,
    )
  }
}

function removeAddressGroup(addressId) {
  if (addressGroups.value.length <= 1) return
  const fallback = addressGroups.value.find(group => group.addressId !== Number(addressId))
  if (!fallback) return

  allocationPlan.value = allocationPlan.value.map(planItem => {
    const targetIndex = planItem.allocations.findIndex(
      allocation => allocation.addressId === Number(addressId),
    )
    if (targetIndex < 0) return planItem
    if (planItem.allocations.length > 1) {
      return removeAllocation(planItem, targetIndex)
    }
    return changeAllocationAddress(planItem, targetIndex, fallback.addressId)
  })
}

function setAddressItemQuantity(addressId, orderItemId, requestedQuantity) {
  const planIndex = allocationPlan.value.findIndex(item => item.orderItemId === Number(orderItemId))
  if (planIndex < 0) return

  const planItem = allocationPlan.value[planIndex]
  const targetIndex = allocationIndexAtAddress(orderItemId, addressId)
  const quantity = Math.max(0, Math.floor(Number(requestedQuantity)) || 0)
  let next = planItem

  if (targetIndex < 0) {
    if (quantity <= 0) return
    next = addAllocation(planItem, addressId)
    let addedIndex = allocationIndexAtAddress(orderItemId, addressId)
    if (addedIndex < 0 && planItem.allocations.length === 1) {
      const sourceAddressId = planItem.allocations[0].addressId
      if (groupTotalQuantity(sourceAddressId) > 1 && quantity === planItem.totalQuantity) {
        next = changeAllocationAddress(planItem, 0, addressId)
        addedIndex = allocationIndexAtAddress(orderItemId, addressId)
      }
    }
    if (addedIndex < 0) return
    if (quantity > 1) next = changeAllocationQuantity(next, addedIndex, quantity)
  } else if (quantity <= 0) {
    if (!canSetAddressItemZero(addressId, orderItemId)) {
      uni.showToast({ title: '每件商品至少要保留一个拆分地址', icon: 'none' })
      return
    }
    if (planItem.allocations.length > 1) {
      next = removeAllocation(planItem, targetIndex)
    } else {
      const fallback = addressGroups.value.find(group => group.addressId !== Number(addressId))
      if (!fallback) return
      next = changeAllocationAddress(planItem, targetIndex, fallback.addressId)
    }
  } else if (planItem.allocations.length === 1 && quantity < planItem.totalQuantity) {
    const fallback = addressGroups.value.find(group => group.addressId !== Number(addressId))
    if (!fallback) {
      uni.showToast({ title: '请先添加另一个拆分地址', icon: 'none' })
      return
    }
    next = addAllocation(planItem, fallback.addressId)
    const refreshedTargetIndex = allocationIndexAtAddress(orderItemId, addressId)
    next = changeAllocationQuantity(next, refreshedTargetIndex, quantity)
  } else {
    next = changeAllocationQuantity(planItem, targetIndex, quantity)
  }

  allocationPlan.value[planIndex] = next
}
function itemIdOf(item) { return Number(valueOf(item, 'orderItemId', 'OrderItemId', 0)) }
function splitIdOf(split) { return Number(valueOf(split, 'splitId', 'SplitId', 0)) }
function itemsOf(split) { return valueOf(split, 'items', 'Items', []) || [] }
function quantityOf(item) { return Number(valueOf(item, 'quantity', 'Quantity', 0)) }
function addressById(id) { return addresses.value.find(item => item.id === Number(id)) }
function groupTotalQuantity(addressId) {
  return allocationPlan.value.reduce((sum, item) => (
    sum + (item.allocations || [])
      .filter(allocation => allocation.addressId === Number(addressId))
      .reduce((itemSum, allocation) => itemSum + Number(allocation.quantity || 0), 0)
  ), 0)
}
/** 打开统一地址管理页；返回后 onShow 会保留方案并刷新新增地址。 */
function openAddressManager() {
  navigator.navigateTo(routes.account.address())
}

/** 将内部配送状态转换为客户可理解的进度文案。 */
function splitStatusText(status) {
  return ({ 0: '待处理', 1: '处理中', 2: '待发货', 3: '已发货', 4: '已完成', 5: '处理异常', 6: '已取消' })[Number(status)] || '处理中'
}

/** 校验商品分配后按地址归并并提交，客户无需理解系统内部拆单结构。 */
async function submitSplits() {
  if (!canSubmit.value || submitting.value) {
    if (validationError.value) uni.showToast({ title: validationError.value, icon: 'none' })
    return
  }
  submitting.value = true
  try {
    await createFulfillmentSplits({
      orderId: orderId.value,
      clientRequestId: generateClientRequestId(),
      groups: deliveryGroups.value,
    })
    uni.showToast({ title: '订单拆分已提交', icon: 'success' })
    await loadData()
  } catch (error) {
    uni.showToast({ title: error?.message || '订单拆分提交失败', icon: 'none' })
  } finally {
    submitting.value = false
  }
}
</script>

<style lang="scss" scoped>
.allocation-page {
  width: 100%;
  max-width: 1120px;
  margin: 0 auto;
  padding: 12px 14px 28px;
  box-sizing: border-box;
}

.state-card,
.notice-card,
.hero-card,
.guide-card,
.product-card,
.split-card,
.empty-address-card {
  border-radius: 16px;
  background: var(--glass-card-background, rgba(255,255,255,.74));
  box-shadow: var(--glass-card-shadow, 0 10px 28px rgba(55,65,80,.07));
  -webkit-backdrop-filter: blur(16px);
  backdrop-filter: blur(16px);
}

.state-card,
.notice-card { padding: 24px 18px; color: #676a73; font-size: 14px; text-align: center; }
.notice-card { margin-bottom: 12px; color: #9a5a00; background: rgba(255,250,242,.72); }
.hero-card { padding: 20px 18px; margin-bottom: 14px; }
.eyebrow { display: block; color: #d7192d; font-size: var(--type-caption, 12px); font-weight: 650; }
.hero-title { display: block; margin-top: 6px; color: #111216; font-size: 22px; font-weight: 750; }
.hero-copy { display: block; margin-top: 8px; color: #676a73; font-size: var(--type-body-small, 13px); line-height: 20px; }
.hero-summary { display: flex; align-items: center; margin-top: 18px; padding: 13px 16px; border-radius: 12px; background: rgba(247,248,250,.56); -webkit-backdrop-filter: blur(10px); backdrop-filter: blur(10px); }
.hero-summary > view:not(.summary-divider) { display: flex; flex: 1; align-items: baseline; justify-content: center; gap: 4px; }
.summary-value { color: #111216; font-size: 18px; font-weight: 750; font-variant-numeric: tabular-nums; }
.summary-label { color: #676a73; font-size: 12px; }
.summary-divider { width: 1px; height: 22px; background: #e4e6eb; }

.guide-card { padding: 14px 16px; margin-bottom: 16px; background: rgba(255,247,248,.64); }
.guide-item { display: flex; align-items: flex-start; gap: 9px; color: #5f5053; font-size: 12px; line-height: 18px; }
.guide-item + .guide-item { margin-top: 7px; }
.guide-number { display: flex; width: 18px; height: 18px; flex: 0 0 18px; align-items: center; justify-content: center; border-radius: 50%; color: #fff; background: #d7192d; font-size: 11px; font-weight: 700; }

.section-heading { display: flex; align-items: center; justify-content: space-between; margin: 18px 3px 10px; color: #111216; font-size: 17px; font-weight: 700; }
.section-note { color: #94969c; font-size: 12px; font-weight: 400; }
.manage-address { display: flex; align-items: center; justify-content: center; margin: 0; padding: 4px 0 4px 12px; border: 0; color: #d7192d; background: transparent; font-size: 13px; line-height: 20px; }
.manage-address::after { border: 0; }
.section-title { display: block; }
.address-section-heading { align-items: flex-end; }
.manage-address[disabled] { color: #a9abb1; opacity: .75; }

.address-group-list { display: grid; grid-template-columns: minmax(0, 1fr); gap: 12px; }
.address-group-card {
  padding: 17px;
  border-radius: 16px;
  background: var(--glass-card-background, rgba(255,255,255,.74));
  box-shadow: var(--glass-card-shadow, 0 10px 28px rgba(55,65,80,.07));
  -webkit-backdrop-filter: blur(16px);
  backdrop-filter: blur(16px);
}
.address-group-head { display: flex; align-items: flex-start; justify-content: space-between; gap: 12px; }
.address-group-copy { min-width: 0; }
.address-group-title,
.address-group-contact,
.group-address-detail { display: block; }
.address-group-title { color: #111216; font-size: 16px; font-weight: 700; }
.address-group-contact { margin-top: 5px; overflow: hidden; color: #676a73; font-size: 12px; text-overflow: ellipsis; white-space: nowrap; }
.remove-address-button {
  flex: 0 0 auto;
  margin: 0;
  padding: 4px 0 4px 10px;
  border: 0;
  color: #d7192d;
  background: transparent;
  font-size: 12px;
  line-height: 20px;
}
.remove-address-button::after { border: 0; }
.group-address-detail {
  margin-top: 10px;
  padding: 10px 12px;
  overflow: hidden;
  border-radius: 10px;
  color: #676a73;
  background: #f7f8fa;
  font-size: 12px;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.group-item-list { margin-top: 12px; }
.group-item-row { display: flex; align-items: center; gap: 10px; padding: 12px 0; border-bottom: 1px solid #f0f1f3; }
.group-item-row:last-child { border-bottom: 0; }
.group-item-image { width: 48px; height: 48px; flex-basis: 48px; }
.group-item-quantity { flex: 0 0 auto; }
.group-item-quantity .quantity-label { margin-bottom: 4px; }
.address-group-total {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: 8px;
  padding-top: 12px;
  border-top: 1px solid #f0f1f3;
  color: #676a73;
  font-size: 12px;
}
.address-group-total-number { color: #111216; font-size: 15px; font-weight: 700; }
.product-grid,
.readonly-grid { display: grid; grid-template-columns: minmax(0, 1fr); gap: 12px; }
.product-card,
.split-card { padding: 17px; }
.product-head,
.card-head { display: flex; align-items: flex-start; gap: 11px; }
.card-head { justify-content: space-between; }
.item-image { width: 54px; height: 54px; flex: 0 0 54px; border-radius: 9px; background: #f4f5f8; }
.product-image { width: 58px; height: 58px; flex-basis: 58px; }
.item-copy { min-width: 0; flex: 1; }
.item-title-line { display: flex; align-items: center; gap: 6px; }
.item-name,
.item-spec { display: block; }
.item-name { overflow: hidden; color: #111216; font-size: 14px; font-weight: 650; text-overflow: ellipsis; white-space: nowrap; }
.item-spec { margin-top: 4px; color: #94969c; font-size: 12px; }
.gift-tag,
.status-tag { padding: 3px 7px; border-radius: 6px; color: #b22131; background: #fff0f2; font-size: 11px; }
.total-badge { display: flex; align-items: baseline; gap: 2px; padding: 5px 8px; border-radius: 8px; color: #676a73; background: #f7f8fa; font-size: 11px; white-space: nowrap; }
.total-number { color: #111216; font-size: 16px; font-weight: 750; font-variant-numeric: tabular-nums; }

.destination-list { margin-top: 15px; }
.destination-row { padding: 13px; border-radius: 13px; background: #f7f8fa; }
.destination-row + .destination-row { margin-top: 9px; }
.destination-head { display: flex; align-items: center; justify-content: space-between; margin-bottom: 9px; }
.destination-label { color: #676a73; font-size: 12px; font-weight: 650; }
.remove-button { display: flex; align-items: center; justify-content: center; height: 24px; margin: 0; padding: 0 2px; border: 0; color: #d7192d; background: transparent; font-size: 11px; line-height: 18px; }
.remove-button::after { border: 0; }
.destination-controls { display: flex; align-items: flex-end; gap: 10px; }
.address-control { min-width: 0; flex: 1; }
.address-picker { display: flex; min-height: 48px; align-items: center; justify-content: space-between; gap: 8px; padding: 9px 11px; border: 1px solid #e5e6ea; border-radius: 10px; color: #111216; background: #fff; box-sizing: border-box; }
.address-picker.placeholder { color: #94969c; }
.address-copy { min-width: 0; flex: 1; }
.address-person,
.address-detail { display: block; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.address-person { color: #24252a; font-size: 12px; font-weight: 600; }
.address-detail { margin-top: 3px; color: #777a83; font-size: 11px; }
.quantity-control { flex: 0 0 auto; }
.quantity-label { display: block; margin-bottom: 5px; color: #94969c; font-size: 11px; text-align: center; }
.split-more-button { width: 100%; min-height: 40px; margin: 11px 0 0; padding: 8px 12px; border: 1px dashed rgba(215, 25, 45, .35); border-radius: 11px; gap: 6px; color: #d7192d; background: #fff; font-size: 13px; line-height: 20px; }
.split-more-button::after { border: 0; }
.split-more-button[disabled] { border-color: #e3e4e8; color: #a9abb1; background: #f7f8fa; }

.allocation-summary { display: flex; align-items: center; justify-content: space-between; gap: 14px; margin-top: 14px; padding: 14px 16px; border-radius: 13px; color: #2f6d4e; background: #eff8f3; }
.allocation-summary.invalid { color: #9a5a00; background: #fffaf2; }
.allocation-title,
.allocation-copy { display: block; }
.allocation-title { font-size: 13px; font-weight: 650; }
.allocation-copy { margin-top: 3px; font-size: 11px; opacity: .82; }
.allocation-total { flex: 0 0 auto; font-size: 16px; font-weight: 750; font-variant-numeric: tabular-nums; }

.empty-address-card { display: flex; flex-direction: column; align-items: center; padding: 34px 20px; text-align: center; }
.empty-icon { display: flex; width: 48px; height: 48px; align-items: center; justify-content: center; border-radius: 50%; background: #fff0f2; }
.empty-title { margin-top: 13px; color: #111216; font-size: 16px; font-weight: 700; }
.empty-copy { margin-top: 6px; color: #777a83; font-size: 13px; }
.secondary-button { height: 42px; margin: 18px 0 0; padding: 0 22px; border: 0; border-radius: 11px; color: #fff; background: #d7192d; font-size: 14px; }
.secondary-button::after { border: 0; }

.card-title,
.card-subtitle { display: block; }
.card-title { color: #111216; font-size: 16px; font-weight: 680; }
.card-subtitle { margin-top: 4px; color: #94969c; font-size: 11px; }
.readonly-address { margin: 14px 0 4px; padding: 12px 13px; border-radius: 11px; background: #f7f8fa; }
.readonly-item { display: flex; align-items: center; gap: 11px; padding: 13px 0; border-bottom: 1px solid #f0f1f3; }
.readonly-item:last-child { border-bottom: 0; padding-bottom: 0; }
.readonly-quantity { color: #111216; font-size: 13px; font-weight: 650; }

.bottom-space { height: 86px; }
.submit-button { width: 100%; height: 46px; margin: 0; border: 0; border-radius: 12px; color: #fff; background: #d7192d; font-size: 15px; font-weight: 650; line-height: 20px; }
.submit-button::after { border: 0; }
.submit-button[disabled] { color: #b2b4ba; background: #f1f2f4; }
.button-center { display: flex; align-items: center; justify-content: center; text-align: center; }

@media (min-width: 800px) {
  .allocation-page { padding: 18px 20px 36px; }
  .hero-card { padding: 24px; }
  .product-grid,
  .readonly-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .product-card,
  .split-card { padding: 20px; }
  .bottom-space { height: 96px; }
}

@media (max-width: 1050px) {
  .destination-controls { align-items: stretch; flex-direction: column; }
  .quantity-control { display: flex; align-items: center; justify-content: space-between; }
  .quantity-label { margin: 0; text-align: left; }
}
</style>
