<template>
  <AppPageShell>
    <template #header><AppHeader :title="t('order.afterSale.inventoryApply.title')" :show-back="true" /></template>
    <template #content>
      <AppContent padding="16px var(--page-padding-x,16px) 28px">
        <view class="apply-page">
          <AppPageState :state="pageState" :title="pageState === PageStatus.EMPTY ? t('order.afterSale.inventoryApply.emptySelection') : t('order.afterSale.inventoryApply.loadFailed')" :description="pageState === PageStatus.EMPTY ? t('order.afterSale.inventoryApply.emptySelectionHint') : loadError" :action-text="pageState === PageStatus.EMPTY ? t('order.afterSale.inventoryApply.continueSelecting') : t('common.retry')" @retry="loadData" @action="handleStateAction">
            <view class="card selected-card">
              <view class="section-heading"><view><text class="section-title">{{ t('order.afterSale.inventoryApply.selectedProducts') }}</text><text class="sub-title">{{ selectionSummary }}</text></view><text v-if="!locked" class="link-text continue-selecting" @tap="continueSelecting">{{ t('order.afterSale.inventoryApply.continueSelecting') }}</text></view>
              <view v-for="group in productGroups" :key="group.productId" class="return-product">
                <view class="product-head"><AppProductImage class="product-image" :src="group.imageUrl" mode="aspectFit" /><text class="product-name">{{ group.productName }}</text></view>
                <view v-for="item in group.items" :key="item.skuId" class="return-sku" :class="{ invalid: !validItem(item) && !pending }">
                  <view class="sku-heading"><view><text class="sku-name">{{ item.skuName || ('SKU ' + item.skuId) }}</text><text class="available">{{ t('order.afterSale.inventoryApply.available') }} {{ formatQty(item.availableQuantity) }} {{ item.unit }}</text></view><text v-if="!locked" class="remove-item" @tap="removeItem(item.skuId)">{{ t('order.afterSale.inventoryApply.remove') }}</text></view>
                  <view class="quantity-row"><text>{{ t('order.afterSale.inventoryApply.quantity') }}</text><view class="quantity-control"><button class="step-button" :disabled="locked || item.quantity <= 1" @tap="setQuantity(item,item.quantity-1)">−</button><input class="quantity-input" type="number" :value="item.quantity" :disabled="locked || item.availableQuantity <= 0" @input="setQuantity(item,$event.detail.value)" /><button class="step-button" :disabled="locked || item.quantity >= item.availableQuantity" @tap="setQuantity(item,item.quantity+1)">＋</button></view></view>
                  <text v-if="!validItem(item) && !pending" class="stock-error">{{ item.availableQuantity <= 0 ? t('order.afterSale.inventoryApply.unavailable') : t('order.afterSale.inventoryApply.quantityExceeded', { max:item.availableQuantity,unit:item.unit }) }}</text>
                </view>
              </view>
              <button v-if="rows.length > visibleLimit" class="show-more" @tap="visibleLimit += 30">{{ t('order.afterSale.inventoryApply.moreSelected') }}</button>
            </view>
            <view class="card section-card"><text class="section-title">{{ t('order.afterSale.inventoryApply.refundAccount') }}</text><picker v-if="accounts.length" :range="accounts" range-key="label" :value="selectedAccountIndex" :disabled="locked" @change="selectAccount"><view class="picker-row"><text>{{ selectedAccount?.label || t('order.afterSale.inventoryApply.chooseAccount') }}</text><AppIcon name="chevron-right" :size="14" color="#9BA3AE" /></view></picker><text v-else class="sub-title">{{ t('order.afterSale.inventoryApply.noAccount') }}</text></view>
            <view class="card section-card"><text class="section-title">{{ t('order.afterSale.inventoryApply.reason') }}</text><textarea v-model="form.reason" :disabled="locked" class="reason-input" maxlength="500" :placeholder="t('order.afterSale.inventoryApply.reasonPlaceholder')" /><text class="counter">{{ form.reason.length }}/500</text></view>
            <view class="card section-card express-card"><text class="section-title">{{ t('order.afterSale.expressNo') }}</text><input v-model="form.expressNo" :disabled="locked || submitted" class="express-input" maxlength="100" :placeholder="t('order.afterSale.expressNoPlaceholder')" /></view>
            <view class="refund-status"><text>{{ t('order.afterSale.inventoryApply.pendingAmount') }}</text><text>{{ t('order.afterSale.inventoryApply.notice') }}</text></view>
            <text v-if="pending" class="pending-result">{{ t('order.afterSale.inventoryApply.pendingResult') }}</text>
            <text v-else-if="rows.some(item => !validItem(item))" class="stock-error">{{ t('order.afterSale.inventoryApply.stockChanged') }}</text>
          </AppPageState>
        </view>
      </AppContent>
    </template>
    <template v-if="pageState === PageStatus.CONTENT" #footer><FixedActionBar><button class="submit-button" :disabled="!canSubmit" :loading="submitting" @tap="submit">{{ t(pending ? 'order.afterSale.inventoryApply.retrySubmit' : 'order.afterSale.inventoryApply.submit') }}</button></FixedActionBar></template>
  </AppPageShell>
</template>
<script setup>
import { computed, reactive, ref } from 'vue'
import { onLoad, onUnload } from '@dcloudio/uni-app'
import { t } from '@/shared/i18n/index.js'
import '@/subPackages/order/i18n/register.js'
import AppPageShell from '@/shared/ui/AppPageShell/AppPageShell.vue'
import AppHeader from '@/shared/ui/AppHeader/AppHeader.vue'
import AppContent from '@/shared/ui/AppContent/AppContent.vue'
import AppPageState from '@/shared/ui/AppPageState/AppPageState.vue'
import AppProductImage from '@/shared/ui/AppProductImage/AppProductImage.vue'
import AppIcon from '@/shared/ui/AppIcon/AppIcon.vue'
import FixedActionBar from '@/shared/ui/FixedActionBar/FixedActionBar.vue'
import { PageStatus } from '@/shared/model/pageState.js'
import { useUserStore } from '@/shared/session/userStore.js'
import { useInventoryReturnDraft } from '@/shared/model/inventoryReturnDraft.js'
import { getDealerInventoryReturnItems } from '@/shared/api/dealerInventoryReturnOptions.js'
import { getDealerFinanceContext } from '@/shared/api/dealerFinance.js'
import { applyInventoryAfterSale } from '@/shared/api/afterSale.js'
import { navigator } from '@/app/navigation/navigator.js'
import { routes } from '@/app/config/routes.js'

const userStore=useUserStore(),draft=useInventoryReturnDraft(String(userStore.dealerId||'')+':'+String(userStore.userId||''))
const rows=ref([]),accounts=ref([]),pageState=ref(PageStatus.LOADING),loadError=ref(''),submitting=ref(false),submitted=ref(false),visibleLimit=ref(30)
const form=reactive({refundAccountId:draft.state.refundAccountId,reason:draft.state.reason,expressNo:draft.state.expressNo||''})
const pending=computed(()=>Boolean(draft.state.pendingIntent)),locked=computed(()=>submitting.value||pending.value)
const selectedAccountIndex=computed(()=>Math.max(0,accounts.value.findIndex(item=>item.accountId===form.refundAccountId)))
const selectedAccount=computed(()=>accounts.value.find(item=>item.accountId===form.refundAccountId)||null)
const canSubmit=computed(()=>draft.owns()&&!submitting.value&&!submitted.value&&(pending.value||(rows.value.length>0&&rows.value.every(validItem)&&selectedAccount.value&&form.reason.trim())))
const selectionSummary=computed(()=>t('order.afterSale.inventoryApply.summary',{products:new Set(rows.value.map(item=>item.productId)).size,skus:rows.value.length}))
const productGroups=computed(()=>{
 const groups=[]
 for(const item of rows.value.slice(0,visibleLimit.value)){let group=groups.find(g=>g.productId===item.productId);if(!group){group={productId:item.productId,productName:item.productName,imageUrl:item.imageUrl,items:[]};groups.push(group)}group.items.push(item)}return groups
})
let singleSkuId=null,invalidRoute=false,loadingData=false,disposed=false,successTimer=null
onLoad(options=>{if(options?.skuId!=null){singleSkuId=Number(options.skuId);invalidRoute=!Number.isSafeInteger(singleSkuId)||singleSkuId<=0}loadData()})
onUnload(()=>{disposed=true;saveForm();if(successTimer)clearTimeout(successTimer)})

/** Keep merchant edits when returning to select more products; never persist a draft across accounts. */
function saveForm(){if(draft.owns()&&!submitted.value){draft.state.reason=form.reason;draft.state.expressNo=form.expressNo;draft.state.refundAccountId=form.refundAccountId}}
/** Read all selected SKU quantities in one request and retain exceeded values for explicit correction. */
async function loadData(){
 if(loadingData||disposed||!draft.owns())return
 if(invalidRoute){loadError.value=t('order.afterSale.inventoryApply.invalidSku');pageState.value=PageStatus.ERROR;return}
 let selected=draft.state.pendingIntent?.items || (singleSkuId?(rows.value.length?rows.value:[{skuId:singleSkuId,quantity:1}]):draft.state.items)
 if(!selected.length){rows.value=[];pageState.value=PageStatus.EMPTY;return}
 if(draft.state.pendingIntent){form.reason=draft.state.pendingIntent.reason;form.expressNo=draft.state.pendingIntent.expressNo||'';form.refundAccountId=draft.state.pendingIntent.refundAccountId}
 loadingData=true;pageState.value=PageStatus.LOADING;loadError.value=''
 try{
  const [latest,finance]=await Promise.all([getDealerInventoryReturnItems(selected.map(item=>item.skuId)),getDealerFinanceContext()])
  if(disposed||!draft.owns())return
  const currentBySku=new Map(latest.map(item=>[item.skuId,item]))
  rows.value=selected.map(item=>({...item,...(currentBySku.get(item.skuId)||{availableQuantity:0}),quantity:item.quantity}))
  accounts.value=finance.accounts.filter(item=>item.accountId>0&&item.accountStatus===1&&item.financeStatus===1).filter((item,index,all)=>all.findIndex(row=>row.accountId===item.accountId)===index).map(item=>({...item,label:[item.realName||item.username,item.fundAccountCode].filter(Boolean).join(' · ')||String(item.accountId)}))
  if(!pending.value&&!accounts.value.some(item=>item.accountId===form.refundAccountId))form.refundAccountId=accounts.value[0]?.accountId||0
  pageState.value=PageStatus.CONTENT
 }catch(error){if(!disposed){loadError.value=error?.message||t('order.afterSale.inventoryApply.loadFailed');pageState.value=PageStatus.ERROR}}
 finally{loadingData=false}
}
/** Check an exact positive integer against the latest server quantity. */
function validItem(item){return Number.isSafeInteger(item.quantity)&&item.quantity>0&&item.quantity<=item.availableQuantity}
/** Change only this row and keep cross-product selection intact. */
function setQuantity(item,value){if(locked.value)return;item.quantity=Math.min(Math.max(1,Math.floor(Number(value)||1)),Math.max(1,item.availableQuantity));if(!singleSkuId)draft.set(item,item.quantity)}
/** Remove a row explicitly; unavailable products are never silently submitted or dropped. */
function removeItem(skuId){if(locked.value)return;rows.value=rows.value.filter(item=>item.skuId!==skuId);if(!singleSkuId)draft.remove(skuId);if(!rows.value.length)pageState.value=PageStatus.EMPTY}
/** Preserve the form and return to the product picker without stacking another inventory page. */
function continueSelecting(){saveForm();if(singleSkuId)return navigator.redirectTo(routes.account.inventory());return typeof getCurrentPages === 'function' && getCurrentPages().length > 1 ? navigator.back() : navigator.redirectTo(routes.account.inventory())}
/** Direct an empty state to selection; all other state actions retry the read. */
function handleStateAction(){return pageState.value===PageStatus.EMPTY?continueSelecting():loadData()}
/** Submit one stable multi-SKU request; retries of an unknown result reuse the exact original intent. */
async function submit(){
 if(!canSubmit.value)return
 const original=draft.state.pendingIntent
 const payload=original?{refundAccountId:original.refundAccountId,reason:original.reason,expressNo:original.expressNo||'',items:original.items.map(item=>({skuId:item.skuId,quantity:item.quantity}))}:{refundAccountId:form.refundAccountId,reason:form.reason.trim(),expressNo:form.expressNo.trim(),items:rows.value.map(item=>({skuId:item.skuId,quantity:item.quantity}))}
 const clientRequestId=original?.clientRequestId || draft.requestId(payload)
 saveForm();submitting.value=true
 draft.state.pendingIntent={...payload,items:rows.value.map(item=>({...item})),clientRequestId}
 try{
  const result=await applyInventoryAfterSale({...payload,clientRequestId})
  if(disposed||!draft.owns())return
  submitted.value=true;draft.state.pendingIntent=null
  for(const item of payload.items)draft.remove(item.skuId)
  if(!draft.state.items.length)draft.clear()
  uni.showToast({title:t('order.afterSale.inventoryApply.submitted'),icon:'success'})
  successTimer=setTimeout(()=>navigator.redirectTo(result?.afterSaleId?routes.order.afterSaleDetail(result.afterSaleId):routes.order.afterSaleList()),450)
 }catch(error){
  if(disposed||!draft.owns())return
  // Business validation is final; transport failures retain the original key for safe confirmation.
  if(['business','auth','permission','frozen'].includes(error?.kind)||(error?.httpStatus>=400&&error.httpStatus<500)){draft.state.pendingIntent=null;if(error?.kind==='business')await loadData()}
  uni.showToast({title:error?.message||t('order.afterSale.inventoryApply.submitFailed'),icon:'none'})
 }finally{if(!disposed)submitting.value=false}
}
/** Format quantities without invented currency values. */
function formatQty(value){return Number(value||0).toLocaleString('zh-CN')}
</script>
<style lang="scss" scoped>
.apply-page{width:100%;max-width:920px;margin:0 auto;}.card{margin-bottom:14px;border-radius:16px;background:#fff;overflow:hidden;}
.selected-card{padding:18px 16px;}.section-heading{display:flex;justify-content:space-between;align-items:flex-start;gap:12px;margin-bottom:18px;}.section-title{display:block;color:#2A3440;font-size:15px;font-weight:650;}.sub-title{display:block;margin-top:6px;color:#939CA8;font-size:12px;line-height:1.6;}.link-text{color:#D7192D;font-size:12px;line-height:1.5;}
.return-product{padding-top:16px;border-top:1px solid #EEF1F5;}.return-product+.return-product{margin-top:20px;}.product-head{display:grid;grid-template-columns:52px minmax(0,1fr);align-items:center;gap:12px;margin-bottom:8px;}.product-image{width:52px;height:60px;border-radius:8px;}.product-name{color:#303B48;font-size:14px;font-weight:650;line-height:1.6;overflow-wrap:anywhere;}
.return-sku{margin-top:8px;padding:13px 12px;border-radius:10px;background:#F7F8FA;}.return-sku.invalid{background:#FFF2F3;}.sku-heading{display:flex;align-items:flex-start;justify-content:space-between;gap:10px;}.sku-name{display:block;color:#465362;font-size:13px;font-weight:600;line-height:1.5;}.available{display:block;margin-top:5px;color:#8F99A6;font-size:11px;}.remove-item{padding:4px 0 8px 8px;color:#9AA3AE;font-size:11px;flex-shrink:0;}
.quantity-row{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-top:12px;color:#8D98A6;font-size:11px;}.quantity-control{display:flex;width:132px;height:34px;border:1px solid #E0E5EC;border-radius:8px;overflow:hidden;}.step-button{display:flex;align-items:center;justify-content:center;flex:0 0 36px;width:36px;height:34px;margin:0;padding:0;border-radius:0;background:#EEF1F5;color:#445566;font-size:17px;line-height:1;}.step-button[disabled]{color:#BBC3CD;}.quantity-input{height:34px;min-width:0;flex:1;background:#fff;color:#354454;text-align:center;font-size:13px;}
.section-card{padding:18px 16px;}.picker-row{display:flex;justify-content:space-between;align-items:center;gap:10px;margin-top:12px;min-height:36px;color:#4B5868;font-size:13px;overflow-wrap:anywhere;}.reason-input{width:100%;height:110px;margin-top:13px;padding:12px;box-sizing:border-box;border-radius:10px;background:#F6F8FA;color:#3F4C5C;font-size:13px;line-height:1.6;}.counter{display:block;margin-top:6px;text-align:right;color:#A0A8B3;font-size:10px;}.refund-status{margin:4px 2px 18px;}.refund-status text{display:block;color:#949EAB;font-size:11px;line-height:1.7;}.refund-status text:first-child{margin-bottom:4px;color:#667586;font-size:13px;}.stock-error,.pending-result{display:block;margin-top:10px;color:#D7192D;font-size:12px;line-height:1.7;}.submit-button{flex:1;margin:0;padding:12px;min-height:46px;border-radius:12px;background:#D7192D;color:#fff;font-size:14px;line-height:1.5;}.submit-button[disabled]{color:#9FA8B4;background:#E8ECF1;}.show-more{margin:12px 0 0;background:transparent;color:#8B96A5;font-size:12px;}button::after{border:0;}
.express-input{width:100%;height:44px;margin-top:12px;padding:0 12px;box-sizing:border-box;border-radius:10px;background:#F6F8FA;color:#3F4C5C;font-size:14px;}
</style>
