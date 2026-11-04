<template>
  <view class="cart-layout">
    <view class="cart-main">
      <view class="cart-toolbar"><view class="toolbar-left"><text class="toolbar-title">商品清单</text><text class="toolbar-desc">{{ groups.length }} 款商品 · {{ rows.length }} 个规格 · {{ totalQuantity }} 件</text></view><button class="outline-btn button-center" @click="emit('browse')">继续选购</button></view>
      <AppPageState :state="busy && !rows.length ? 'loading' : !rows.length ? 'empty' : 'content'" title="购物车暂无商品" icon-type="cart">
        <view class="spu-list"><view v-for="group in groups" :key="group.key" class="spu-card">
          <CartSpuHeader :name="group.name" :meta="group.items.length + ' 个规格 · ' + group.quantity + ' 件'" :amount="groupAmount(group)" :selected="groupSelected(group)" :partial="groupPartial(group)" :collapsed="isGroupCollapsed(group.key)" :disabled="busy" @select="selectGroup(group)" @product="emit('product',group.items[0]?.quote?.productId)" @toggle="toggleGroup(group.key)" />
          <view v-show="!isGroupCollapsed(group.key)" class="sku-list"><view v-for="item in group.items" :key="item.skuId" class="sku-action-shell" :class="{'action-open':activeItem===item.skuId}"><button class="sku-delete-action button-center" :disabled="busy" @tap.stop="emit('remove',item.skuId)"><AppIcon name="trash" :size="20" /><text>删除</text></button><view class="sku-row" @touchstart="startSwipe($event,item.skuId)" @touchend="endSwipe($event,item.skuId)" @contextmenu.prevent="activeItem=item.skuId">
            <label class="check-wrap" :aria-label="item.selected ? '取消选择' : '选择商品'" :disabled="busy || !item.quote" @tap.stop="!busy && item.quote && emit('edit', item.skuId,item.quantity,!item.selected)"><view class="check" :class="{ checked: item.selected }"><text v-if="item.selected">✓</text></view></label>
            <AppProductImage class="product-image" :src="item.quote?.imageUrl || ''" :show-stock-badge="false" @click="emit('product',item.quote?.productId)" />
            <view class="product-info"><text class="sku-title">{{ item.quote?.specDesc || group.name }}</text><text class="product-code">SKU：{{ item.quote?.skuCode || item.skuId }}</text><view class="price-line"><AmountText v-if="item.quote" class="price" :text="'¥' + item.quote.unitPrice" /><StatusTag v-else type="warning" text="商品已失效" /></view>
              <view class="quantity-row"><QuantityStepper :model-value="item.quantity" size="sm" :min="1" :max="9999" allow-input :disabled="busy || !item.quote" @update:model-value="emit('edit',item.skuId,$event,item.selected)" /><AmountText class="sku-subtotal" :text="'小计 ¥' + (selectionAmount([{...item, selected:true}]) || '待核价')" /></view>
            </view>
            </view>
          </view></view>
        </view></view>
      </AppPageState>
    </view>
    <view v-if="rows.length" class="summary-card"><view class="summary-heading"><view><text class="summary-title">购物车汇总</text><text class="summary-subtitle">已选商品金额以结算核价为准</text></view><view class="summary-badge">{{ selectedRows }} 个规格</view></view><view class="summary-row"><text>已选规格</text><text>{{ selectedRows }} 个</text></view><view class="summary-row"><text>已选数量</text><text>{{ selectedQuantity }} 件</text></view><view class="summary-row"><text>未选数量</text><text>{{ totalQuantity-selectedQuantity }} 件</text></view><view class="summary-divider" /><view class="summary-row total"><text>商品金额</text><AmountText class="total-amount" :text="amount == null ? '待核价' : '¥' + amount" /></view></view>
  </view>
</template>
<script setup>
import { computed, ref } from 'vue'
import CartSpuHeader from '../../commerce/components/CartSpuHeader.vue'
import AppIcon from '@/shared/ui/AppIcon/AppIcon.vue'
import AppProductImage from '@/shared/ui/AppProductImage/AppProductImage.vue'
import AppPageState from '@/shared/ui/AppPageState/AppPageState.vue'
import AmountText from '@/shared/ui/AmountText/AmountText.vue'
import StatusTag from '@/shared/ui/StatusTag/StatusTag.vue'
import QuantityStepper from '@/shared/ui/QuantityStepper/QuantityStepper.vue'
import { shareProductGroups, selectionAmount, shareGroupAmount } from '../model/shareOrderPresentation.js'
const props = defineProps({ rows: { type: Array, default: () => [] }, busy: Boolean })
const emit = defineEmits(['edit','remove','checkout','browse','product'])
const activeItem=ref(null)
let swipeStart=null
/** 使用字符串SKU保持长ID精度，横向手势与纵向滚动区分。 */
function startSwipe(event,id){if(props.busy)return;const point=event.touches?.[0];swipeStart=point?{id,x:point.clientX,y:point.clientY}:null}
/** 与经销商相同的左滑露出删除、右滑收回，仅改变UI。 */
function endSwipe(event,id){const point=event.changedTouches?.[0];if(point&&swipeStart?.id===id){const dx=point.clientX-swipeStart.x,dy=point.clientY-swipeStart.y;if(Math.abs(dx)>40&&Math.abs(dx)>Math.abs(dy))activeItem.value=dx<0?id:null}swipeStart=null}
const collapsedGroups=ref({})
/** 与经销商购物车一致，默认展开，各SPU独立收起。 */
function isGroupCollapsed(key) { return Boolean(collapsedGroups.value[key]) }
/** 折叠仅改变可见性，保留规格的勾选和数量。 */
function toggleGroup(key) { collapsedGroups.value={...collapsedGroups.value,[key]:!isGroupCollapsed(key)} }
/** SPU全选和半选只统计可用规格。 */
function groupSelected(group) { const rows=group.items.filter(row=>row.quote);return rows.length>0&&rows.every(row=>row.selected) }
/** 半选图标保持与经销商一致。 */
function groupPartial(group) { return group.items.some(row=>row.quote&&row.selected)&&!groupSelected(group) }
/** 组勾选不触发伸缩，只修改该SPU本地意向。 */
function selectGroup(group) { if(props.busy)return;const selected=!groupSelected(group);for(const item of group.items.filter(row=>row.quote))emit('edit',item.skuId,item.quantity,selected) }
/** 小计缺失时不显示虚假零价。 */
function groupAmount(group) { const amount=shareGroupAmount(group);return amount==null?'待核价':'¥'+amount }
const selectedRows=computed(()=>props.rows.filter(item=>item.selected).length)
const totalQuantity=computed(()=>props.rows.reduce((sum,item)=>sum+item.quantity,0))
const groups = computed(() => shareProductGroups(props.rows))
const selectedQuantity = computed(() => props.rows.filter(item => item.selected).reduce((sum,item) => sum + item.quantity,0))
const amount = computed(() => selectionAmount(props.rows))
</script>
<style scoped lang="scss">
@import '../../commerce/pages/cart/presentation.scss';


/* 卡片表面统一：外轮廓无描边，状态继续由图标、文字和内容表达。 */
.spu-card, .summary-card {
  border: 0 !important;
  background: var(--glass-card-background, rgba(255,255,255,.74)) !important;
  box-shadow: var(--glass-card-shadow, 0 10px 28px rgba(55,65,80,.07));
  -webkit-backdrop-filter: var(--glass-card-blur, blur(16px));
  backdrop-filter: var(--glass-card-blur, blur(16px));
}
</style>
