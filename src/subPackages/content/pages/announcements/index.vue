<template><AppPageShell><template #header><AppHeader :title="t('common.homePage.announcements')" :show-back="true" /></template><template #content><AppContent @scrolltolower="load"><view class="announcements"><view v-for="item in items" :key="item.announcementId" class="notice" @click="open(item)"><text>{{ item.title }}</text><text class="date">{{ dateText(item.publishTime) }}</text></view><view class="state" @click="load">{{ loading?t('common.homePage.loading'):failed?t('common.homePage.retry'):!items.length?t('common.homePage.noAnnouncements'):!more?t('common.homePage.end'):'' }}</view></view></AppContent></template></AppPageShell></template>
<script setup>
import {ref,watch,onMounted,onBeforeUnmount} from 'vue'
import {t,getLocale} from '@/shared/i18n/index.js'
import {getAnnouncements} from '../../api/announcements.js'
import {navigator} from '@/app/navigation/navigator.js'
import {routes} from '@/app/config/routes.js'
import AppPageShell from '@/shared/ui/AppPageShell/AppPageShell.vue'
import AppHeader from '@/shared/ui/AppHeader/AppHeader.vue'
import AppContent from '@/shared/ui/AppContent/AppContent.vue'
const items=ref([]),loading=ref(false),failed=ref(false),more=ref(true)
let page=1,epoch=0,disposed=false
/** 分页失败保留已成功页，再次加载重试当前页。 */
async function load(){if(loading.value||!more.value)return;const token=epoch;loading.value=true;failed.value=false;try{const result=await getAnnouncements(page);if(disposed||epoch!==token)return;items.value.push(...result.items);more.value=page*20<result.totalCount;page++}catch{if(epoch===token)failed.value=true}finally{if(epoch===token)loading.value=false}}
/** 时间按用户设备时区展示。 */
function dateText(value){const date=new Date(value);return Number.isNaN(date.getTime())?'':date.toLocaleDateString(getLocale())}
/** 公告详情由服务端再次校验发布状态。 */
function open(item){navigator.navigateTo(routes.content.announcementDetail(item.announcementId)).catch(()=>{})}
watch(getLocale,()=>{epoch++;items.value=[];page=1;more.value=true;loading.value=false;load()})
onMounted(load)
onBeforeUnmount(()=>{disposed=true;epoch++})
</script>
<style scoped>.announcements{max-width:900px;margin:auto;padding:18px}.notice{background:var(--surface-card,#fff);border-radius:12px;padding:20px;margin-bottom:12px;display:flex;flex-direction:column;gap:12px;font-size:15px;line-height:1.6}.date,.state{font-size:12px;color:var(--color-text-tertiary,#929ba6)}.state{text-align:center;padding:25px}</style>
