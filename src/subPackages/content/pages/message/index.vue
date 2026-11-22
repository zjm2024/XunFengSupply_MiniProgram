<template>
  <AppPageShell class="message-center-shell">
    <template #header>
      <AppHeader :title="t('content.titles.messages')" :show-back="true" :action-text="t('content.messages.settingsAction')" @action="goToNotificationSettings">
        <template #before-action>
          <button class="mark-all-read-icon" hover-class="none" :disabled="markingAll || loading || failed || store.unreadCount <= 0" :aria-busy="markingAll" :aria-label="t(markingAll ? 'content.messages.markingAll' : 'content.messages.markAll')" @tap="handleMarkAllRead">
            <AppIcon name="broom" :size="20" />
          </button>
        </template>
      </AppHeader>
    </template>
    <template #content>
      <AppContent width-mode="standard" padding="16px var(--page-padding-x, 16px) 32px" :refresher-enabled="true" :refresher-triggered="refreshing" @refresherrefresh="handleRefresh" @refresherrestore="restoreRefresh" @refresherabort="restoreRefresh">
        <view class="message-center">
          <view class="message-hero">
            <view class="hero-copy"><text class="hero-title">{{ t('content.messages.heroTitle') }}</text><text class="hero-desc">{{ t('content.messages.heroDescription') }}</text><view class="hero-accent" /></view>
            <image class="hero-art" :src="heroArt" mode="aspectFit" aria-hidden="true" />
          </view>
          <view v-if="failed" class="summary-error" @tap="refreshSummary"><text>{{ t('content.messages.loadFailed') }} · {{ t('content.messages.retry') }}</text></view>
          <view class="category-list">
            <button v-for="category in categories" :key="category.type" class="category-row" hover-class="category-row--pressed" @tap="openCategory(category.type)">
              <image class="category-art" :src="messageIcon(category.type)" mode="aspectFit" aria-hidden="true" />
              <view class="category-copy"><text class="category-title">{{ t('content.messages.' + category.key) }}</text><text class="category-description">{{ t('content.messages.' + category.key + 'Description') }}</text></view>
              <text v-if="category.count > 0" class="category-badge" :class="{ 'category-badge--multiple': category.count > 9 }" :aria-label="t('content.messages.unreadCountLabel', { count: category.count })">{{ category.count > 99 ? '99+' : category.count }}</text>
              <AppIcon name="chevron-right" :size="18" color="#89909B" />
            </button>
          </view>
        </view>
      </AppContent>
    </template>
  </AppPageShell>
</template>
<script setup>
import { computed, ref } from 'vue'
import heroArt from '../../static/message/hero.svg'
import { onShow, onUnload } from '@dcloudio/uni-app'
import { t } from '@/shared/i18n/index.js'
import '@/subPackages/content/i18n/register.js'
import { getUnreadSummary, markAllAsRead } from '../../api/message.js'
import { useMessageStore } from '../../model/messageStore.js'
import { messageCategories, messageIcon } from '../../model/messageCategories.js'
import { useUserStore } from '@/shared/session/userStore.js'
import { navigator } from '@/app/navigation/navigator.js'
import { routes } from '@/app/config/routes.js'
import { waitForRefreshAnimation } from '@/shared/utils/refreshAnimation.js'
import AppPageShell from '@/shared/ui/AppPageShell/AppPageShell.vue'
import AppHeader from '@/shared/ui/AppHeader/AppHeader.vue'
import AppContent from '@/shared/ui/AppContent/AppContent.vue'
import AppIcon from '@/shared/ui/AppIcon/AppIcon.vue'
const store = useMessageStore()
const user = useUserStore()
const loading = ref(false), failed = ref(false), refreshing = ref(false), markingAll = ref(false)
let requestId = 0, disposed = false
/** 切号后旧请求不得覆盖当前摘要。 */
const sessionKey = () => String(user.userId) + ':' + String(user.dealerId)
const categories = computed(() => messageCategories.map(category => ({ ...category,
  count: category.countKeys.reduce((sum, key) => sum + Number(store.typeUnreadCount?.[key] || 0), 0),
})))
onShow(refreshSummary)
onUnload(() => { disposed = true; requestId++ })
/** 分类首页只读取未读摘要，不加载或覆盖全局最新消息。 */
async function refreshSummary() {
  const id = ++requestId, session = sessionKey()
  loading.value = true; failed.value = false
  try {
    const summary = await getUnreadSummary()
    if (!disposed && id === requestId && session === sessionKey()) store.applySummary(summary)
  } catch {
    if (!disposed && id === requestId && session === sessionKey()) failed.value = true
  } finally { if (id === requestId) loading.value = false }
}
/** 下拉刷新结束后统一收回原生刷新状态。 */
async function handleRefresh() {
  if (refreshing.value) return
  const start = Date.now(); refreshing.value = true
  try { await refreshSummary() } finally { await waitForRefreshAnimation(start); refreshing.value = false }
}
/** 原生刷新取消时收回交互状态。 */
function restoreRefresh() { if (!loading.value) refreshing.value = false }
/** 分类导航只携带白名单业务类型，不携带账号身份。 */
function openCategory(type) { navigator.navigateTo(routes.content.messageList(type)) }
/** 进入既有通知设置页。 */
function goToNotificationSettings() { navigator.navigateTo(routes.account.notificationSettings()) }
/** 只标记服务端摘要快照前的消息，成功后重读摘要。 */
async function handleMarkAllRead() {
  if (markingAll.value || loading.value || failed.value || store.unreadCount <= 0) return
  markingAll.value = true
  const session = sessionKey()
  try {
    await markAllAsRead(store.maxMessageId)
    if (disposed || session !== sessionKey()) return
    await refreshSummary()
    uni.showToast({ title: t('content.messages.markedAll'), icon: 'success' })
  } catch { if (!disposed) uni.showToast({ title: t('content.messages.operationFailed'), icon: 'none' }) }
  finally { markingAll.value = false }
}
</script>
<style lang="scss" scoped>
.message-center-shell { --surface-page:#f3f4f8; }
.message-center { width:100%; margin:0 auto; }
.message-hero { position:relative; display:flex; align-items:center; min-height:148px; overflow:hidden; margin-bottom:20px; padding:24px; border-radius:22px; background:linear-gradient(115deg,#fff 0%,#fff6f8 55%,#fce5eb 100%); box-sizing:border-box; }
.hero-copy { position:relative; z-index:1; width:70%; }
.hero-title { display:block; font-size:23px; line-height:1.4; font-weight:750; color:#20222a; }
.hero-desc { display:block; margin-top:10px; max-width:220px; color:#68636c; font-size:13px; line-height:1.7; }
.hero-accent { width:24px; height:3px; margin-top:14px; border-radius:3px; background:#d7192d; }
.hero-art { position:absolute; width:138px; height:144px; right:-7px; bottom:0; }
.category-list { display:flex; flex-direction:column; gap:12px; }
.category-row { display:flex; align-items:center; gap:13px; width:100%; min-height:92px; padding:16px; margin:0; border:0; border-radius:18px; background:#fff; text-align:left; line-height:1.5; box-shadow:0 5px 20px rgba(42,52,78,.035); transition:background .15s; }
.category-row::after,.mark-all-read-icon::after { border:0; }
.category-art { width:54px; height:54px; flex:none; }
.category-copy { flex:1; min-width:0; }
.category-title { display:block; font-size:17px; font-weight:650; color:#20232b; }
.category-description { display:block; margin-top:4px; color:#737984; font-size:13px; line-height:1.6; }
.category-badge { display:inline-flex; flex:0 0 auto; align-items:center; justify-content:center; width:20px; height:20px; padding:0; box-sizing:border-box; border-radius:50%; background:#d7192d; color:#fff; text-align:center; font-size:12px; line-height:1; font-variant-numeric:tabular-nums; white-space:nowrap; }
.category-badge--multiple { width:auto; min-width:24px; padding:0 6px; border-radius:10px; }
.category-row--pressed { background:#f7f8fa; }
.mark-all-read-icon { display:flex; flex:none; align-items:center; justify-content:center; width:44px; height:44px; padding:0; margin:0; border:0; background:transparent; color:var(--text-primary,#20232b); line-height:1; }
.mark-all-read-icon[disabled] { opacity:.4; }
.summary-error { padding:12px; margin-bottom:12px; border-radius:12px; background:#fff; color:#b7172b; font-size:13px; }
@media (min-width:768px) { .message-hero { min-height:194px; padding:32px; margin-bottom:24px; } .hero-title { font-size:30px; } .hero-desc { max-width:none; font-size:15px; } .hero-art { width:220px; height:190px; right:24px; } .category-row { min-height:104px; padding:20px 24px; gap:20px; } .category-art { width:62px; height:62px; } .category-title { font-size:18px; } .category-description { font-size:14px; } }
@media (prefers-reduced-motion:reduce) { .category-row { transition:none; } }
</style>
