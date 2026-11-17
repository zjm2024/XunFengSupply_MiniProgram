<template>
  <AppPageShell style="--surface-page: #fff">
    <template #header><AppHeader :title="t('auth.progress.title')" :show-back="true" /></template>
    <template #content>
      <AppContent padding="0">
        <view class="progress-page">
          <view class="progress-main">
            <view class="query-form">
              <text class="field-label">{{ t('auth.progress.identifier') }}</text>
              <view class="field-control" :class="{ focused }">
                <AppIcon name="user" :size="20" color="#747B88" />
                <input v-model="identifier" class="field-input" type="text" maxlength="50" :placeholder="t('auth.progress.placeholder')" :placeholder-style="$inputPlaceholderStyle" confirm-type="search" @focus="focused = true" @blur="focused = false" @confirm="start" />
              </view>
              <view class="query-action"><AppButton block :loading="busy" :disabled="busy || visible || cooldown > 0" @tap="start">{{ t(querying ? 'auth.progress.querying' : 'auth.progress.query') }}</AppButton></view>
              <text class="query-note">{{ cooldown > 0 ? t('auth.progress.cooldown', { seconds: cooldown }) : t('auth.progress.verificationNote') }}</text>
              <view v-if="error" class="query-error" role="alert"><AppIcon name="alert-circle" :size="17" color="#B42318" /><text>{{ errorText }}</text></view>
              <view v-if="notFound" class="query-empty" role="status"><text class="empty-title">{{ t('auth.progress.notFound') }}</text><text>{{ t('auth.progress.checkIdentifier') }}</text></view>
            </view>
            <view class="steps-panel">
              <text class="steps-heading">{{ t('auth.progress.flowTitle') }}</text>
              <view v-for="(step, index) in steps" :key="step" class="flow-step">
                <view class="flow-rail"><view class="flow-dot" :class="{ first: index === 0 }" /><view v-if="index < steps.length - 1" class="flow-line" /></view>
                <view class="flow-copy"><text class="flow-title">{{ t('auth.progress.' + step) }}</text><text class="flow-note">{{ t('auth.progress.' + step + 'Note') }}</text></view>
              </view>
            </view>
          </view>
        </view>
      </AppContent>
      <view v-if="visible" class="query-captcha-mask" @click.self="close">
        <view class="query-captcha-dialog" @click.stop>
          <view class="query-captcha-heading"><view><text class="captcha-title">{{ t('auth.login.verification') }}</text><text class="captcha-note">{{ t('auth.progress.captchaNote') }}</text></view><view class="captcha-close" role="button" :aria-label="t('auth.login.closeVerification')" @click="close"><AppIcon name="close" :size="24" color="#626977" /></view></view>
          <LoginSliderCaptcha :challenge="challenge" :loading="loading" :verifying="verifying || querying" :verified="verified" :error-text="errorText" @refresh="refresh" @verify="verify" @image-error="imageError" />
        </view>
      </view>
    </template>
  </AppPageShell>
</template>

<script setup>
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import { onBackPress, onHide, onLoad } from '@dcloudio/uni-app'
import '../../i18n/register.js'
import { t } from '@/shared/i18n/index.js'
import { navigator } from '@/app/navigation/navigator.js'
import { routes } from '@/app/config/routes.js'
import storage from '@/shared/utils/storage.js'
import { setApplicationProgressDetail, clearApplicationProgressDetail } from '../../model/applicationProgressHandoff.js'
import AppPageShell from '@/shared/ui/AppPageShell/AppPageShell.vue'
import AppHeader from '@/shared/ui/AppHeader/AppHeader.vue'
import AppContent from '@/shared/ui/AppContent/AppContent.vue'
import AppButton from '@/shared/ui/AppButton/AppButton.vue'
import AppIcon from '@/shared/ui/AppIcon/AppIcon.vue'
import LoginSliderCaptcha from '../../components/LoginSliderCaptcha.vue'
import { useApplicationProgressQuery } from '../../composables/useApplicationProgressQuery.js'

const focused = ref(false), tick = ref(Date.now())
const steps = ['submit', 'review', 'result', 'account']
const flow = useApplicationProgressQuery({ onResult: showExistingDetail })
const { identifier, challenge, visible, loading, verifying, querying, verified, error, notFound, busy, nextRefreshAt, nextQueryAt, start, close, invalidate, refresh, verify, imageError } = flow
const cooldown = computed(() => Math.max(0, Math.ceil((Math.max(nextRefreshAt.value, nextQueryAt.value) - tick.value) / 1000)))
const errorText = computed(() => error.value?.key ? t(error.value.key) : error.value?.message || '')
const clock = setInterval(() => { tick.value = Date.now() }, 250)
watch(identifier, invalidate)
onLoad(options => { storage.remove('dealerApplication'); identifier.value = String(options?.identifier || '').slice(0, 50) })
onHide(close)
onBackPress(() => { if (!visible.value) return false; close(); return true })
onBeforeUnmount(() => { clearInterval(clock); close() })

/** 本次查询结果只在内存中交付给现有详情，不保存申请状态或验证凭证。 */
async function showExistingDetail(result, lookupIdentifier) {
  const status = Number(result.status) === 1 ? 'approved' : Number(result.status) === 2 ? 'rejected' : 'pending'
  setApplicationProgressDetail({ applicationId: result.applicationId, applicationNo: result.applicationNo, companyName: result.companyName, mobile: result.mobile, status, submittedAt: result.createdAt, updatedAt: result.updatedAt, lookupIdentifier, fromQuery: true })
  try {
    const entered = await navigator.navigateTo(routes.auth.applySign({ source: 'query' }))
    if (entered === false) throw new Error(t('auth.progress.openDetailFailed'))
  }
  catch (error) { clearApplicationProgressDetail(); throw error }
}
</script>

<style lang="scss" scoped>
.progress-page { min-height: 100%; background: #fff; padding: 28px 24px 32px; box-sizing: border-box; }
.progress-main { width: 100%; max-width: 400px; margin: 0 auto; }
.field-label { display: block; margin-bottom: 10px; font-size: 14px; line-height: 22px; font-weight: 600; color: $color-text-primary; }
.field-control { display: flex; align-items: center; gap: 10px; min-height: 48px; padding: 0 12px; background: #F8F9FB; border: 1px solid #E0E4EB; border-radius: $radius-control; box-sizing: border-box; transition: border-color .16s ease, background .16s ease; }
.field-control.focused { border-color: $color-brand-500; background: #fff; }
.field-input { flex: 1; min-width: 0; height: 46px; font-size: 14px; color: $color-text-primary; }
.query-action { margin-top: 24px; }
.query-note { display: block; margin-top: 10px; min-height: 20px; font-size: 12px; line-height: 20px; color: #747B88; }
.query-error { display: flex; align-items: flex-start; gap: 8px; margin-top: 14px; font-size: 13px; line-height: 21px; color: #B42318; }
.query-empty { display: flex; flex-direction: column; gap: 5px; margin-top: 18px; padding: 16px; border-radius: 10px; background: #F7F8FA; font-size: 13px; line-height: 21px; color: #747B88; }
.empty-title { font-weight: 600; color: $color-text-primary; }
.steps-panel { margin-top: 28px; padding: 20px 20px 2px; border-radius: 12px; background: #F7F8FA; }
.steps-heading { display: block; margin-bottom: 20px; color: #6A7280; font-size: 12px; line-height: 20px; }
.flow-step { display: flex; gap: 14px; }
.flow-rail { display: flex; flex-direction: column; align-items: center; width: 10px; flex-shrink: 0; padding-top: 5px; }
.flow-dot { width: 8px; height: 8px; border: 1px solid #ADB5C1; border-radius: 50%; background: #fff; box-sizing: border-box; }
.flow-dot.first { border-color: $color-brand-500; background: $color-brand-500; }
.flow-line { width: 1px; flex: 1; min-height: 34px; background: #DCE0E6; }
.flow-copy { display: flex; flex: 1; flex-direction: column; gap: 5px; padding-bottom: 24px; }
.flow-title { color: $color-text-primary; font-size: 14px; line-height: 22px; font-weight: 600; }
.flow-note { color: #747B88; font-size: 12px; line-height: 20px; }
.page-footnote { display: block; margin-top: 24px; color: #747B88; font-size: 12px; line-height: 20px; text-align: center; }
.query-captcha-mask { position: fixed; inset: 0; z-index: 1200; padding: 24px; display: flex; align-items: center; justify-content: center; background: rgba(16,24,40,.48); box-sizing: border-box; }
.query-captcha-dialog { width: 100%; max-width: 360px; max-height: calc(100% - 48px); overflow-y: auto; background: #fff; border-radius: 18px; padding: 20px; box-sizing: border-box; animation: query-enter .18s ease-out; }
.query-captcha-heading { display: flex; align-items: flex-start; justify-content: space-between; gap: 12px; margin-bottom: 18px; }
.query-captcha-heading > view:first-child { display: flex; flex-direction: column; gap: 5px; }
.captcha-title { font-size: 18px; line-height: 26px; font-weight: 600; color: $color-text-primary; }
.captcha-note { font-size: 12px; line-height: 20px; color: #747B88; }
.captcha-close { display: flex; align-items: center; justify-content: center; width: 44px; height: 44px; flex-shrink: 0; margin: -8px -8px 0 0; }
@keyframes query-enter { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
@media(min-width:768px) { .progress-page { padding-top: 42px; } }
@media(prefers-reduced-motion:reduce) { .query-captcha-dialog { animation: none; } .field-control { transition: none; } }
</style>
