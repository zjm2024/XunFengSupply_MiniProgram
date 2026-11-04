<template>
  <view class="checkout-page share-checkout"><view v-if="!wechatBrowser" class="preview-notice" role="status">请在微信中打开后付款</view><view v-if="state.error" class="preview-notice" role="alert">{{ t('share.checkout.errors.' + state.error) }}</view><view class="checkout-grid"><view class="checkout-main">
    <view class="section-card fulfillment-card"><view class="section-heading"><view class="heading-icon"><AppIcon name="location" :size="20" /></view><view class="heading-copy"><text class="section-title">收货信息</text></view></view>
    <button class="address-entry" :class="{empty:!hasAddress}" :disabled="state.locked" @click="addressEditing=!addressEditing"><view v-if="hasAddress" class="contact-block"><view class="contact-line"><text class="contact-name">{{ form.contactName }}</text><text class="contact-phone">{{ form.contactPhone }}</text></view><text class="contact-address">{{ receiverSummary }}</text></view><view v-else class="contact-block"><text class="contact-name">添加收货信息</text></view><view class="address-action"><text>{{ addressEditing ? '收起' : hasAddress ? '修改' : '填写' }}</text><AppIcon name="chevron-right" :size="17" /></view></button>
    <view v-show="addressEditing" class="fields">
      <text class="label">{{ t('share.checkout.contactName') }}</text>
      <input v-model="form.contactName" :aria-label="t('share.checkout.contactName')" :placeholder="t('share.checkout.contactName')" :maxlength="50" :disabled="state.locked" @input="edited" />
      <text class="label">{{ t('share.checkout.contactPhone') }}</text>
      <input v-model="form.contactPhone" :aria-label="t('share.checkout.contactPhone')" :placeholder="t('share.checkout.contactPhone')" :maxlength="30" :disabled="state.locked" @input="edited" />
      <text class="label">配送地区</text>
      <AreaCascadePicker :model-value="region" :disabled="state.locked" @open="areaVisible=true" />
      <text class="label">{{ t('share.checkout.addressDetail') }}</text>
      <textarea v-model="form.addressDetail" :aria-label="t('share.checkout.addressDetail')" :placeholder="t('share.checkout.addressDetail')" :maxlength="300" :disabled="state.locked" @input="edited" />
    </view>

    <view v-if="addressEditing" class="draft-actions"><text>{{ draftSaved ? '已保存' : '' }}</text><button :disabled="state.locked" @click="clearAddress">清除</button></view>
    <view v-if="invalid" class="field-error" role="alert">{{ validationError }}</view></view>
    <view v-if="checkoutItems.length" class="section-card products-card"><view class="section-heading"><view class="heading-icon"><AppIcon name="order" :size="20" /></view><view class="heading-copy"><text class="section-title">商品清单</text><text class="section-subtitle">{{ checkoutGroups.length }} 款商品 · {{ checkoutItems.length }} 个规格 · {{ totalQuantity }} 件</text></view><view class="verified-label"><AppIcon name="shield-check" :size="14" /><text>商品明细</text></view></view>
      <view class="checkout-spu-list"><view v-for="group in checkoutGroups" :key="group.key" class="checkout-spu-group"><CheckoutSpuHeader :name="group.name" :meta="group.items.length + ' 个规格 · ' + group.quantity + ' 件'" :amount="'¥' + shareGroupAmount(group)" :collapsed="isCheckoutGroupCollapsed(group.key)" @toggle="toggleCheckoutGroup(group.key)" /><view v-show="!isCheckoutGroupCollapsed(group.key)" class="product-list"><view v-for="item in group.items" :key="item.skuId" class="product-row"><AppProductImage class="product-image" :src="item.imageUrl" :show-stock-badge="false" :fallback-icon-size="26" /><view class="product-info"><view class="product-name-line"><text class="product-name">{{ item.specDesc || item.productName }}</text></view><text class="product-spec">SKU：{{ item.skuCode || item.skuId }}</text><view class="product-meta"><AmountText :text="'¥' + item.unitPrice" /><text>× {{ item.quantity }}</text></view></view><view class="product-amount"><AmountText :text="'¥' + item.lineAmount" /></view></view></view></view></view>
    </view>

  </view><view class="checkout-side"><view class="section-card share-payment-choice"><view class="compact-heading"><text class="section-title">支付方式</text></view><view class="share-pay-choice"><AppIcon name="pay-wechat" :size="26" use-original-color /><text>微信支付</text><text class="share-choice-mark">✓</text></view></view><view class="section-card options-card"><view class="compact-heading"><text class="section-title">配送方式</text></view><view class="delivery-fixed"><view class="choice-icon active-icon"><AppIcon name="truck" :size="19" /></view><view class="choice-copy"><text class="choice-title">物流配送</text></view><text class="fixed-label">默认</text></view><view class="carrier-selector"><view class="carrier-selector-copy"><text class="choice-title">承运商</text></view>      <button class="share-carrier-choice" :disabled="state.locked || !state.carriers.length" @click="carrierVisible=true"><text>{{ nameOf(state.carriers,carrier) || '请选择' }}</text><AppIcon name="chevron-right" :size="16" /></button></view></view>
    <view class="section-card detail-card"><view class="remark-block"><view class="remark-heading"><view class="setting-label"><AppIcon name="edit" :size="18" /><text>订单备注</text></view><text class="remark-count">{{ remark.length }}/300</text></view><textarea v-model="remark" class="remark-input" :maxlength="300" placeholder="选填" :disabled="state.locked" @input="edited" /></view></view>
    <view class="section-card summary-card share-checkout-summary"><view class="compact-heading"><text class="section-title">金额明细</text></view><template v-if="state.preview"><view class="amount"><text>商品金额</text><AmountText :text="'¥' + state.preview.goodsAmount" /></view><view class="amount"><text>运费</text><AmountText :text="'¥' + state.preview.freightAmount" /></view><view class="amount total"><text>应付金额</text><AmountText :text="'¥' + state.preview.payableAmount" /></view></template>
    <text v-if="state.busy && !state.locked" class="note" role="status">正在更新金额…</text>
<AppButton variant="secondary" block :disabled="state.locked" @tap="$emit('back')">返回购物车</AppButton></view></view></view></view>
  <ShareOverlayPortal :visible="areaVisible"><AreaCascadePickerPanel v-model:visible="areaVisible" v-model="region" :load-children="loadRegionChildren" @confirm="regionConfirmed" /></ShareOverlayPortal>
  <ShareOverlayPortal :visible="carrierVisible"><ExpressCompanyPicker v-model:visible="carrierVisible" v-model="carrier" :options="state.carriers" :show-hint="false" @confirm="edited" /></ShareOverlayPortal>
</template><script setup>
import { computed, nextTick, onBeforeUnmount, reactive, ref } from 'vue'
import AreaCascadePicker from '@/subPackages/auth/components/AreaCascadePicker/AreaCascadePicker.vue'
import AreaCascadePickerPanel from '@/subPackages/auth/components/AreaCascadePicker/AreaCascadePickerPanel.vue'
import ExpressCompanyPicker from '@/subPackages/commerce/components/ExpressCompanyPicker/ExpressCompanyPicker.vue'
import ShareOverlayPortal from './ShareOverlayPortal.vue'
import CheckoutSpuHeader from '../../commerce/components/CheckoutSpuHeader.vue'
import { shareProductGroups, shareGroupAmount } from '../model/shareOrderPresentation.js'
import AppIcon from '@/shared/ui/AppIcon/AppIcon.vue'
import AppButton from '@/shared/ui/AppButton/AppButton.vue'
import AmountText from '@/shared/ui/AmountText/AmountText.vue'
import AppProductImage from '@/shared/ui/AppProductImage/AppProductImage.vue'
import { readReceiverDraft, saveReceiverDraft, clearReceiverDraft, receiverError } from '../model/shareReceiverDraft.js'
import { t } from '@/shared/i18n/index.js'
const props = defineProps({ state: { type: Object, required: true }, loadAreas: { type: Function, required: true }, items: { type:Array, default:()=>[] }, requestPreview:{type:Function,default:null} })
const wechatBrowser=computed(()=>typeof window==='undefined'||/MicroMessenger/i.test(window.navigator?.userAgent||''))
const addressEditing=ref(true)
const collapsedCheckoutGroupKeys=ref({})
const checkoutItems=computed(()=>props.state.preview?.items || props.items)
const checkoutGroups=computed(()=>shareProductGroups(checkoutItems.value))
const totalQuantity=computed(()=>checkoutItems.value.reduce((sum,item)=>sum+item.quantity,0))
/** 结算SPU与经销商完全相同：默认折叠，主动点击后才展开。 */
function isCheckoutGroupCollapsed(key) { return !Object.prototype.hasOwnProperty.call(collapsedCheckoutGroupKeys.value,key) || Boolean(collapsedCheckoutGroupKeys.value[key]) }
/** 独立SPU伸缩保留其他分组状态和表单，不触发核价或提交。 */
function toggleCheckoutGroup(key) { collapsedCheckoutGroupKeys.value={...collapsedCheckoutGroupKeys.value,[key]:!isCheckoutGroupCollapsed(key)} }
const emit = defineEmits(['preview', 'create', 'changed', 'back'])
const form = reactive({ contactName: '', contactPhone: '', provinceCode: '', cityCode: '', districtCode: '', addressDetail: '', postalCode: '' })
const validationError=ref(''),draftSaved=ref(false)
const carrier=ref(''), remark=ref(''), invalid=ref(false), areaVisible=ref(false), carrierVisible=ref(false), paying=ref(false)
const region=ref({provinceCode:'',province:'',cityCode:'',city:'',districtCode:'',district:''})
let alive=true, refreshTimer=null, saveTimer=null, pendingRefresh=null, revision=0
const hasAddress=computed(()=>!receiverError(form))
const receiverSummary=computed(()=>[region.value.province,region.value.city,region.value.district,form.addressDetail].filter(Boolean).join(' '))
/** 物流名称仅从当前分享专用接口返回的选项读取。 */
function nameOf(rows,code){return (rows||[]).find(row=>row.code===code)?.name||''}
/** 经销商地区组件注入分享专用读取器，禁止退回登录地址接口。 */
async function loadRegionChildren(parentCode,level){return level===1 ? props.state.provinces : props.loadAreas(parentCode,level)}
/** 确认完整地区后才替换收货地区并重新计算运费。 */
function regionConfirmed(value){region.value={...value};form.provinceCode=value.provinceCode;form.cityCode=value.cityCode;form.districtCode=value.districtCode;edited()}
/** 输入变更立即废弃旧金额，完整表单防抖更新，自动保存本机收件草稿。 */
function edited(){if(props.state.locked)return;invalid.value=false;validationError.value='';clearTimeout(saveTimer);saveTimer=setTimeout(persistAddress,200);revision++;emit('changed');clearTimeout(refreshTimer);if(hasAddress.value&&carrier.value)refreshTimer=setTimeout(()=>refreshAmount(),450)}
/** 复用后端正式预览，迟到响应不得触发提交。 */
async function refreshAmount(){clearTimeout(refreshTimer);if(!alive||props.state.locked||!hasAddress.value||!carrier.value)return false;const stamp=revision;const input={address:{...form},expressCompanyCode:carrier.value,remark:remark.value};if(!props.requestPreview){emit('preview',input);return false}const task=Promise.resolve(props.requestPreview(input));pendingRefresh=task;try{return await task && alive && stamp===revision}finally{if(pendingRefresh===task)pendingRefresh=null}}
/** 保存只收起有效地址；用户无需手动核价。 */
function saveAddress(){validationError.value=receiverError(form);invalid.value=!!validationError.value;if(invalid.value)return;persistAddress();addressEditing.value=false}
/** 一个付款入口完成必要预览和建单，失败不进入下一步，未知提交沿用原票据。 */
async function pay(){if(!wechatBrowser.value){validationError.value='请在微信中打开后付款';invalid.value=true;return false}if(paying.value)return false;if(props.state.locked){if(!props.state.busy)emit('create');return false}if(!hasAddress.value||!carrier.value){validationError.value=receiverError(form)||'请选择承运商';invalid.value=true;addressEditing.value=!hasAddress.value;if(hasAddress.value)carrierVisible.value=true;return false}paying.value=true;try{clearTimeout(refreshTimer);const stamp=revision;if(pendingRefresh)await pendingRefresh;if(!alive||stamp!==revision)return false;if(!props.state.preview&&!await refreshAmount())return false;await nextTick();if(!alive||stamp!==revision||!props.state.preview||props.state.busy)return false;emit('create');return true}finally{paying.value=false}}
/** 兼容旧调用方的表单入口，同样走自动更新流程。 */
function review(){return pay()}
defineExpose({pay,review})
/** 仅保存白名单收件字段，存储失败不影响下单但明确显示失败。 */
function persistAddress(){draftSaved.value=saveReceiverDraft(form,region.value);if(!draftSaved.value){invalid.value=true;validationError.value='地址保存失败，请重试'}}
/** 主动清除本机草稿及当前输入，废弃旧报价。 */
function clearAddress(){if(props.state.locked)return;clearTimeout(saveTimer);clearTimeout(refreshTimer);clearReceiverDraft();for(const key of Object.keys(form))form[key]='';region.value={provinceCode:'',province:'',cityCode:'',city:'',districtCode:'',district:''};draftSaved.value=false;invalid.value=false;validationError.value='';revision++;emit('changed')}
const savedReceiver=readReceiverDraft();if(savedReceiver){Object.assign(form,savedReceiver.address);region.value=savedReceiver.region;draftSaved.value=true;addressEditing.value=!hasAddress.value}
onBeforeUnmount(()=>{clearTimeout(saveTimer);persistAddress();alive=false;revision++;clearTimeout(refreshTimer);for(const key of Object.keys(form))form[key]='';remark.value='';carrier.value='';region.value={};areaVisible.value=false;carrierVisible.value=false})
</script>
<style scoped lang="scss">
@import '../../commerce/pages/checkout/presentation.scss';
.share-checkout{box-sizing:border-box}.fields{padding:0 16px 20px;display:grid;grid-template-columns:150px minmax(0,1fr);gap:14px;align-items:center}.label{font-size:14px;color:var(--text-secondary)}input,textarea,.choice{box-sizing:border-box;width:100%;min-height:44px;border:1px solid var(--border-color,#e5e7eb);border-radius:var(--radius-control,10px);padding:12px;color:var(--text-primary)}textarea{height:88px}.error{color:var(--color-error,#b42318);font-size:13px}.share-carrier-choice{display:flex;gap:8px;align-items:center;justify-content:flex-end;padding:8px;margin:0;border:0;background:transparent;font-size:14px;max-width:60%;min-width:80px}.share-carrier-choice:after{border:0}.share-carrier-choice text{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.carrier-selector{min-width:0}.choice{display:flex;align-items:center} .share-address-save{padding:0 16px 16px}.share-checkout-summary{display:flex;flex-direction:column;gap:12px}.amount{display:flex;justify-content:space-between;gap:12px;font-size:14px}.total{border-top:1px solid var(--border-color,#eee);padding-top:16px;font-weight:700;color:var(--primary-color,#d7192d)}.note{font-size:12px;line-height:1.7;color:var(--text-secondary)}.share-pay-choice{padding:0 16px 20px;display:flex;gap:14px;align-items:center}.share-pay-choice>view{display:flex;flex-direction:column;gap:4px}.share-choice-mark{margin-left:auto;color:var(--primary-color,#d7192d)}.checkout-side{min-width:0}@media(max-width:599px){.fields{grid-template-columns:minmax(0,1fr);gap:8px}.label:not(:first-child){margin-top:8px}.share-checkout-summary{position:static}}
.field-error{margin:0 16px 16px;padding:10px 12px;border-radius:8px;background:#fff2f2;color:#b42318;font-size:13px;line-height:20px;overflow-wrap:anywhere}.draft-actions{display:flex;align-items:center;justify-content:space-between;padding:0 16px 14px;font-size:12px;color:var(--text-secondary,#737a84)}.draft-actions button{border:0;margin:0;padding:4px 8px;font-size:12px;line-height:20px;background:transparent;color:inherit}.draft-actions button:after{border:0}.preview-notice{margin-bottom:12px;padding:12px 16px;border-radius:10px;line-height:20px;overflow-wrap:anywhere}.share-payment-choice{min-width:0}.share-pay-choice{padding:0 16px 16px;min-height:42px}</style>