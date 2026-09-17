<template>
  <AppPageShell>
    <template #header><AppHeader title="配送拆单" :show-back="true" /></template>
    <template #content>
      <AppContent>
        <view class="split-page">
          <view v-if="loading" class="state-card">正在读取订单与库存预占信息…</view>
          <template v-else-if="context">
            <view class="flow-card">
              <text class="eyebrow">订单 {{ orderNo }}</text>
              <text class="flow-title">一张订单，多地配送</text>
              <text class="flow-copy">支付与发票仍归属原订单，只需按收货地址分配数量；如涉及多个仓库，系统会自动生成对应配送单。</text>
              <view class="flow-steps"><text class="done">已下单</text><text class="line done"/><text class="done">已预占</text><text class="line done"/><text class="done">已支付</text><text class="line"/><text>待出库</text></view>
            </view>

            <template v-if="existingSplits.length">
              <view class="section-heading"><text>配送单</text><text class="section-note">共 {{ existingSplits.length }} 单</text></view>
              <view v-for="split in existingSplits" :key="splitIdOf(split)" class="split-card">
                <view class="card-head">
                  <view><text class="card-title">{{ valueOf(split, 'splitName', 'SplitName', '配送单') }}</text><text class="card-no">{{ valueOf(split, 'splitNo', 'SplitNo', '') }}</text></view>
                  <text class="status-tag">{{ splitStatusText(valueOf(split, 'status', 'Status', 0)) }}</text>
                </view>
                <view class="address-copy"><view><text>{{ valueOf(split, 'receiverName', 'ReceiverName', '') }}　{{ valueOf(split, 'receiverPhone', 'ReceiverPhone', '') }}</text><text>{{ valueOf(split, 'fullAddress', 'FullAddress', '') }}</text></view><text class="warehouse-code">{{ valueOf(split, 'warehouseCode', 'WarehouseCode', '') }}</text></view>
                <view v-for="item in itemsOf(split)" :key="`${splitIdOf(split)}-${itemIdOf(item)}`" class="item-row">
                  <image class="item-image" :src="valueOf(item, 'imageUrl', 'ImageUrl', '')" mode="aspectFill" />
                  <view class="item-copy"><text class="item-name">{{ valueOf(item, 'productName', 'ProductName', '') }}</text><text class="item-spec">{{ valueOf(item, 'skuName', 'SkuName', '') }}</text></view>
                  <text class="item-qty">×{{ valueOf(item, 'quantity', 'Quantity', 0) }}</text>
                </view>
              </view>
            </template>

            <template v-else>
              <view v-if="disabledReason" class="notice-card">{{ disabledReason }}</view>
              <view v-for="(group, groupIndex) in groups" :key="group.key" class="split-card">
                <view class="card-head"><view><text class="card-title">配送地址 {{ groupIndex + 1 }}</text><text class="card-no">设置该地址需要收到的商品数量</text></view><text v-if="groups.length > 1" class="remove-link" @tap="removeGroup(groupIndex)">删除</text></view>
                <picker mode="selector" :range="addressLabels" :value="addressIndex(group.addressId)" @change="selectAddress(groupIndex, $event)">
                  <view class="address-picker" :class="{ placeholder: !group.addressId }">
                    <view v-if="addressById(group.addressId)"><text class="address-person">{{ addressById(group.addressId).name }}　{{ addressById(group.addressId).phone }}</text><text class="address-detail">{{ addressById(group.addressId).fullAddress }}</text></view>
                    <text v-else>请选择收货地址</text><AppIcon name="chevron-right" :size="16" color="#94969C" />
                  </view>
                </picker>
                <view v-for="item in sourceItems" :key="`${group.key}-${itemIdOf(item)}`" class="item-row">
                  <image class="item-image" :src="valueOf(item, 'imageUrl', 'ImageUrl', '')" mode="aspectFill" />
                  <view class="item-copy"><view class="item-title-line"><text class="item-name">{{ valueOf(item, 'productName', 'ProductName', '') }}</text><text v-if="valueOf(item, 'isGift', 'IsGift', false)" class="gift-tag">赠品</text></view><text class="item-spec">{{ valueOf(item, 'skuName', 'SkuName', '') }}</text><text class="item-remaining">待分配 {{ remainingOf(item) }} / 共 {{ quantityOf(item) }}</text></view>
                  <input class="qty-input" type="number" :value="group.quantities[itemIdOf(item)]" @input="setQuantity(groupIndex, itemIdOf(item), $event.detail.value)" />
                </view>
              </view>
              <button class="add-button" :disabled="!canEdit || groups.length >= 10" @tap="addGroup">+ 新增配送地址</button>
              <view class="allocation-summary" :class="{ invalid: !allocationComplete }"><text>{{ allocationComplete ? '所有商品已完整分配' : '每件商品都要按原数量完整分配' }}</text><text>{{ allocatedQuantity }} / {{ totalQuantity }}</text></view>
              <view class="bottom-space" />
            </template>
          </template>
        </view>
      </AppContent>
    </template>
    <template v-if="!loading && context && !existingSplits.length" #footer>
      <FixedActionBar><button class="submit-button" :disabled="!canSubmit || submitting" @tap="submitSplits">{{ submitting ? '正在创建配送单…' : '确认拆单并推送 WMS' }}</button></FixedActionBar>
    </template>
  </AppPageShell>
</template>

<script setup>
import { computed, ref } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import AppPageShell from '@/shared/ui/AppPageShell/AppPageShell.vue'
import AppHeader from '@/shared/ui/AppHeader/AppHeader.vue'
import AppContent from '@/shared/ui/AppContent/AppContent.vue'
import AppIcon from '@/shared/ui/AppIcon/AppIcon.vue'
import FixedActionBar from '@/shared/ui/FixedActionBar/FixedActionBar.vue'
import { createFulfillmentSplits, generateClientRequestId, getFulfillmentAddressList, getFulfillmentSplitContext } from '../../api/orderApi.js'

const orderId = ref(0), context = ref(null), addresses = ref([]), groups = ref([]), loading = ref(true), submitting = ref(false)
const valueOf = (source, camel, pascal, fallback = undefined) => source?.[camel] ?? source?.[pascal] ?? fallback
const orderNo = computed(() => valueOf(context.value, 'orderNo', 'OrderNo', ''))
const disabledReason = computed(() => valueOf(context.value, 'disabledReason', 'DisabledReason', ''))
const sourceItems = computed(() => valueOf(context.value, 'items', 'Items', []) || [])
const existingSplits = computed(() => valueOf(context.value, 'splits', 'Splits', []) || [])
const canEdit = computed(() => valueOf(context.value, 'canSplit', 'CanSplit', false) === true)
const addressLabels = computed(() => addresses.value.map(item => `${item.name} ${item.phone}｜${item.fullAddress}`))
const totalQuantity = computed(() => sourceItems.value.reduce((sum, item) => sum + quantityOf(item), 0))
const allocatedQuantity = computed(() => groups.value.reduce((sum, group) => sum + Object.values(group.quantities).reduce((subtotal, qty) => subtotal + Number(qty || 0), 0), 0))
const allocationComplete = computed(() => sourceItems.value.every(item => remainingOf(item) === 0))
const canSubmit = computed(() => canEdit.value && groups.value.length > 0 && groups.value.every(group => group.addressId > 0 && Object.values(group.quantities).some(qty => Number(qty) > 0)) && allocationComplete.value)

onLoad(async options => { orderId.value = Number(options.orderId) || 0; await loadData() })
async function loadData() {
  loading.value = true
  try {
    const [splitContext, addressList] = await Promise.all([getFulfillmentSplitContext(orderId.value), getFulfillmentAddressList()])
    context.value = splitContext; addresses.value = addressList
    if (!existingSplits.value.length && canEdit.value) initializeGroups()
  } catch (error) { uni.showToast({ title: error?.message || '配送拆单信息加载失败', icon: 'none' }) }
  finally { loading.value = false }
}
function initializeGroups() {
  const preferred = addresses.value.find(item => item.isDefault) || addresses.value[0], quantities = {}
  sourceItems.value.forEach(item => { quantities[itemIdOf(item)] = quantityOf(item) })
  groups.value = [{ key: Date.now(), addressId: preferred?.id || 0, quantities }]
}
function addGroup() { if (!canEdit.value || groups.value.length >= 10) return; const quantities = {}; sourceItems.value.forEach(item => { quantities[itemIdOf(item)] = 0 }); groups.value.push({ key: Date.now() + Math.random(), addressId: 0, quantities }) }
function removeGroup(index) { groups.value.splice(index, 1) }
function addressIndex(id) { return Math.max(0, addresses.value.findIndex(item => item.id === Number(id))) }
function addressById(id) { return addresses.value.find(item => item.id === Number(id)) }
function selectAddress(groupIndex, event) { const address = addresses.value[Number(event.detail.value)]; if (address) groups.value[groupIndex].addressId = address.id }
function itemIdOf(item) { return Number(valueOf(item, 'orderItemId', 'OrderItemId', 0)) }
function splitIdOf(split) { return Number(valueOf(split, 'splitId', 'SplitId', 0)) }
function itemsOf(split) { return valueOf(split, 'items', 'Items', []) || [] }
function quantityOf(item) { return Number(valueOf(item, 'quantity', 'Quantity', 0)) }
function allocatedFor(itemId) { return groups.value.reduce((sum, group) => sum + Number(group.quantities[itemId] || 0), 0) }
function remainingOf(item) { return quantityOf(item) - allocatedFor(itemIdOf(item)) }
function setQuantity(groupIndex, itemId, rawValue) { groups.value[groupIndex].quantities[itemId] = Math.max(0, Math.floor(Number(rawValue) || 0)) }
function splitStatusText(status) { return ({ 0: '待推送', 1: 'WMS接单中', 2: '已接单', 3: '已发货', 4: '已完成', 5: '推送失败', 6: '已取消' })[Number(status)] || '处理中' }
async function submitSplits() {
  if (!canSubmit.value || submitting.value) return
  submitting.value = true
  try {
    await createFulfillmentSplits({ orderId: orderId.value, clientRequestId: generateClientRequestId(), groups: groups.value.map((group, index) => ({ name: `配送单${index + 1}`, addressId: group.addressId, items: sourceItems.value.map(item => ({ orderItemId: itemIdOf(item), quantity: Number(group.quantities[itemIdOf(item)] || 0) })).filter(item => item.quantity > 0) })) })
    uni.showToast({ title: '配送单已推送 WMS', icon: 'success' }); await loadData()
  } catch (error) { uni.showToast({ title: error?.message || '创建配送单失败', icon: 'none' }) }
  finally { submitting.value = false }
}
</script>

<style lang="scss" scoped>
.split-page{width:100%;max-width:920px;margin:0 auto;padding:12px 14px 28px;box-sizing:border-box}.state-card,.notice-card,.flow-card,.split-card{border-radius:16px;background:#fff;box-shadow:0 5px 18px rgba(17,18,22,.045)}.state-card,.notice-card{padding:24px 18px;color:#676a73;font-size:14px;text-align:center}.notice-card{margin-bottom:12px;color:#9a5a00;background:#fffaf2}.flow-card{padding:20px 18px;margin-bottom:18px}.eyebrow{display:block;color:#d7192d;font-size:12px;font-weight:650}.flow-title{display:block;margin-top:6px;color:#111216;font-size:22px;font-weight:700}.flow-copy{display:block;margin-top:8px;color:#676a73;font-size:13px;line-height:20px}.flow-steps{display:flex;align-items:center;margin-top:18px;color:#94969c;font-size:11px}.flow-steps .done{color:#d7192d;font-weight:650}.flow-steps .line{height:1px;flex:1;margin:0 7px;background:#e4e6eb}.flow-steps .line.done{background:rgba(215,25,45,.38)}.section-heading{display:flex;align-items:center;justify-content:space-between;margin:18px 3px 10px;color:#111216;font-size:17px;font-weight:700}.section-note{color:#94969c;font-size:12px;font-weight:400}.split-card{padding:17px;margin-bottom:12px}.card-head{display:flex;align-items:flex-start;justify-content:space-between;gap:12px}.card-title,.card-no{display:block}.card-title{color:#111216;font-size:16px;font-weight:680}.card-no{margin-top:4px;color:#94969c;font-size:11px}.remove-link{color:#d7192d;font-size:13px}.status-tag,.gift-tag{padding:3px 7px;border-radius:6px;color:#b22131;background:#fff0f2;font-size:10px}.address-picker,.address-copy{display:flex;align-items:center;justify-content:space-between;gap:12px;margin:15px 0 4px;padding:13px;border-radius:12px;color:#111216;background:#f7f8fa;font-size:13px}.address-picker.placeholder{color:#94969c}.address-person,.address-detail,.address-copy text{display:block}.address-detail,.address-copy text+text{margin-top:4px;color:#676a73;font-size:12px;line-height:18px}.item-row{display:flex;align-items:center;gap:11px;padding:14px 0;border-bottom:1px solid #f0f1f3}.item-row:last-child{border-bottom:0;padding-bottom:0}.item-image{width:54px;height:54px;flex:0 0 54px;border-radius:9px;background:#f4f5f8}.item-copy{min-width:0;flex:1}.item-title-line{display:flex;align-items:center;gap:6px}.item-name,.item-spec,.item-remaining{display:block}.item-name{overflow:hidden;color:#111216;font-size:13px;font-weight:600;text-overflow:ellipsis;white-space:nowrap}.item-spec,.item-remaining{margin-top:3px;color:#94969c;font-size:11px}.item-remaining{color:#676a73}.qty-input{width:58px;height:34px;border:1px solid #dfe1e6;border-radius:9px;color:#111216;background:#fff;font-size:14px;text-align:center;box-sizing:border-box}.item-qty{color:#111216;font-size:13px;font-weight:650}.add-button{height:46px;margin:4px 0 12px;border:1px dashed rgba(215,25,45,.45);border-radius:13px;color:#d7192d;background:#fff;font-size:14px;line-height:44px}.add-button::after,.submit-button::after{border:0}.allocation-summary{display:flex;align-items:center;justify-content:space-between;padding:13px 15px;border-radius:12px;color:#327052;background:#f1f8f4;font-size:12px}.allocation-summary.invalid{color:#9a5a00;background:#fffaf2}.bottom-space{height:80px}.submit-button{width:100%;height:46px;margin:0;border:0;border-radius:12px;color:#fff;background:#d7192d;font-size:15px;font-weight:650}.submit-button[disabled]{color:#b2b4ba;background:#f1f2f4}@media (min-width:768px){.split-page{padding:18px 20px 36px}.split-card{padding:20px}}
.warehouse-code{flex:0 0 auto!important;margin:0!important;padding:3px 7px;border-radius:6px;color:#676a73!important;background:#f0f1f3;font-size:10px!important}
.flow-steps,.card-no,.status-tag,.gift-tag,.item-spec,.item-remaining,.section-note,.warehouse-code{font-size:12px!important}
.add-button,.submit-button{display:flex;align-items:center;justify-content:center;line-height:1.2}
@media (min-width:800px){.split-page{max-width:1120px}.split-card{display:inline-block;width:calc(50% - 8px);margin-right:8px;vertical-align:top;box-sizing:border-box}.split-card:nth-of-type(even){margin-right:0}.flow-card{padding:24px}.bottom-space{height:96px}}
</style>
