<template>
  <AppPageShell>
    <template #header><AppHeader :title="t(selectMode ? 'account.withdrawal.selectCard' : 'account.withdrawal.cards')" :show-back="true" /></template>
    <template #content>
      <AppContent width-mode="standard" padding="12px var(--page-padding-x, 16px) 24px"
        :refresher-enabled="true" :refresher-triggered="refreshing" @refresherrefresh="refresh"
        @refresherrestore="restore" @refresherabort="restore" @scrolltolower="loadMore">
        <AppPageState v-if="loading && !items.length" state="loading" compact />
        <AppPageState v-else-if="error && !items.length" state="error" :title="error"
          :action-text="t('common.retry')" compact @retry="load()" />
        <AppPageState v-else-if="!items.length" state="empty" :title="t('account.withdrawal.emptyCards')" compact>
          <template #illustration><AppSvgIllustration name="no-revenue" size="sm" /></template>
        </AppPageState>
        <view v-for="item in items" :key="item.bankCardId" class="withdrawal-card">
          <view class="card-row">
            <view class="bank-mark"><AppIcon name="bank" :size="20" /></view>
            <view class="card-copy">
              <text class="finance-title">{{ item.bankName }}</text>
              <text class="finance-meta">{{ item.accountHolder }} · <text class="card-tail">•••• {{ item.accountLast4 }}</text></text>
            </view>
            <AppButton v-if="selectMode" size="sm" @tap="selectCard(item)">{{ t('account.withdrawal.choose') }}</AppButton>
            <ActionRow v-else compact :actions="actions" :more-text="t('account.invoice.moreActions')"
              @select="key => handleAction(key, item)" />
          </view>
        </view>
        <AppLoadMore v-if="items.length" :status="moreStatus" @retry="loadMore" />
      </AppContent>
    </template>
    <template #footer>
      <FixedActionBar><AppButton block @tap="editCard()">{{ t('account.withdrawal.addCard') }}</AppButton></FixedActionBar>
    </template>
    <template #overlay>
      <ConfirmPopup v-model="editing" :title="t(draft.bankCardId ? 'account.withdrawal.editCard' : 'account.withdrawal.addCard')"
        :confirm-text="t('common.save')" :confirm-disabled="saving" :dismiss-disabled="saving" :close-on-overlay="false" @confirm="save">
        <view class="withdrawal-form">
          <text>{{ t('account.withdrawal.bankName') }}</text>
          <input :placeholder-style="$inputPlaceholderStyle" v-model="draft.bankName" :disabled="saving" maxlength="100" :placeholder="t('account.withdrawal.bankName')" />
          <text>{{ t('account.withdrawal.accountHolder') }}</text>
          <input :placeholder-style="$inputPlaceholderStyle" v-model="draft.accountHolder" :disabled="saving" maxlength="100" :placeholder="t('account.withdrawal.accountHolder')" />
          <text>{{ t('account.withdrawal.bankAccount') }}</text>
          <input :placeholder-style="$inputPlaceholderStyle" v-model="draft.bankAccount" :disabled="saving" type="number" maxlength="32"
            :placeholder="t(draft.bankCardId ? 'account.withdrawal.keepCardNumber' : 'account.withdrawal.bankAccount')" />
          <text v-if="formError" class="form-error">{{ formError }}</text>
        </view>
      </ConfirmPopup>
      <ConfirmPopup v-model="deleting" :title="t('account.withdrawal.deleteCard')"
        :description="t('account.withdrawal.deleteConfirm')" :confirm-text="t('account.invoice.delete')"
        :confirm-disabled="saving" :dismiss-disabled="saving" :danger="true" @confirm="remove" />
    </template>
  </AppPageShell>
</template>

<script setup>
import { computed, getCurrentInstance, ref, watch } from 'vue'
import { onLoad, onShow } from '@dcloudio/uni-app'
import { t } from '@/shared/i18n/index.js'
import '@/subPackages/account/i18n/register.js'
import AppPageShell from '@/shared/ui/AppPageShell/AppPageShell.vue'
import AppHeader from '@/shared/ui/AppHeader/AppHeader.vue'
import AppContent from '@/shared/ui/AppContent/AppContent.vue'
import AppIcon from '@/shared/ui/AppIcon/AppIcon.vue'
import AppButton from '@/shared/ui/AppButton/AppButton.vue'
import AppPageState from '@/shared/ui/AppPageState/AppPageState.vue'
import AppSvgIllustration from '@/shared/ui/AppSvgIllustration/AppSvgIllustration.vue'
import AppLoadMore from '@/shared/ui/AppLoadMore/AppLoadMore.vue'
import ActionRow from '@/shared/ui/ActionRow.vue'
import ConfirmPopup from '@/shared/ui/ConfirmPopup/ConfirmPopup.vue'
import FixedActionBar from '@/shared/ui/FixedActionBar/FixedActionBar.vue'
import { navigator } from '@/app/navigation/navigator.js'
import { deleteBankCard, getBankCards, saveBankCard } from '@/shared/api/withdrawal.js'
import { useWithdrawalList } from '../../composables/useWithdrawalList.js'

const instance = getCurrentInstance()
const { items, loading, error, refreshing, moreStatus, load, loadMore, refresh, restore } = useWithdrawalList(getBankCards)
const selectMode = ref(false)
const editing = ref(false)
const deleting = ref(false)
const saving = ref(false)
const formError = ref('')
const draft = ref({})
const target = ref(null)
const actions = computed(() => [
  { key: 'edit', label: t('account.invoice.edit') },
  { key: 'delete', label: t('account.invoice.delete') },
])
let returning = false

onLoad(options => { selectMode.value = String(options?.selectMode) === '1' })
onShow(() => load())
watch(editing, shown => { if (!shown) draft.value = {} })

/** 编辑时沿用尾号，完整卡号只在输入后提交。 */
function editCard(card = {}) {
  draft.value = { ...card, bankAccount: '' }
  formError.value = ''
  editing.value = true
}

/** 分发本人卡片的编辑和删除操作。 */
function handleAction(key, card) {
  if (key === 'edit') editCard(card)
  if (key === 'delete') {
    target.value = card
    deleting.value = true
  }
}

/** 校验收款资料，保存后刷新同一列表。 */
async function save() {
  if (saving.value) return
  const { bankCardId, bankName = '', accountHolder = '', bankAccount = '' } = draft.value
  if (!bankName.trim() || !accountHolder.trim() || ((!bankCardId || bankAccount) && !/^\d{12,32}$/.test(bankAccount))) {
    formError.value = t('account.withdrawal.invalidCard')
    return
  }
  formError.value = ''
  saving.value = true
  try {
    await saveBankCard(draft.value)
    editing.value = false
    await load()
  } catch (failure) {
    formError.value = failure?.message || t('account.withdrawal.saveFailed')
  } finally { saving.value = false }
}

/** 确认后软删除卡片，历史提现继续显示提交时的资料。 */
async function remove() {
  if (saving.value || !target.value) return
  saving.value = true
  try {
    await deleteBankCard(target.value.bankCardId)
    deleting.value = false
    await load()
  } catch (failure) {
    uni.showToast({ title: failure?.message || t('account.withdrawal.saveFailed'), icon: 'none' })
  } finally { saving.value = false }
}

/** 仅回传选中的脱敏银行卡，和发票抬头使用同一导航模式。 */
async function selectCard(card) {
  if (!selectMode.value || returning) return
  const page = getCurrentPages().at(-1)
  const channel = page?.getOpenerEventChannel?.() || page?.$vm?.getOpenerEventChannel?.() || instance?.proxy?.getOpenerEventChannel?.()
  if (!channel?.emit) return uni.showToast({ title: t('account.withdrawal.chooseFailed'), icon: 'none' })
  returning = true
  channel.emit('withdrawalCardSelected', { ...card })
  try { await navigator.back() }
  finally { returning = false }
}
</script>

<style lang="scss" scoped>
@import '../finance-ui.scss';
@import './withdrawal.scss';
</style>
