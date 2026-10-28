<template><AppPageShell><template #header><AppHeader :title="t('common.homePage.announcement')" :show-back="true" /></template><template #content><AppContent><view class="article"><view v-if="loading" class="state">{{ t('common.homePage.loading') }}</view><view v-else-if="failed" class="state" @click="load">{{ t('common.homePage.retry') }}</view><view v-else-if="!detail" class="state">{{ t('common.homePage.notFound') }}</view><template v-else><text class="title">{{ detail.title }}</text><rich-text :nodes="detail.content" /></template></view></AppContent></template></AppPageShell></template>
<script setup>
import {ref,watch,onBeforeUnmount} from 'vue'
import {onLoad} from '@dcloudio/uni-app'
import {t,getLocale} from '@/shared/i18n/index.js'
import {getAnnouncement} from '../../api/announcements.js'
import {cacheRichTextImages} from '@/shared/utils/resourceCache.js'
import AppPageShell from '@/shared/ui/AppPageShell/AppPageShell.vue'
import AppHeader from '@/shared/ui/AppHeader/AppHeader.vue'
import AppContent from '@/shared/ui/AppContent/AppContent.vue'
const detail=ref(null),loading=ref(false),failed=ref(false)
let id='',epoch=0,disposed=false
/** 正文图片走统一缓存并隔离语言变化后的旧响应。 */
async function load(){if(!id)return;const token=++epoch;loading.value=true;failed.value=false;detail.value=null;try{const result=await getAnnouncement(id);if(result)result.content=await cacheRichTextImages(result.content,{fallbackUrl:'/static/images/image-placeholder.svg'});if(!disposed&&token===epoch)detail.value=result}catch{if(token===epoch)failed.value=true}finally{if(token===epoch)loading.value=false}}
onLoad(options=>{id=String(options?.announcementId||'');load()})
watch(getLocale,load)
onBeforeUnmount(()=>{disposed=true;epoch++})
</script>
<style scoped>.article{max-width:900px;margin:16px auto;padding:24px;background:var(--surface-card,#fff);border-radius:12px;box-sizing:border-box;line-height:1.8;overflow:hidden;word-break:break-word}.title{display:block;font-size:23px;font-weight:650;margin-bottom:24px}.state{text-align:center;font-size:13px;color:var(--color-text-tertiary,#929ba6);padding:28px}</style>
