<template>
  <AppPageShell>
    <template #header><AppHeader :title="t('account.titles.invoice')" :show-back="true" /></template>
    <template #content>
      <AppContent class="invoice-content" width-mode="standard" padding="12px var(--page-padding-x, 12px) 24px"
        :refresher-enabled="true" :refresher-triggered="isRefreshing"
        @refresherrefresh="handleRefresh" @refresherrestore="handleRefresherRestore" @refresherabort="handleRefresherRestore"
        @scrolltolower="loadMore">
        <view class="invoice-page">
          <view class="summary-card">
            <view class="summary-heading">
              <text class="summary-label">{{ t('account.invoice.availableAmount') }}</text>
              <AppButton size="sm" @tap="openApply">{{ t('account.invoice.apply') }}</AppButton>
            </view>
            <AmountText class="summary-amount" :text="summary ? money(summary.availableAmount) : '—'" />
            <text v-if="summaryError" class="amount-error" @tap="loadSummary">{{ summaryError }} · {{ t('account.invoice.retry') }}</text>
            <view class="summary-footer">
              <view v-if="summary" class="summary-breakdown">
                <view class="summary-stat"><text>{{ t('account.invoice.pendingAmount') }}</text><text class="stat-value">{{ money(summary.pendingAmount) }}</text></view>
                <view class="summary-stat"><text>{{ t('account.invoice.issuedAmount') }}</text><text class="stat-value">{{ money(summary.issuedAmount) }}</text></view>
              </view>
              <view class="title-entry"><AppButton size="sm" variant="ghost" @tap="openTitle">{{ t('account.invoice.titleEntry') }}<AppIcon name="chevron-right" :size="14" color="#737A84" /></AppButton></view>
            </view>
          </view>
          <view class="record-panel" :class="{ 'empty-data-surface': !loading && !listError && !records.length }">
            <AppTabs class="tabs" :items="[{ value: 'application', label: t('account.invoice.titles') }, { value: 'archive', label: t('account.invoice.records') }]" :model-value="activeTab" @change="changeTab" />
            <view class="record-list">
              <AppPageState v-if="loading && !records.length" state="loading" compact />
              <AppPageState v-else-if="listError && !records.length" state="error" :description="listError" :action-text="t('common.retry')" compact @retry="refreshInvoices" />
              <AppPageState v-else-if="!records.length" class="invoice-empty" state="empty" :title="t(activeTab === 'archive' ? 'account.invoice.emptyRecords' : 'account.invoice.titlePreparing')" :description="t(activeTab === 'archive' ? 'account.invoice.archiveEmptyHint' : 'account.invoice.applicationEmptyHint')" compact>
                <template #illustration><AppSvgIllustration name="no-order" size="sm" /></template>
                <template #actions><AppButton size="sm" variant="secondary" @tap="openApply">{{ t('account.invoice.applyEmpty') }}</AppButton></template>
              </AppPageState>
              <view v-for="record in records" :key="record.invoiceId" class="record-item">
                <view class="record-heading"><view class="record-money"><text class="record-currency">¥</text><AmountText class="record-amount" :text="record.amount.toFixed(2)" /></view><StatusTag :type="statusType(record.status)" :text="statusText(record.status)" /></view>
                <view class="record-info"><text class="record-title">{{ record.title }}</text><text v-if="invoiceTypeText(record.invoiceType)" class="record-type">{{ invoiceTypeText(record.invoiceType) }}</text></view>
                <text v-if="record.invoiceNo" class="record-meta">{{ record.invoiceNo }}</text>
                <text v-if="record.auditRemark" class="record-remark">{{ record.auditRemark }}</text>
                <view class="record-footer">
                  <text class="record-date">{{ record.createdAt ? formatDateTime(record.createdAt, 'YYYY-MM-DD HH:mm') : '—' }}</text>
                  <AppButton v-if="record.status === 2 && record.fileUrl" size="sm" variant="ghost" @tap="previewPdf(record)">{{ t('account.invoice.viewPdf') }}</AppButton>
                </view>
              </view>
              <AppLoadMore v-if="records.length" :status="loadMoreStatus" @retry="loadMore" />
            </view>
          </view>
        </view>
      </AppContent>
    </template>
    <template #overlay>
      <ConfirmPopup v-model="showForm" :title="t('account.invoice.applyTitle')"
        :confirm-text="submitting ? t('common.loading') : t('account.invoice.submit')"
        :confirm-disabled="submitting" :dismiss-disabled="submitting" :close-on-overlay="false"
        @confirm="submitApplication">
        <view class="application-form">
          <text class="field-label">{{ t('account.invoice.companyTitle') }}</text>
          <view class="title-picker" @tap="chooseTitle">
            <view class="title-picker-copy"><text :class="{ placeholder: !form.title }">{{ form.title || t('account.invoice.selectTitle') }}</text><text v-if="form.taxNo" class="record-meta">{{ form.taxNo }}</text></view>
            <AppIcon name="chevron-right" :size="16" color="#969AA3" />
          </view>
          <text class="field-label">{{ t('account.invoice.amount') }}</text>
          <view class="invoice-amount-input"><text>¥</text><input :placeholder-style="$inputPlaceholderStyle" v-model="form.amount" :disabled="submitting" type="digit" maxlength="16" placeholder-class="amount-placeholder"  :placeholder="t('account.invoice.amountPlaceholder')" /></view>
          <text v-if="formError" class="amount-error">{{ formError }}</text>
        </view>
      </ConfirmPopup>

      <ConfirmPopup v-model="pdfVisible" :title="t('account.invoice.viewPdf')" :show-cancel="false" :show-confirm="false" class="invoice-pdf-popup">
        <AppPageState v-if="pdfLoading" state="loading" compact />
        <AppPageState v-else-if="pdfError" state="error" :description="pdfError" :action-text="t('common.retry')" compact @retry="loadPdf" />
        <PdfDocument v-else-if="pdfSource" :src="pdfSource" :language="pdfLanguage" :title="t('account.invoice.viewPdf')" />
      </ConfirmPopup>
    </template>
  </AppPageShell>
</template>

<script setup>
import StatusTag from '@/shared/ui/StatusTag/StatusTag.vue'
import { computed, ref, watch } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import { getLocale, t } from '@/shared/i18n/index.js'
import '@/subPackages/account/i18n/register.js'
import AppTabs from '@/shared/ui/AppTabs.vue'
import AppPageShell from '@/shared/ui/AppPageShell/AppPageShell.vue'
import AppHeader from '@/shared/ui/AppHeader/AppHeader.vue'
import AppContent from '@/shared/ui/AppContent/AppContent.vue'
import AppSvgIllustration from '@/shared/ui/AppSvgIllustration/AppSvgIllustration.vue'
import AppPageState from '@/shared/ui/AppPageState/AppPageState.vue'
import ConfirmPopup from '@/shared/ui/ConfirmPopup/ConfirmPopup.vue'
import PdfDocument from '@/shared/ui/PdfDocument/PdfDocument.vue'
import AppButton from '@/shared/ui/AppButton/AppButton.vue'
import AppIcon from '@/shared/ui/AppIcon/AppIcon.vue'
import AppLoadMore from '@/shared/ui/AppLoadMore/AppLoadMore.vue'
import { formatDateTime } from '@/shared/utils/format.js'
import { waitForRefreshAnimation } from '@/shared/utils/refreshAnimation.js'
import AmountText from '@/shared/ui/AmountText/AmountText.vue'
import { useUserStore } from '@/shared/session/userStore.js'
import { navigator } from '@/app/navigation/navigator.js'
import { routes } from '@/app/config/routes.js'
import { applyInvoice, getInvoiceTitle, getInvoiceSummary, getInvoiceList, getInvoiceDetail, createInvoiceRequestId } from '../../api/invoice.js'

const pdfKeys = ['title','back','preparing','failed','previewFailed','rangeRequired','rangeInvalid','rangeLength','lazyPage','pageFailed','relayout','missingUrl','checkingRange','pages','zoomOut','zoomIn','fitWidth']
const pdfLanguage = computed(() => ({ type: 'pdf-viewer-locale', locale: getLocale(), messages: Object.fromEntries(pdfKeys.map(key => [key, t('account.invoice.pdfViewer.' + key)])) }))
const pdfVisible = ref(false), pdfLoading = ref(false), pdfSource = ref(''), pdfError = ref(''), pdfInvoiceId = ref('')
let pdfSequence = 0
watch(pdfVisible, open => { if (!open) { pdfSequence++; pdfSource.value = ''; pdfError.value = '' } }, { flush: 'sync' })
const activeTab = ref('application')
const showForm = ref(false)
const isRefreshing = ref(false)
const formError = ref('')
const summary = ref(null)
const summaryError = ref('')
const summaryLoading = ref(false)
const user = useUserStore()
watch(() => user.userId, () => { pdfVisible.value = false })
let summarySequence = 0
let draftOwner = ''
const form = ref({ title: '', taxNo: '', amount: '' })
const submitting = ref(false)
const loading = ref(false)
const records = ref([])
const total = ref(0)
const listError = ref('')
const loadMoreStatus = computed(() => loading.value ? 'loading' : listError.value ? 'error' : records.value.length >= total.value ? 'no-more' : 'idle')
let pageNum = 0
let requestSequence = 0
let clientRequestId = createInvoiceRequestId()
let submittedFingerprint = ''
let returnDraft = null
let pendingTitle = null
let choosingTitle = false

onShow(() => {
  restoreTitle()
  if (returnDraft) {
    form.value = { ...returnDraft, ...(pendingTitle ? { title: pendingTitle.title, taxNo: pendingTitle.taxNo } : {}) }
    returnDraft = null
    pendingTitle = null
    showForm.value = true
  }
  refreshInvoices()
})

/** 同时刷新金额、申请记录和服务端常用抬头。 */
function refreshInvoices() { return Promise.all([loadSummary(), loadRecords(true), loadSavedTitle()]) }

/** 金额来自后端元值，直接格式化，不调用历史分单位转换。 */
function money(value) { return '¥' + Number(value).toFixed(2) }

/** 从本人订单和开票记录读取金额，失败保留可重试错误而不伪造0元。 */
async function loadSummary() {
  const sequence = ++summarySequence
  summaryLoading.value = true
  summaryError.value = ''
  try {
    const result = await getInvoiceSummary()
    if (sequence === summarySequence) summary.value = result
  } catch (error) {
    if (sequence === summarySequence) summaryError.value = error?.message || t('account.invoice.loadFailed')
  } finally {
    if (sequence === summarySequence) summaryLoading.value = false
  }
}

/** 切换登录账号时清空草稿，当前设备不作为常用资料的唯一存储。 */
function restoreTitle() {
  const owner = String(user.userId || '')
  if (draftOwner === owner) return
  draftOwner = owner
  returnDraft = null
  pendingTitle = null
  choosingTitle = false
  showForm.value = false
  pdfVisible.value = false
  form.value = { title: '', taxNo: '', amount: '' }
}

/** 页面显示时读取服务端抬头，用户正在编辑时保留当前草稿。 */
async function loadSavedTitle() {
  const owner = String(user.userId || '')
  try {
    const saved = await getInvoiceTitle()
    if (owner !== String(user.userId || '') || (showForm.value && form.value.title.trim())) return
    form.value.title = saved?.title || ''
    form.value.taxNo = saved?.taxNo || ''
  } catch (error) {
    // 抬头读取失败时保留选择入口，列表页提供重试。
  }
}

/** 用最近一次成功获取的额度拦截零额度及超额申请。 */
function invoiceAmountError(amount) {
  if (summaryLoading.value || !summary.value || summaryError.value) return t('account.invoice.amountUnavailable')
  const available = Math.round(Number(summary.value.availableAmount) * 100)
  if (!Number.isFinite(available)) return t('account.invoice.amountUnavailable')
  if (available <= 0) return t('account.invoice.noAvailableAmount')
  if (Math.round(amount * 100) > available) {
    return t('account.invoice.exceedsAvailableAmount', { amount: money(summary.value.availableAmount) })
  }
  return ''
}

/** 有可开票额度才打开申请表单。 */
function openApply() {
  const error = invoiceAmountError(0)
  if (error) {
    uni.showToast({ title: error, icon: 'none' })
    return
  }
  formError.value = ''
  showForm.value = true
}

/** 独立列表维护本人的多条抬头。 */
function openTitle() { return navigator.navigateTo(routes.account.invoiceTitles()) }

/** 暂存整个申请草稿，仅在原页面onShow后恢复弹框，避免原生返回时序丢失。 */
async function chooseTitle() {
  if (submitting.value || choosingTitle) return
  choosingTitle = true
  returnDraft = { ...form.value }
  pendingTitle = null
  showForm.value = false
  try {
    const opened = await navigator.navigateTo(routes.account.invoiceTitles({ selectMode: 1 }), { events: {
      invoiceTitleSelected: item => { pendingTitle = item },
    } })
    if (opened === false) {
      form.value = { ...returnDraft }
      returnDraft = null
      showForm.value = true
    }
  } catch (error) {
    returnDraft = null
    showForm.value = true
    uni.showToast({ title: error?.message || t('account.invoice.titleLoadFailed'), icon: 'none' })
  } finally { choosingTitle = false }
}

/** 只展示后端已提供的类型，不用参考稿常量冒充真实票种。 */
function invoiceTypeText(type) {
  return ({ electronic: t('account.invoice.electronicType'), paper: t('account.invoice.paperType') })[type] || ''
}

/** 下拉统一刷新，快速返回时也完成指示动画。 */
async function handleRefresh() {
  if (isRefreshing.value) return
  isRefreshing.value = true
  const startedAt = Date.now()
  try { await refreshInvoices() }
  finally { await waitForRefreshAnimation(startedAt); isRefreshing.value = false }
}

/** 原生恢复或中止事件回收刷新状态。 */
function handleRefresherRestore() { if (!loading.value) isRefreshing.value = false }

/** 触底加载下一页，不新增手动刷新或加载按钮。 */
function loadMore() { if (!loading.value && records.value.length < total.value) return loadRecords(false) }

/** 加载本人申请；刷新和切换页签使旧请求失效。 */
async function loadRecords(reset = true) {
  if (!reset && loading.value) return
  const sequence = ++requestSequence
  const nextPage = reset ? 1 : pageNum + 1
  loading.value = true
  listError.value = ''
  try {
    const result = await getInvoiceList({ pageNum: nextPage, status: activeTab.value === 'archive' ? 2 : undefined })
    if (sequence !== requestSequence) return
    records.value = reset ? result.items : [...records.value, ...result.items]
    total.value = result.totalCount
    pageNum = nextPage
  } catch (error) {
    if (sequence === requestSequence) listError.value = error?.message || t('account.invoice.loadFailed')
  } finally {
    if (sequence === requestSequence) loading.value = false
  }
}

/** 按已开具状态筛选档案，不在页面拼接不同查询结果。 */
function changeTab(tab) {
  activeTab.value = tab
  records.value = []
  loadRecords(true)
}

/** 校验抬头和两位小数，网络失败重试保留同一请求键。 */
async function submitApplication() {
  if (submitting.value) return
  formError.value = ''
  if (!form.value.title.trim() || !/^\d{1,12}(\.\d{1,2})?$/.test(form.value.amount) || Number(form.value.amount) <= 0) {
    formError.value = t('account.invoice.invalidInput')
    uni.showToast({ title: formError.value, icon: 'none' })
    return
  }
  formError.value = invoiceAmountError(Number(form.value.amount))
  if (formError.value) return
  const fingerprint = JSON.stringify(form.value)
  if (submittedFingerprint && submittedFingerprint !== fingerprint) clientRequestId = createInvoiceRequestId()
  submittedFingerprint = fingerprint
  submitting.value = true
  try {
    await applyInvoice({ ...form.value, clientRequestId })
    clientRequestId = createInvoiceRequestId()
    submittedFingerprint = ''
    form.value.amount = ''
    showForm.value = false
    uni.showToast({ title: t('account.invoice.submitted'), icon: 'success' })
    changeTab('application')
    await loadSummary()
  } catch (error) {
    formError.value = error?.message || t('account.invoice.submitFailed')
    uni.showToast({ title: formError.value, icon: 'none' })
  } finally { submitting.value = false }
}

/** 用双语资源显示既有状态编码。 */
function statusType(status) { return ({ 0: 'warning', 1: 'warning', 2: 'success', 3: 'error' })[status] || 'default' }

function statusText(status) {
  return t('account.invoice.status.' + ([0, 1, 2, 3, 4].includes(status) ? status : 'unknown'))
}
/** 只把发票标识交给既有PDF阅读器，阅读器重新获取本人文件。 */
function previewPdf(record) {
  pdfInvoiceId.value = record.invoiceId
  pdfVisible.value = true
  loadPdf()
}
async function loadPdf() {
  const sequence = ++pdfSequence
  const owner = String(user.userId || '')
  pdfLoading.value = true; pdfError.value = ''; pdfSource.value = ''
  try {
    const detail = await getInvoiceDetail(pdfInvoiceId.value)
    if (sequence !== pdfSequence || owner !== String(user.userId || '') || !pdfVisible.value) return
    if (detail?.status !== 2 || !/^https?:[/][/]/i.test(detail.fileUrl || '')) throw new Error(t('account.invoice.pdfViewer.missingUrl'))
    pdfSource.value = detail.fileUrl
  } catch (error) {
    if (sequence === pdfSequence && pdfVisible.value) pdfError.value = error?.message || t('account.invoice.pdfViewer.previewFailed')
  } finally { if (sequence === pdfSequence) pdfLoading.value = false }
}
</script>

<style lang="scss" scoped>
.invoice-pdf-popup :deep(.popup-sheet) { width: min(960px, calc(100vw - 24px)); max-width: 960px; height: min(820px, calc(100vh - 48px)); height: min(820px, calc(100dvh - 48px)); display: flex; flex-direction: column; box-sizing: border-box; }
.invoice-pdf-popup :deep(.popup-content) { flex: 1; min-height: 0; max-height: none; padding: 0; overflow: hidden; }
.invoice-pdf-popup :deep(.popup-header) { flex: none; padding-bottom: 16px; }
.invoice-pdf-popup :deep(.pdf-document) { height: 100%; }

.invoice-content :deep(.page-content-frame) { display:flex; flex:1; flex-direction:column; }
.invoice-content :deep(.content-body) { display:flex; flex-direction:column; }
.invoice-page { display:flex; flex:1; flex-direction:column; gap:16px; width:100%; min-width:0; }
.summary-card, .record-panel { border:0; border-radius:var(--radius-feature,18px); background:var(--glass-card-background,rgba(255,255,255,.74)); box-shadow:var(--glass-card-shadow,0 10px 28px rgba(55,65,80,.07)); -webkit-backdrop-filter:var(--glass-card-blur,blur(16px)); backdrop-filter:var(--glass-card-blur,blur(16px)); }
.summary-card { flex-shrink:0; padding:20px 20px 8px; }
.summary-heading { display:flex; align-items:center; justify-content:space-between; gap:16px; }
.summary-heading :deep(.app-button), .record-footer :deep(.app-button) { margin:0; flex-shrink:0; }
.summary-label { color:var(--text-secondary,#666); font-size:var(--type-body-small-size,13px); line-height:20px; }
.summary-amount { display:block; margin:8px 0 16px; color:var(--primary-color,#D7192D); font-size:var(--type-display-size,28px); font-weight:var(--font-weight-bold,700); font-variant-numeric:tabular-nums; line-height:36px; }
.summary-footer { display:flex; align-items:center; justify-content:space-between; flex-wrap:wrap; gap:4px 12px; padding-top:8px; border-top:1px dashed var(--border-light,#E8E9ED); }
.summary-breakdown { display:flex; flex-wrap:wrap; gap:6px 16px; color:var(--text-secondary,#737A84); font-size:var(--type-caption-size,12px); line-height:18px; }
.summary-stat { display:flex; flex-wrap:wrap; gap:4px; }
.stat-value { color:var(--text-primary,#1B1C20); font-variant-numeric:tabular-nums; }
.title-entry { margin-left:auto; }
.title-entry :deep(.app-button) { gap:2px; color:var(--text-secondary,#737A84); font-weight:var(--font-weight-regular,400); }
.record-panel { display:flex; flex:1; flex-direction:column; min-height:420px; overflow:hidden; }
.tabs { margin-bottom: 10px; }
.record-list { display:flex; flex:1; flex-direction:column; gap:12px; padding:16px; }
.invoice-empty { display:flex; flex:1; flex-direction:column; }
.invoice-empty :deep(.state-empty) { flex:1; min-height:300px; padding:40px 12px; justify-content:center; }
.invoice-empty :deep(.illustration) { width:80px; height:80px; margin-bottom:20px; }
.invoice-empty :deep(.app-svg-illustration) { width:80px; height:80px; }
.invoice-empty :deep(.state-title) { margin-bottom:8px; color:var(--text-primary,#1B1C20); font-size:var(--type-body-size,14px); font-weight:var(--font-weight-medium,500); line-height:22px; }
.invoice-empty :deep(.state-desc) { margin-bottom:20px; color:var(--text-secondary,#737A84); font-size:var(--type-body-small-size,13px); line-height:20px; }
.invoice-empty :deep(.state-actions) { margin-top:0; }
.invoice-empty :deep(.app-button) { color:var(--primary-color,#D7192D); border-color:var(--primary-color,#D7192D); background:transparent; }
.record-item { flex-shrink:0; padding:16px; border:0; border-radius:var(--radius-card,14px); background:var(--bg-secondary,#F7F8FA); overflow-wrap:anywhere; }
.record-heading { display:flex; align-items:flex-start; justify-content:space-between; gap:12px; }
.record-money { display:flex; flex:1; align-items:baseline; gap:2px; min-width:0; }
.record-currency { flex-shrink:0; font-size:var(--type-body-size,14px); }
.record-info { display:flex; align-items:flex-start; justify-content:space-between; flex-wrap:wrap; gap:6px 12px; margin-top:12px; }
.record-type { flex-shrink:0; color:var(--text-secondary,#737A84); font-size:var(--type-caption-size,12px); line-height:22px; }
.record-amount { flex:1; min-width:0; color:var(--text-primary,#1B1C20); font-size:var(--type-page-title-size,20px); font-weight:var(--font-weight-semibold,600); line-height:28px; font-variant-numeric:tabular-nums; }
.record-title { display:block; flex:1; min-width:0; margin-top:0; color:var(--text-primary,#1B1C20); font-size:var(--type-body-size,14px); line-height:22px; }
.record-meta, .record-date { color:var(--text-secondary,#737A84); font-size:var(--type-caption-size,12px); line-height:18px; }
.record-meta { display:block; margin-top:6px; }
.record-remark { display:block; margin-top:8px; color:var(--text-secondary,#666); font-size:var(--type-body-small-size,13px); line-height:20px; }
.record-footer { display:flex; align-items:center; justify-content:space-between; flex-wrap:wrap; gap:8px 12px; min-height:36px; margin-top:12px; padding-top:8px; border-top:1px dashed var(--border-light,#E4E6EB); }
.application-form { padding:0 2px 8px; }
.field-label { display:block; margin:12px 0 8px; font-size:var(--type-body-size,14px); }
.application-form input { min-height:44px; padding:0 12px; background:var(--bg-secondary,#F6F6F6); border-radius:var(--radius-control,10px); font-size:var(--type-body-size,14px); }
.invoice-amount-input { display:flex; align-items:center; gap:10px; padding-left:12px; background:var(--bg-secondary,#F6F6F6); border-radius:var(--radius-control,10px); font-size:var(--type-body-size,14px); }
.invoice-amount-input input { flex:1; min-width:0; }
.amount-error { display:block; margin-top:10px; color:var(--primary-color,#D7192D); font-size:var(--type-caption-size,12px); line-height:18px; }
.title-picker { display:flex; align-items:center; gap:12px; min-height:48px; padding:10px 12px; background:var(--bg-secondary,#F6F6F6); border-radius:var(--radius-control,10px); font-size:var(--type-body-size,14px); }
.title-picker-copy { flex:1; min-width:0; overflow-wrap:anywhere; }
.placeholder { color:var(--text-secondary,#737A84); }
@media screen and (min-width:720px) { .summary-card { padding:24px 24px 12px; } .record-list { padding:20px; } }

</style>
