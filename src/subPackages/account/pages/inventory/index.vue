<template>
  <AppPageShell>
    <template #header>
      <AppHeader :title="t('account.titles.inventory')" :show-back="true" :searchable="true" :search-value="keywordInput" :search-placeholder="t('account.inventory.skuSearch')" @update:search-value="keywordInput = $event" @search="applySearch" @clear-search="clearSearch" />
      <view class="filter-panel"><StatusTabBar :items="tabs" :model-value="activeTab" :max-width="1040" :item-width="88" @change="changeTab" /></view>
    </template>
    <template #content>
      <AppContent padding="16px var(--page-padding-x,16px) 28px" :refresher-enabled="true" :refresher-triggered="isRefreshing" @refresherrefresh="handleRefresh" @refresherrestore="handleRefresherRestore" @refresherabort="handleRefresherRestore" @scrolltolower="loadMore">
        <view class="inventory-wrap">
          <view class="inventory-tools"><button @tap="openOverview"><AppIcon name="box" :size="17" />{{ t('account.inventory.overview') }}</button><button @tap="openLedger"><AppIcon name="receipt" :size="17" />{{ t('account.inventory.ledger') }}</button></view>
          <view class="result-head"><text>{{ t('account.inventory.productTotalLabel', { count: totalCount }) }}</text><text class="link-text batch-toggle" @tap="toggleSelecting">{{ t(selecting ? 'account.inventory.finishSelection' : 'account.inventory.batchReturn') }}</text></view>
          <text v-if="selecting" class="selection-hint">{{ t('account.inventory.selectHint') }}</text>
          <AppPageState :state="pageState" :title="t('account.inventory.empty')" :description="pageState === PageStatus.ERROR ? loadError : t('account.inventory.emptyHint')" @retry="reload" @action="reload">
            <view class="spu-list">
              <view v-for="product in items" :key="product.productId" class="spu-card">
                <view class="spu-main" @tap="toggleProduct(product)">
                  <AppProductImage class="spu-image" :src="product.imageUrl" mode="aspectFit" />
                  <view class="stock-copy"><text class="spu-name">{{ product.productName || t('account.inventory.unnamed') }}</text><text class="sku-code">{{ t('account.inventory.variantCount', { count: product.skuCount }) }}</text><text v-if="selectedFor(product.productId)" class="selected-mark">{{ t('account.inventory.selected') }} {{ selectedFor(product.productId) }}</text></view>
                  <view class="spu-quantity"><text>{{ t('account.inventory.availableReturn') }}</text><text>{{ formatQty(product.availableQuantity) }}</text><text>{{ product.unit }}</text></view>
                </view>
                <view class="spu-bottom" @tap="toggleProduct(product)"><text>{{ t('account.inventory.physicalStock') }} {{ formatQty(product.onHandQuantity) }} · {{ t('account.inventory.returnReserved') }} {{ formatQty(product.reservedQuantity) }}</text><view><text>{{ t(variants[product.productId]?.expanded ? 'account.inventory.collapse' : 'account.inventory.expand') }}</text><AppIcon :name="variants[product.productId]?.expanded ? 'chevron-up' : 'chevron-down'" :size="13" /></view></view>
                <view v-if="variants[product.productId]?.expanded" class="sku-panel">
                  <view v-for="sku in variants[product.productId].items" :key="sku.skuId" class="variant-row" :class="{ 'variant-selected': isSelected(sku.skuId) }">
                    <view class="variant-main" @tap="selecting ? toggleSku(sku) : openDetail(sku.skuId)">
                      <view v-if="selecting" class="select-circle" :class="{ checked: isSelected(sku.skuId), disabled: sku.availableQuantity <= 0 }"><AppIcon v-if="isSelected(sku.skuId)" name="check" :size="14" color="#fff" /></view>
                      <view class="variant-copy"><text class="variant-name">{{ [sku.colorName, sku.sizeName].filter(Boolean).join(' / ') || sku.skuName }}</text><text class="sku-code">{{ sku.skuCode || ('SKU ' + sku.skuId) }}</text></view>
                      <view class="variant-stock"><text>{{ t('account.inventory.availableReturn') }}</text><text>{{ formatQty(sku.availableQuantity) }} {{ sku.unit }}</text></view>
                      <AppIcon v-if="!selecting" name="chevron-right" :size="13" color="#9BA3AE" />
                    </view>
                    <view v-if="selecting && isSelected(sku.skuId)" class="variant-edit"><text>{{ t('account.inventory.returnQuantity') }}</text><view class="quantity-control"><button class="step-button" :disabled="draft.state.pendingIntent || selectedQuantity(sku.skuId) <= 1" @tap="setQuantity(sku, selectedQuantity(sku.skuId)-1)">−</button><input type="number" class="quantity-input" :disabled="Boolean(draft.state.pendingIntent)" :value="selectedQuantity(sku.skuId)" @input="setQuantity(sku, $event.detail.value)" /><button class="step-button" :disabled="selectedQuantity(sku.skuId) >= sku.availableQuantity" @tap="setQuantity(sku, selectedQuantity(sku.skuId)+1)">＋</button></view></view>
                  </view>
                  <AppLoadMore v-if="variants[product.productId].loading || variants[product.productId].error || variants[product.productId].items.length < variants[product.productId].total" :status="variants[product.productId].error ? 'error' : variants[product.productId].loading ? 'loading' : 'idle'" @retry="loadVariants(product)" />
                  <button v-if="!variants[product.productId].loading && !variants[product.productId].error && variants[product.productId].items.length < variants[product.productId].total" class="more-variants" @tap="loadVariants(product)">{{ t('account.inventory.moreVariants') }}</button>
                </view>
              </view>
            </view>
          </AppPageState>
          <AppLoadMore v-if="pageState === PageStatus.CONTENT" :status="loadMoreStatus" @retry="loadMore" />
        </view>
      </AppContent>
    </template>
    <template v-if="selecting || draft.state.items.length" #footer>
      <FixedActionBar><view class="selection-total"><text>{{ selectedSummary }}</text><text v-if="draft.state.items.length && !draft.state.pendingIntent" class="link-text" @tap="draft.clear()">{{ t('account.inventory.clearSelection') }}</text></view><button class="action-button review-selection" :disabled="!draft.state.items.length" @tap="reviewSelection">{{ t('account.inventory.reviewSelection') }}</button></FixedActionBar>
    </template>
  </AppPageShell>
</template>
<script setup>
import { computed, reactive, ref } from 'vue'
import { onLoad, onShow, onUnload } from '@dcloudio/uni-app'
import { t } from '@/shared/i18n/index.js'
import '@/subPackages/account/i18n/register.js'
import AppPageShell from '@/shared/ui/AppPageShell/AppPageShell.vue'
import AppHeader from '@/shared/ui/AppHeader/AppHeader.vue'
import AppContent from '@/shared/ui/AppContent/AppContent.vue'
import AppPageState from '@/shared/ui/AppPageState/AppPageState.vue'
import AppProductImage from '@/shared/ui/AppProductImage/AppProductImage.vue'
import AppIcon from '@/shared/ui/AppIcon/AppIcon.vue'
import AppLoadMore from '@/shared/ui/AppLoadMore/AppLoadMore.vue'
import FixedActionBar from '@/shared/ui/FixedActionBar/FixedActionBar.vue'
import StatusTabBar from '@/shared/ui/StatusTabBar.vue'
import { PageStatus } from '@/shared/model/pageState.js'
import { navigator } from '@/app/navigation/navigator.js'
import { routes } from '@/app/config/routes.js'
import { useUserStore } from '@/shared/session/userStore.js'
import { useInventoryReturnDraft } from '@/shared/model/inventoryReturnDraft.js'
import { getDealerInventoryProducts, getDealerInventoryList } from '../../api/inventory.js'
import { waitForRefreshAnimation } from '@/shared/utils/refreshAnimation.js'

const userStore = useUserStore()
const owner = () => String(userStore.dealerId || '') + ':' + String(userStore.userId || '')
let draft = useInventoryReturnDraft(owner())
const tabs = computed(() => [{ key:'all',label:t('account.inventory.all') },{ key:'available',label:t('account.inventory.withStock') },{ key:'low',label:t('account.inventory.low') },{ key:'out',label:t('account.inventory.out') }])
const items=ref([]), totalCount=ref(0), pageNum=ref(1), pageSize=16, variants=reactive({}), selecting=ref(false)
const keywordInput=ref(''),keyword=ref(''),activeTab=ref('all'),pageState=ref(PageStatus.LOADING),loadFailure=ref(null)
const loadingMore=ref(false),loadMoreError=ref(false),isRefreshing=ref(false),hasMore=ref(false)
const activeTabLabel=computed(()=>tabs.value.find(item=>item.key===activeTab.value)?.label || '')
const loadError=computed(()=>loadFailure.value?.message || (loadFailure.value?.messageKey ? t(loadFailure.value.messageKey) : ''))
const loadMoreStatus=computed(()=>loadMoreError.value?'error':loadingMore.value?'loading':hasMore.value?'idle':'no-more')
const selectedSummary=computed(()=>t('account.inventory.selectedSummary',{products:new Set(draft.state.items.map(item=>item.productId)).size,skus:draft.state.items.length}))
let generation=0,disposed=false,reading=false
onLoad(options=>{if(tabs.value.some(tab=>tab.key===options?.stockStatus))activeTab.value=options.stockStatus})
onShow(()=>{draft=useInventoryReturnDraft(owner());if(!reading)reload()})
onUnload(()=>{disposed=true;generation++})

/** Refresh SPUs; selection is independent of server pages and query changes. */
async function reload(){
 const token=++generation;reading=true;loadingMore.value=false;pageNum.value=1;items.value=[]
 Object.keys(variants).forEach(key=>delete variants[key]);pageState.value=PageStatus.LOADING;loadFailure.value=null;loadMoreError.value=false
 try{const result=await getDealerInventoryProducts({pageNum:1,pageSize,keyword:keyword.value,stockStatus:activeTab.value});if(disposed||token!==generation)return;applyResult(result,false)}
 catch(error){if(disposed||token!==generation)return;loadFailure.value=error?.message?error:{messageKey:'account.inventory.loadFailed'};pageState.value=PageStatus.ERROR}
 finally{if(token===generation)reading=false}
}
/** Append one SPU page with stale-response and duplicate guards. */
async function loadMore(){
 if(!hasMore.value||loadingMore.value||pageState.value!==PageStatus.CONTENT)return
 const token=generation,next=pageNum.value+1;loadingMore.value=true
 try{const result=await getDealerInventoryProducts({pageNum:next,pageSize,keyword:keyword.value,stockStatus:activeTab.value});if(disposed||token!==generation)return;pageNum.value=next;applyResult(result,true);loadMoreError.value=false}
 catch(error){if(!disposed&&token===generation)loadMoreError.value=true}
 finally{if(token===generation)loadingMore.value=false}
}
/** Apply only server-paged product rows; never group partial SKU pages in the client. */
function applyResult(result,append){items.value=[...new Map((append?[...items.value,...result.items]:result.items).map(item=>[item.productId,item])).values()];totalCount.value=result.totalCount;hasMore.value=pageNum.value*pageSize<result.totalCount;pageState.value=items.value.length?PageStatus.CONTENT:PageStatus.EMPTY}
/** Expand or collapse a product; fetch its variants only once per query generation. */
function toggleProduct(product){
 let group=variants[product.productId]
 if(!group){group=variants[product.productId]={expanded:true,items:[],page:0,total:product.skuCount,loading:false,error:false};return loadVariants(product)}
 group.expanded=!group.expanded
 if(group.expanded&&!group.items.length&&!group.loading)return loadVariants(product)
}
/** Page within one SPU with the same stock/search conditions as its summary. */
async function loadVariants(product){
 const group=variants[product.productId];if(!group||group.loading)return
 const token=generation,next=group.page+1;group.loading=true;group.error=false
 try{
  const result=await getDealerInventoryList({productId:product.productId,pageNum:next,pageSize:20,keyword:keyword.value,stockStatus:activeTab.value})
  if(disposed||token!==generation||variants[product.productId]!==group)return
  group.items=[...new Map([...group.items,...result.items].map(item=>[item.skuId,item])).values()];group.page=next;group.total=result.totalCount
 }catch(error){if(!disposed&&token===generation)group.error=true}finally{if(token===generation)group.loading=false}
}
/** Enter or leave multi-product selection without discarding already chosen SKUs. */
function toggleSelecting(){if(draft.state.pendingIntent)return reviewSelection();selecting.value=!selecting.value}
/** Toggle a positive-quantity SKU while retaining the rest of the selection. */
function toggleSku(sku){if(draft.state.pendingIntent)return;if(isSelected(sku.skuId)){draft.remove(sku.skuId);return}if(sku.availableQuantity<=0)return;if(!draft.set(sku,1))uni.showToast({title:t('account.inventory.limitReached'),icon:'none'})}
/** Update a selected SKU within its currently displayed returnable quantity. */
function setQuantity(sku,quantity){draft.set(sku,quantity)}
/** Read whether one variant is selected. */
function isSelected(skuId){return draft.state.items.some(item=>item.skuId===skuId)}
/** Read the selected quantity independently of the current search result. */
function selectedQuantity(skuId){return draft.state.items.find(item=>item.skuId===skuId)?.quantity||1}
/** Show a compact selection marker on collapsed products. */
function selectedFor(productId){return draft.state.items.filter(item=>item.productId===productId).length}
/** Review all selected products in one return, including rows on other pages. */
function reviewSelection(){if(draft.state.items.length)return navigator.navigateTo(routes.order.inventoryAfterSaleApply())}
/** Use the shared refresh animation. */
async function handleRefresh(){if(isRefreshing.value)return;const start=Date.now();isRefreshing.value=true;try{await reload()}finally{await waitForRefreshAnimation(start);if(!disposed)isRefreshing.value=false}}
/** Restore the native refresher after a request completes. */
function handleRefresherRestore(){if(!reading)isRefreshing.value=false}
/** Submit a trimmed search, preserving selected SKUs. */
function applySearch(){keyword.value=keywordInput.value.trim();return reload()}
/** Clear only the search term. */
function clearSearch(){keywordInput.value='';keyword.value='';return reload()}
/** Switch stock filters, retaining the selection. */
function changeTab(key){if(key!==activeTab.value){activeTab.value=key;return reload()}}
/** Open one SKU's inventory detail. */
function openDetail(skuId){return navigator.navigateTo(routes.account.inventoryDetail(skuId))}
/** Open inventory summary. */
function openOverview(){return navigator.navigateTo(routes.account.inventoryOverview())}
/** Open all inventory activity. */
function openLedger(){return navigator.navigateTo(routes.account.inventoryLedger())}
/** Format quantities in the existing numeric style. */
function formatQty(value){return Number(value||0).toLocaleString('zh-CN')}
</script>
<style lang="scss" scoped>
@import './inventory.scss';
.filter-panel{padding:6px var(--page-padding-x,16px) 12px;}
.spu-list{display:flex;flex-direction:column;gap:14px;}
.spu-card{overflow:hidden;border-radius:16px;background:#fff;}
.spu-main{display:grid;grid-template-columns:60px minmax(0,1fr) auto;align-items:center;gap:12px;padding:18px 14px 14px;}
.spu-image{width:60px;height:70px;border-radius:9px;}
.spu-name{display:block;color:#29313B;font-size:15px;font-weight:650;line-height:1.5;overflow-wrap:anywhere;}
.spu-quantity{text-align:right;min-width:58px;}
.spu-quantity text{display:block;color:#98A0AA;font-size:10px;line-height:1.5;}
.spu-quantity text:nth-child(2){margin:4px 0;color:#D7192D;font-size:23px;font-weight:700;}
.spu-bottom{display:flex;align-items:center;justify-content:space-between;gap:8px;padding:12px 14px;border-top:1px solid #F3F4F6;color:#929AA5;font-size:10px;line-height:1.6;}
.spu-bottom>view{display:flex;align-items:center;gap:4px;color:#596777;flex-shrink:0;}
.sku-panel{padding:0 14px 6px;background:#FCFCFD;border-top:1px solid #F0F2F5;}
.variant-row{padding:14px 0;border-bottom:1px solid #ECEFF3;}
.variant-row:last-child{border-bottom:0;}
.variant-main{display:flex;gap:9px;align-items:center;min-height:42px;}
.variant-copy{min-width:0;flex:1;}
.variant-name{display:block;color:#394450;font-size:13px;font-weight:600;line-height:1.5;}
.variant-stock{text-align:right;flex-shrink:0;}
.variant-stock text{display:block;color:#9AA2AE;font-size:10px;}
.variant-stock text+text{margin-top:5px;color:#424E5B;font-size:14px;font-weight:650;}
.select-circle{display:flex;align-items:center;justify-content:center;flex:0 0 21px;width:21px;height:21px;border:1px solid #CFD5DD;border-radius:6px;box-sizing:border-box;}
.select-circle.checked{background:#D7192D;border-color:#D7192D;}.select-circle.disabled{background:#EBEEF2;border-color:#E1E5EA;}
.variant-edit{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-top:12px;padding-left:30px;color:#87919D;font-size:11px;}
.quantity-control{display:flex;height:34px;width:132px;border:1px solid #E3E7ED;border-radius:8px;overflow:hidden;}
.step-button{width:36px;height:34px;padding:0;margin:0;border-radius:0;background:#F2F4F7;color:#44515F;font-size:17px;line-height:34px;}
.step-button[disabled]{color:#BCC3CC;}.quantity-input{min-width:0;flex:1;height:34px;text-align:center;font-size:13px;background:#fff;}
.selection-hint{display:block;margin:0 2px 13px;color:#959DA8;font-size:12px;line-height:1.6;}
.selected-mark{display:inline-block;margin-top:5px;padding:3px 7px;border-radius:5px;color:#D7192D;background:#FFF0F2;font-size:10px;}
.more-variants{margin:6px 0;padding:8px;background:transparent;color:#7F8996;font-size:12px;}
.selection-total{min-width:0;flex:1;color:#4C5866;font-size:12px;line-height:1.6;}.selection-total text{display:block;}.selection-total .link-text{margin-top:3px;font-size:11px;}
.review-selection{flex:0 1 auto;max-width:50%;font-size:13px;}
@media(min-width:720px){.spu-main{grid-template-columns:76px minmax(0,1fr) auto;padding:22px;gap:18px;}.spu-image{width:76px;height:84px;}.spu-bottom{padding:12px 22px;}.sku-panel{padding:0 22px 8px;}.variant-edit{justify-content:flex-end;}.spu-quantity{min-width:90px;}}
</style>
