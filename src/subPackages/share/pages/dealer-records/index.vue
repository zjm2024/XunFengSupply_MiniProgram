<template>
  <AppPageShell class="share-issuer-page" :class="{ 'share-overlay-open': !!state.qr }">
    <template #header><AppHeader :title="t('share.dealer.recordsTitle')" :show-back="true" /><view class="record-tabs"><StatusTabBar v-model="activeTab" :items="tabs" max-width="100%" /></view></template>
    <template #content>
      <AppContent padding="10px var(--page-padding-x, 16px) 28px" :refresher-enabled="true" :refresher-triggered="isRefreshing" @refresherrefresh="handleRefresh" @refresherrestore="handleRefresherRestore" @refresherabort="handleRefresherRestore" @scrolltolower="handleLoadMore" @scroll="actionMenu = null">
        <view class="records-page">
          <AppPageState v-if="!user.hasPermission('RETAIL_SHARE_VIEW')" state="empty" :title="t('share.dealer.reasons.NO_PERMISSION')" :description="t('share.dealer.permissionHint')" compact />
          <AppPageState v-else-if="state.loading && !state.records.length" state="loading" compact />
          <AppPageState v-else-if="state.historyFailed && !state.records.length" state="error" :title="t('share.dealer.historyFailed')" :description="historyErrorMessage" :action-text="t('share.stock.retry')" compact @retry="controller.load()" />
          <AppPageState v-else-if="!state.records.length" state="empty" :title="t(activeTab === 'all' ? 'share.dealer.empty' : 'share.dealer.filteredEmpty')" compact><template #illustration><AppSvgIllustration name="no-revenue" size="sm" /></template></AppPageState>
          <template v-else><view class="record-grid"><ShareRecordCard v-for="row in state.records" :key="row.shareLinkId" :record="row" :busy="state.busy" @action="selectAction($event, row)" @overflow="actionMenu = { ...$event, row }" /></view><AppLoadMore :status="loadMoreStatus" @retry="handleLoadMore" /></template>
          <ShareAvailability v-if="state.actionFailed" :message="actionErrorMessage" />
        </view>
      </AppContent>
    </template>
    <template #overlay><ShareQrPanel :entry="state.qr" modal @close="state.qr = null" @invalid="invalidQr" /><ActionOverflowMenu :actions="menuActions" :anchor="actionMenu?.anchor" :title="t('share.dealer.recordActions')" @select="selectAction($event, actionMenu.row)" @close="actionMenu = null" /></template>
  </AppPageShell>
</template>
<script setup>
import { computed, ref, watch } from 'vue'
import AppPageShell from '@/shared/ui/AppPageShell/AppPageShell.vue'
import AppHeader from '@/shared/ui/AppHeader/AppHeader.vue'
import AppContent from '@/shared/ui/AppContent/AppContent.vue'
import AppPageState from '@/shared/ui/AppPageState/AppPageState.vue'
import AppSvgIllustration from '@/shared/ui/AppSvgIllustration/AppSvgIllustration.vue'
import AppLoadMore from '@/shared/ui/AppLoadMore/AppLoadMore.vue'
import StatusTabBar from '@/shared/ui/StatusTabBar.vue'
import ActionOverflowMenu from '@/shared/ui/ActionOverflowMenu.vue'
import { t } from '@/shared/i18n/index.js'
import { openAppDialog } from '@/shared/composables/useAppDialog.js'
import ShareQrPanel from '../../components/ShareQrPanel.vue'
import ShareRecordCard from '../../components/ShareRecordCard.vue'
import ShareAvailability from '../../components/ShareAvailability.vue'
import { useDealerSharePage } from '../../composables/useDealerSharePage.js'
import { registerShareLocales } from '../../i18n/register.js'
registerShareLocales()
const activeTab = ref('all'), actionMenu = ref(null)
const { user, controller, state, isRefreshing, historyErrorMessage, actionErrorMessage, handleRefresh, handleRefresherRestore, reloadRecords } = useDealerSharePage({ loadCapabilities: false, recordFilter: () => activeTab.value })
const tabs = computed(() => ['all', 'active', 'ordered', 'paid', 'closed'].map(value => ({ value, label: t('share.dealer.tabs.' + value) })))
const loadMoreStatus = computed(() => state.historyFailed ? 'error' : state.loading ? 'loading' : state.page * 20 < state.total ? 'idle' : 'no-more')
const menuActions = computed(() => (actionMenu.value?.keys || []).map(key => ({ key, label: t('share.dealer.' + (key === 'reveal' ? 'showQr' : 'revoke')), disabled: state.busy })))
/** 每个筛选由服务端独立分页，不在已加载的20条里假筛选。 */
watch(activeTab, () => { actionMenu.value = null; reloadRecords() })
/** 触底及失败重试保持原页码，不跳页。 */
function handleLoadMore() { if (['idle', 'error'].includes(loadMoreStatus.value)) controller.load(true) }
/** 标准操作行与溢出菜单调用同一权限和撤销确认。 */
async function selectAction(key, row) {
  if (!row || state.busy) return
  if (key === 'reveal') await controller.reveal(row)
  else if (key === 'revoke' && await openAppDialog({ title: t('share.dealer.revokeTitle'), description: t('share.dealer.revokeDescription'), confirmText: t('share.dealer.revoke'), cancelText: t('share.dealer.cancel') })) await controller.revoke(row)
}
/** 编码失败关闭当前预览，由统一错误反馈承接。 */
function invalidQr() { state.qr = null; state.actionFailed = true }
</script>
<style scoped lang="scss">
@import "../../styles/dealerSharingScroll.scss";
.records-page{--glass-card-shadow:none}.record-grid{align-items:start}
.record-tabs{max-width:1120px;margin:0 auto;padding:0 var(--page-padding-x,16px);padding-bottom:2px}.records-page{max-width:1120px;margin:0 auto;width:100%}.record-grid{display:grid;grid-template-columns:minmax(0,1fr);gap:14px}.records-page :deep(.state-empty),.records-page :deep(.state-error){min-height:280px}@media(min-width:840px){.record-grid{grid-template-columns:repeat(2,minmax(0,1fr))}}
</style>
