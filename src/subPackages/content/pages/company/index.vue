<template>
  <AppPageShell :background-color="hasArticle ? '#0c090e' : '#f4f5f8'">
    <template #header><AppHeader
      :title="t('content.titles.company')"
      :show-back="true"
      :theme="hasArticle ? 'light' : 'dark'"
      :background="hasArticle ? 'linear-gradient(100deg, #44121c 0%, #210d15 58%, #0c090e 100%)' : '#f4f5f8'"
      :foreground-color="hasArticle ? '#ffffff' : '#1b1c20'"
      :button-background-color="hasArticle ? 'rgba(255,255,255,0.08)' : '#ffffff'"
      :show-shadow="true"
      :divider-color="hasArticle ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)'"
    /></template>
    <template #content>
      <AppContent :no-max-width="true" padding="0"><view class="company-content" :class="{ 'has-article': hasArticle }">
          <!-- 公司内容来自官网，失败与空内容分别反馈，不回退旧的写死介绍。 -->
          <AppPageState v-if="loading" state="loading" page-loading />
          <AppPageState v-else-if="loadFailed" state="error"
            :title="t('content.about.loadFailed')" :action-text="t('content.news.retry')" @retry="loadCompany" />
          <CompanyRichText v-else-if="articleContent" :content="articleContent" />
          <AppPageState v-else state="empty" :title="t('content.about.empty')"
            :action-text="t('content.news.retry')" @action="loadCompany" />


      </view></AppContent>
    </template>
  </AppPageShell>
</template>

<script setup>
import { computed, ref, watch } from 'vue'
import { onLoad, onUnload } from '@dcloudio/uni-app'
import { t, getLocale } from '@/shared/i18n/index.js'
import '@/subPackages/content/i18n/register.js'
import { getAboutCompany } from '../../api/aboutCompany.js'
import AppHeader from '@/shared/ui/AppHeader/AppHeader.vue'
import AppPageShell from '@/shared/ui/AppPageShell/AppPageShell.vue'
import AppContent from '@/shared/ui/AppContent/AppContent.vue'
import AppPageState from '@/shared/ui/AppPageState/AppPageState.vue'
import CompanyRichText from '../../components/CompanyRichText.vue'
import { getCompanyArticleContent } from '../../utils/companyRichText.js'

const company = ref(null)
const articleContent = computed(() => getCompanyArticleContent(company.value))
const loading = ref(false)
const loadFailed = ref(false)
const hasArticle = computed(() => !loading.value && !loadFailed.value && Boolean(articleContent.value.trim()))
let requestGeneration = 0
let disposed = false

/** 首次进入、语言切换及失败重试共用入口；旧语言或已离开的页面不提交响应。 */
async function loadCompany() {
  const generation = ++requestGeneration
  loading.value = true
  loadFailed.value = false
  company.value = null
  try {
    const result = await getAboutCompany(getLocale().toLowerCase())
    if (disposed || generation !== requestGeneration) return
    company.value = result
  } catch {
    if (!disposed && generation === requestGeneration) loadFailed.value = true
  } finally {
    if (!disposed && generation === requestGeneration) loading.value = false
  }
}

onLoad(loadCompany)
onUnload(() => { disposed = true; requestGeneration++ })
watch(() => getLocale(), () => { if (!disposed) loadCompany() })

</script>

<style lang="scss" scoped>
.company-content { min-width: 0; min-height: 100%; background: #f4f5f8; }
.company-content.has-article { background: #0c090e; }
</style>
