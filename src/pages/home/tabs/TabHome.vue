<template>
  <view class="home-tab-container">
    <view v-if="loading && home.mode !== 'custom'" class="home-layout-loading"><view /><view /><view /></view>
    <DynamicHome v-else-if="home.mode === 'custom'" :home="home" :sections="sections" :active="active" @target="openTarget" @announcements="go(routes.content.announcements())" @more="openSection" @detail="go(routes.commerce.productDetail($event.productId))" @buy="go(routes.commerce.productPurchase($event.productId))" @retry="requestSection($event, true)" @visible="requestSection($event)" />
    <LegacyHome v-else :active="active" @select-tab="$emit('select-tab', $event)" />
  </view>
</template>
<script setup>
import { toRef } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import { useHomePage } from '@/shared/composables/useHomePage.js'
import { homeTargetRoute } from '@/shared/utils/homeNavigation.js'
import { routes } from '@/app/config/routes.js'
import { navigator } from '@/app/navigation/navigator.js'
import DynamicHome from '../components/DynamicHome.vue'
import LegacyHome from './LegacyHome.vue'
const props=defineProps({active:{type:Boolean,default:false}})
defineEmits(['select-tab'])
const {home,loading,sections,refresh,requestSection}=useHomePage(toRef(props,'active'))
onShow(()=>{if(props.active)refresh()})
/** 复用统一路由守卫，权限和签约由原有链路校验。 */
function go(url){if(url)navigator.navigateTo(url).catch(()=>{})}
/** 跳转到受控业务目标。 */
function openTarget(item){go(homeTargetRoute(item,home.value))}
/** 楼层范围由当前发布标识约束。 */
function openSection(component){go(routes.commerce.homeSection({homePageId:home.value.homePageId,componentId:component.homeComponentId,configStamp:home.value.configStamp}))}
</script>
<style scoped>
.home-tab-container{width:100%;min-width:0;flex:1;align-self:stretch}
.home-layout-loading{padding:18px 20px}.home-layout-loading>view{height:180px;background:var(--surface-subtle,#eceef2);border-radius:12px;margin-bottom:18px}.home-layout-loading>view:nth-child(2){height:90px}
</style>
