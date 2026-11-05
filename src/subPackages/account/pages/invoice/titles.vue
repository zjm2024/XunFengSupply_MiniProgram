<template>
  <AppPageShell>
    <template #header><AppHeader :title="t(selectMode ? 'account.invoice.selectTitle' : 'account.invoice.titleManage')" :show-back="true" /></template>
    <template #content>
      <AppContent padding="16px var(--page-padding-x, 12px) 28px" :refresher-enabled="true" :refresher-triggered="isRefreshing"
        @refresherrefresh="handleRefresh" @refresherrestore="handleRefresherRestore" @refresherabort="handleRefresherRestore" @scrolltolower="loadMore">
        <AppPageState v-if="loading && !items.length" state="loading" compact />
        <AppPageState v-else-if="error && !items.length" state="error" :title="error" :action-text="t('common.retry')" compact @retry="loadTitles(true)" />
        <AppPageState v-else-if="!items.length" state="empty" :title="t('account.invoice.emptyTitles')" compact>
          <template #illustration><AppSvgIllustration name="no-revenue" size="sm" /></template>
        </AppPageState>
        <view v-else class="title-list">
          <view v-for="item in items" :key="item.invoiceTitleId" class="title-card">
            <view class="title-copy" :class="{ selectable: selectMode }" @tap="selectTitle(item)">
              <view class="title-heading"><text class="company-name">{{ item.title }}<text v-if="item.isDefault" class="default-tag">{{ t('account.invoice.defaultTitle') }}</text></text><AppIcon v-if="selectMode" name="chevron-right" :size="16" color="#969AA3" /></view>
              <text v-if="item.taxNo" class="tax-no">{{ t('account.invoice.taxNo') }}：{{ item.taxNo }}</text>
            </view>
            <view class="card-actions">
              <AppButton v-if="selectMode" size="sm" @tap="selectTitle(item)">{{ t('account.invoice.selectAction') }}</AppButton>
              <ActionRow v-else compact :actions="titleActions(item)" :more-text="t('account.invoice.moreActions')" @select="key => handleTitleAction(key, item)" />
            </view>
          </view>
          <AppLoadMore :status="loadMoreStatus" @retry="loadMore" />
        </view>
      </AppContent>
    </template>
    <template #footer><FixedActionBar><AppButton block @tap="editTitle()">{{ t('account.invoice.addTitle') }}</AppButton></FixedActionBar></template>
    <template #overlay>
      <ConfirmPopup v-model="showEditor" :title="t(draft.invoiceTitleId ? 'account.invoice.editTitle' : 'account.invoice.addTitle')"
        :confirm-text="t('common.save')" :confirm-disabled="saving" :dismiss-disabled="saving" :close-on-overlay="false" @confirm="saveTitle">
        <view class="title-form">
          <text class="field-label">{{ t('account.invoice.companyTitle') }}</text>
          <input v-model="draft.title" :disabled="saving" maxlength="200" :placeholder="t('account.invoice.titlePlaceholder')" />
          <text class="field-label">{{ t('account.invoice.taxNo') }}</text>
          <input v-model="draft.taxNo" :disabled="saving" maxlength="50" :placeholder="t('account.invoice.taxPlaceholder')" />
          <text v-if="formError" class="form-error">{{ formError }}</text>
        </view>
      </ConfirmPopup>
      <ConfirmPopup v-model="showDelete" :title="t('account.invoice.deleteTitle')" :description="t('account.invoice.deleteTitleConfirm', { title: deleting?.title || '' })" :danger="true"
        :confirm-text="t('account.invoice.delete')" :confirm-disabled="saving" :dismiss-disabled="saving" :close-on-overlay="false" @confirm="removeTitle" />
    </template>
  </AppPageShell>
</template>

<script setup>
import { computed, getCurrentInstance, ref } from 'vue'
import { onLoad, onShow } from '@dcloudio/uni-app'
import { t } from '@/shared/i18n/index.js'
import '@/subPackages/account/i18n/register.js'
import AppPageShell from '@/shared/ui/AppPageShell/AppPageShell.vue'
import AppHeader from '@/shared/ui/AppHeader/AppHeader.vue'
import AppContent from '@/shared/ui/AppContent/AppContent.vue'
import ActionRow from '@/shared/ui/ActionRow.vue'
import AppButton from '@/shared/ui/AppButton/AppButton.vue'
import AppIcon from '@/shared/ui/AppIcon/AppIcon.vue'
import AppPageState from '@/shared/ui/AppPageState/AppPageState.vue'
import AppSvgIllustration from '@/shared/ui/AppSvgIllustration/AppSvgIllustration.vue'
import AppLoadMore from '@/shared/ui/AppLoadMore/AppLoadMore.vue'
import ConfirmPopup from '@/shared/ui/ConfirmPopup/ConfirmPopup.vue'
import FixedActionBar from '@/shared/ui/FixedActionBar/FixedActionBar.vue'
import { waitForRefreshAnimation } from '@/shared/utils/refreshAnimation.js'
import { navigator } from '@/app/navigation/navigator.js'
import { getInvoiceTitles, saveInvoiceTitle, deleteInvoiceTitle } from '../../api/invoice.js'

const instance = getCurrentInstance()
const items = ref([])
const total = ref(0)
const loading = ref(false)
const error = ref('')
const isRefreshing = ref(false)
const selectMode = ref(false)
const showEditor = ref(false)
const showDelete = ref(false)
const saving = ref(false)
const formError = ref('')
const deleting = ref(null)
const draft = ref({ title: '', taxNo: '' })
const loadMoreStatus = computed(() => loading.value ? 'loading' : error.value ? 'error' : items.value.length >= total.value ? 'no-more' : 'idle')
let pageNum = 0
let sequence = 0
let returning = false

onLoad((options = {}) => { selectMode.value = String(options.selectMode || '') === '1' })
onShow(() => { loadTitles(true) })

/** 默认记录不重复提供设置动作，所有动作继续使用统一紧凑操作行。 */
function titleActions(item) {
  return [...(item.isDefault ? [] : [{ key: 'default', label: t('account.invoice.setDefault') }]), { key: 'edit', label: t('account.invoice.edit') }, { key: 'delete', label: t('account.invoice.delete') }]
}

/** 分发本人资料维护动作，选择操作与行内编辑互不冒泡。 */
function handleTitleAction(key, item) {
  if (key === 'edit') return editTitle(item)
  if (key === 'delete') return confirmDelete(item)
  if (key === 'default') return setDefault(item)
}

/** 默认设置与编辑共用既有保存契约，失败保留列表供重试。 */
async function setDefault(item) {
  if (saving.value) return
  saving.value = true
  try { await saveInvoiceTitle({ ...item, isDefault: true }); await loadTitles(true) }
  catch (failure) { uni.showToast({ title: failure?.message || t('account.invoice.titleSaveFailed'), icon: 'none' }) }
  finally { saving.value = false }
}

/** 服务端分页读取本人抬头，重置请求使旧分页失效。 */
async function loadTitles(reset = true) {
  if (!reset && loading.value) return
  const current = ++sequence
  const next = reset ? 1 : pageNum + 1
  loading.value = true
  error.value = ''
  try {
    const result = await getInvoiceTitles({ pageNum: next })
    if (current !== sequence) return
    items.value = reset ? result.items : [...items.value, ...result.items]
    total.value = result.totalCount
    pageNum = next
  } catch (failure) {
    if (current === sequence) error.value = failure?.message || t('account.invoice.titleLoadFailed')
  } finally { if (current === sequence) loading.value = false }
}

/** 触底只加载未读取的下一页。 */
function loadMore() { if (!loading.value && items.value.length < total.value) return loadTitles(false) }

/** 下拉刷新保持与项目其他列表一致的动画时长。 */
async function handleRefresh() {
  if (isRefreshing.value) return
  isRefreshing.value = true
  const startedAt = Date.now()
  try { await loadTitles(true) }
  finally { await waitForRefreshAnimation(startedAt); isRefreshing.value = false }
}

/** 恢复或中止下拉指示器。 */
function handleRefresherRestore() { if (!loading.value) isRefreshing.value = false }

/** 编辑独立草稿，取消时不修改列表中的原值。 */
function editTitle(item) {
  draft.value = item ? { ...item } : { title: '', taxNo: '' }
  formError.value = ''
  showEditor.value = true
}

/** 保存成功后重载，失败保留输入供重试。 */
async function saveTitle() {
  if (saving.value) return
  if (!draft.value.title.trim()) { formError.value = t('account.invoice.titlePlaceholder'); return }
  saving.value = true
  formError.value = ''
  try {
    await saveInvoiceTitle(draft.value)
    showEditor.value = false
    await loadTitles(true)
  } catch (failure) { formError.value = failure?.message || t('account.invoice.titleSaveFailed') }
  finally { saving.value = false }
}

/** 删除前要求用户二次确认具体抬头。 */
function confirmDelete(item) { deleting.value = item; showDelete.value = true }

/** 成功后移除并刷新，失败不误删本地记录。 */
async function removeTitle() {
  if (saving.value || !deleting.value) return
  saving.value = true
  try {
    await deleteInvoiceTitle(deleting.value.invoiceTitleId)
    showDelete.value = false
    await loadTitles(true)
  } catch (failure) { uni.showToast({ title: failure?.message || t('account.invoice.titleDeleteFailed'), icon: 'none' }) }
  finally { saving.value = false }
}

/** 选择模式回传当前资料，管理模式点击正文不触发导航。 */
async function selectTitle(item) {
  if (!selectMode.value || returning) return
  returning = true
  const pages = getCurrentPages()
  const page = pages[pages.length - 1]
  const channel = page?.getOpenerEventChannel?.() || page?.$vm?.getOpenerEventChannel?.() || instance?.proxy?.getOpenerEventChannel?.()
  if (!channel?.emit) {
    returning = false
    uni.showToast({ title: t('account.invoice.selectionFailed'), icon: 'none' })
    return
  }
  channel.emit('invoiceTitleSelected', { ...item })
  try { if (await navigator.back() === false) returning = false }
  catch (failure) { returning = false; uni.showToast({ title: t('account.invoice.selectionFailed'), icon: 'none' }) }
}
</script>

<style scoped>
.title-list { width:100%; }
.title-list :deep(.app-load-more) { grid-column:1 / -1; }
.title-card { margin-bottom:12px; border:0; border-radius:var(--radius-card,14px); background:var(--glass-card-background,rgba(255,255,255,.74)); box-shadow:var(--glass-card-shadow,0 10px 28px rgba(55,65,80,.07)); backdrop-filter:var(--glass-card-blur,blur(16px)); overflow-wrap:anywhere; }
.title-copy { padding:16px 16px 8px; }
.selectable { cursor:pointer; }
.title-heading { display:flex; align-items:center; justify-content:space-between; gap:12px; }
.company-name { font-size:var(--type-card-title-size,16px); line-height:24px; font-weight:var(--font-weight-semibold,600); }
.tax-no { display:block; margin-top:8px; color:var(--text-secondary,#666); font-size:var(--type-body-small-size,13px); line-height:20px; }
.default-tag { display:inline-block; margin-left:8px; padding:2px 6px; border-radius:6px; background:#FCEBEE; color:var(--primary-color,#D7192D); font-size:var(--type-caption-size,12px); line-height:18px; vertical-align:middle; }
.card-actions :deep(.app-button) { margin:0; }
.card-actions :deep(.action-row-control) { flex:1; }
.card-actions { display:flex; flex-wrap:wrap; justify-content:flex-end; gap:8px; padding:0 12px 8px; }
.title-form { padding-bottom:8px; }
.field-label { display:block; margin:12px 0 8px; font-size:var(--type-body-size,14px); }
.title-form input { min-height:44px; padding:0 12px; border-radius:var(--radius-control,10px); background:var(--bg-secondary,#f6f6f6); font-size:var(--type-body-size,14px); }
.form-error { display:block; margin-top:10px; color:var(--primary-color,#D7192D); font-size:var(--type-caption-size,12px); }
@media screen and (min-width:1000px) { .title-list { display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:12px; } .title-card { margin:0; } }
</style>
