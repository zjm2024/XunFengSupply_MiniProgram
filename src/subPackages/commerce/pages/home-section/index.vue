<template>
  <AppPageShell>
    <template #header><AppHeader :title="title || t('common.homePage.section')" :show-back="true" /></template>
    <template #content><AppContent :refresher-enabled="!unavailable" :refresher-triggered="refreshing" @refresherrefresh="reload(true)" @scrolltolower="loadMore">
      <view class="section-page">
        <template v-if="!unavailable"><view class="section-search"><input v-model="keyword" :placeholder="t('common.homePage.search')" maxlength="64" confirm-type="search" @confirm="reload()" /><button @click="reload()"><AppIcon name="search" :size="18" /></button></view><view class="section-sort"><text v-for="option in [0,1]" :key="option" :class="{selected:sort===option}" @click="changeSort(option)">{{ t(option===0?'common.homePage.configured':'common.homePage.latest') }}</text></view></template>
        <view v-if="unavailable" class="section-state">{{ t('common.homePage.unavailable') }}<button @click="returnHome">{{ t('common.homePage.home') }}</button></view>
        <template v-else><view class="section-grid"><HomeProductTile v-for="product in items" :key="product.productId" :product="product" :can-purchase="canPurchase" @detail="openProduct($event,false)" @buy="openProduct($event,true)" /></view><view v-if="loading" class="section-state">{{ t('common.homePage.loading') }}</view><view v-else-if="failed" class="section-state" @click="loadMore">{{ t('common.homePage.retry') }}</view><view v-else-if="!items.length" class="section-state">{{ t('common.homePage.empty') }}</view><view v-else-if="!hasMore" class="section-state">{{ t('common.homePage.end') }}</view></template>
      </view>
    </AppContent></template>
  </AppPageShell>
</template>
<script setup>
import { ref,watch,onBeforeUnmount } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import { getHomeSection } from '@/shared/api/homePage.js'
import { t,getLocale } from '@/shared/i18n/index.js'
import { useUserStore } from '@/shared/session/userStore.js'
import { navigator } from '@/app/navigation/navigator.js'
import { routes } from '@/app/config/routes.js'
import AppPageShell from '@/shared/ui/AppPageShell/AppPageShell.vue'
import AppHeader from '@/shared/ui/AppHeader/AppHeader.vue'
import AppContent from '@/shared/ui/AppContent/AppContent.vue'
import AppIcon from '@/shared/ui/AppIcon/AppIcon.vue'
import HomeProductTile from '@/shared/ui/HomeProductTile/HomeProductTile.vue'
const user=useUserStore(),items=ref([]),title=ref(''),keyword=ref(''),sort=ref(0),loading=ref(false),failed=ref(false),unavailable=ref(false),hasMore=ref(true),canPurchase=ref(false),refreshing=ref(false)
let scope=null,page=1,epoch=0,disposed=false,appliedKeyword=''
onLoad(options=>{scope={homePageId:String(options?.homePageId||''),componentId:String(options?.componentId||''),configStamp:options?.configStamp||''};if(!/^\d+$/.test(scope.homePageId)||!/^\d+$/.test(scope.componentId)||!scope.configStamp){unavailable.value=true;return}reload()})
/** 搜索/排序/语言变化从同一楼层第一页重新读取，不扩大商品范围。 */
function reload(pull=false){if(!scope||unavailable.value)return;epoch++;items.value=[];page=1;hasMore.value=true;loading.value=false;failed.value=false;appliedKeyword=keyword.value.trim();refreshing.value=pull;loadMore()}
/** 仅提交已成功页的下一页；旧请求不能混入新筛选结果。 */
async function loadMore(){if(loading.value||!hasMore.value||!scope||unavailable.value)return;const requestEpoch=epoch;loading.value=true;failed.value=false;try{const result=await getHomeSection({...scope,keyword:appliedKeyword,sort:sort.value,pageNum:page});if(disposed||epoch!==requestEpoch)return;title.value=result.title;canPurchase.value=result.canPurchase;const old=new Set(items.value.map(p=>p.productId));items.value.push(...result.items.filter(p=>!old.has(p.productId)));hasMore.value=result.hasMore;page++}catch(error){if(disposed||epoch!==requestEpoch)return;if(/HOME_(SCOPE_CHANGED|SECTION_UNAVAILABLE)/.test(error.errorCode||'')){unavailable.value=true;items.value=[];canPurchase.value=false}else failed.value=true}finally{if(epoch===requestEpoch){loading.value=false;refreshing.value=false}}}
/** 改变受支持排序后重置页码。 */
function changeSort(value){if(sort.value===value)return;sort.value=value;reload()}
/** 保持列表实例和滚动位置，详情页复用原规格与加购规则。 */
function openProduct(product,buy){navigator.navigateTo(buy?routes.commerce.productPurchase(product.productId):routes.commerce.productDetail(product.productId)).catch(()=>{})}
/** 配置失效后回到首页重新获取生效布局。 */
function returnHome(){navigator.reLaunch(routes.home())}
watch(()=>[user.userId,user.dealerId,user.permissions.join(','),getLocale()],()=>{title.value='';reload()})
onBeforeUnmount(()=>{disposed=true;epoch++})
</script>
<style scoped>
.section-page{max-width:1450px;margin:0 auto;padding:16px;box-sizing:border-box}.section-search{display:flex;align-items:center;gap:10px;background:var(--surface-card,#fff);border-radius:12px;padding:5px 12px}.section-search input{flex:1;min-width:0;font-size:13px;height:38px}.section-search button{margin:0;background:transparent;padding:5px;line-height:1}.section-search button:after{border:0}.section-sort{display:flex;gap:24px;margin:18px 0;font-size:13px;color:var(--color-text-secondary,#8a919c)}.section-sort .selected{color:var(--color-brand,#d7192d);font-weight:650}.section-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}.section-state{padding:35px 15px;text-align:center;color:var(--color-text-tertiary,#939ba7);font-size:13px;line-height:1.8}.section-state button{margin:18px auto;max-width:220px;font-size:13px;color:var(--color-brand,#d7192d)}@media(min-width:768px){.section-page{padding:24px}.section-grid{grid-template-columns:repeat(4,minmax(0,1fr));gap:16px}}@media(min-width:1200px){.section-grid{grid-template-columns:repeat(5,minmax(0,1fr))}}
</style>

