﻿<!--
  经销商登录页（分包：authSub）
  安全策略：首次不展示验证码；凭证输错一次后，由服务端强制启用滑块拼图验证。
-->
<template>
  <AppPageShell>
    <template #header>
      <AppStatusBarSpacer />
    </template>
    <template #content>
      <AppContent padding="0">
        <view class="login-page">
          <view class="login-main">
            <view class="brand-block">
              <image class="brand-logo" src="/static/images/logo.png" mode="aspectFit" />
              <text class="brand-title">薰风体育</text>
            
            </view>

            <view class="login-card">
              <view class="card-heading">
                <text class="card-title">经销商下单系统</text>
                <text class="card-caption">请使用已审核通过的经销商账号登录</text>
              </view>

              <view class="form-field">
                <text class="field-label">登录账号</text>
                <view class="field-control" :class="{ focused: focusedField === 'account' }">
                  <AppIcon name="user" :size="20" color="#5E626B" />
                  <input
                    v-model="account"
                    class="field-input"
                    type="text"
                    placeholder="请输入登录账号"
                    maxlength="50"
                    confirm-type="next"
                    :placeholder-style="placeholderStyle"
                    @focus="focusedField = 'account'"
                    @blur="handleAccountBlur"
                  />
                </view>
              </view>

              <view class="form-field">
                <text class="field-label">登录密码</text>
                <view class="field-control" :class="{ focused: focusedField === 'password' }">
                  <AppIcon name="lock" :size="20" color="#5E626B" />
                  <input
                    v-model="password"
                    class="field-input"
                    :type="showPassword ? 'text' : 'password'"
                    placeholder="请输入登录密码"
                    maxlength="64"
                    confirm-type="done"
                    :placeholder-style="placeholderStyle"
                    @focus="focusedField = 'password'"
                    @blur="focusedField = ''"
                    @confirm="handleLogin"
                  />
                   <view
                     class="icon-action password-toggle"
                     :aria-label="showPassword ? '隐藏密码' : '显示密码'"
                     @click.stop="togglePassword"
                   >
                     <AppIcon
                       :name="showPassword ? 'eye-off' : 'eye'"
                       :size="22"
                       color="#26282D"
                     />
                   </view>
                 </view>
               </view>

               <view
                 v-if="captchaRequired"
                 class="captcha-entry"
                 :class="{ verified: captchaVerified }"
               >
                 <AppIcon
                   :name="captchaVerified ? 'shield-check' : 'shield'"
                   :size="20"
                   :color="captchaVerified ? '#027A48' : '#B54708'"
                 />
                 <text class="captcha-entry__title">安全验证</text>
                 <text class="captcha-entry__status">
                   {{ captchaVerified ? '已完成' : '待完成' }}
                 </text>
               </view>

              <view v-if="formError" class="form-error" role="alert">
                <AppIcon name="alert-circle" :size="18" color="#B42318" />
                <text>{{ formError }}</text>
              </view>

              <view class="agreement-row" @click="agreeProtocol = !agreeProtocol">
                <view class="checkbox" :class="{ checked: agreeProtocol }">
                  <AppIcon v-if="agreeProtocol" name="check" :size="14" color="#FFFFFF" :stroke-width="2.5" />
                </view>
                <text class="agreement-text">
                  我已阅读并同意
                  <text class="agreement-link" @click.stop="openAgreement('user')">《用户协议》</text>
                  和
                  <text class="agreement-link" @click.stop="openAgreement('privacy')">《隐私政策》</text>
                </text>
              </view>

              <button
                class="login-button"
                :disabled="!canLogin || logging"
                @click="handleLogin"
              >
                 {{ loginButtonText }}
              </button>
            </view>
          </view>

          <text class="security-note">账号信息加密传输 · 请勿向他人透露密码</text>
         </view>
       </AppContent>

       <view
         v-if="showCaptchaModal"
         class="captcha-modal-mask"
         @click.self="closeCaptchaModal"
       >
         <view class="captcha-modal" @click.stop>
           <view class="captcha-modal__header">
             <view class="captcha-modal__heading">
               <text class="captcha-modal__title">安全验证</text>
             </view>
             <view
               class="captcha-modal__close"
               hover-class="captcha-modal__close--pressed"
               aria-label="关闭安全验证"
               @click="closeCaptchaModal"
             >
               <AppIcon name="close" :size="24" color="#5E626B" />
             </view>
           </view>

           <LoginSliderCaptcha
             :challenge="captchaChallenge"
             :loading="captchaLoading"
             :verifying="captchaVerifying"
             :verified="captchaVerified"
             :error-text="captchaError"
             @refresh="refreshCaptcha"
             @verify="verifyCaptcha"
           />

         </view>
       </view>
     </template>
  </AppPageShell>
</template>

<script setup>
import { computed, ref, watch } from 'vue'
import { onBackPress, onLoad } from '@dcloudio/uni-app'
import { getLoginCaptcha, login, verifyLoginCaptcha } from '../../api/auth.js'
import { useUserStore } from '@/shared/session/userStore.js'
import { navigator } from '@/app/navigation/navigator.js'
import { routes, sanitizeRedirect } from '@/app/config/routes.js'
import AppPageShell from '@/shared/ui/AppPageShell/AppPageShell.vue'
import AppContent from '@/shared/ui/AppContent/AppContent.vue'
import AppIcon from '../../../../shared/ui/AppIcon/AppIcon.vue'
import AppStatusBarSpacer from '../../../../shared/ui/AppStatusBarSpacer/AppStatusBarSpacer.vue'
import LoginSliderCaptcha from '../../components/LoginSliderCaptcha.vue'

const CAPTCHA_ERRORS = new Set([
  'DEALER_LOGIN_CAPTCHA_REQUIRED',
  'DEALER_LOGIN_CAPTCHA_INVALID',
  'DEALER_LOGIN_CAPTCHA_EXPIRED',
])

const userStore = useUserStore()
const account = ref('')
const password = ref('')
const showPassword = ref(false)
const agreeProtocol = ref(false)
const logging = ref(false)
const focusedField = ref('')
const formError = ref('')
const redirectTarget = ref(null)

onLoad((options) => {
  if (options?.redirect) {
    redirectTarget.value = sanitizeRedirect(options.redirect)
  }
})

const captchaRequired = ref(false)
const captchaLoading = ref(false)
const captchaVerifying = ref(false)
const captchaVerified = ref(false)
const captchaChallenge = ref(null)
const captchaToken = ref('')
const captchaError = ref('')
const captchaUsername = ref('')
const showCaptchaModal = ref(false)

const placeholderStyle = 'color: #989BA3; font-size: 14px;'

const canLogin = computed(() => {
  const hasCredentials = Boolean(account.value.trim() && password.value)
  return hasCredentials && agreeProtocol.value
})

const loginButtonText = computed(() => {
  if (logging.value) return '正在登录…'
  return '登录'
})

watch(account, (value) => {
  if (!captchaRequired.value || !captchaUsername.value) return
  if (value.trim() === captchaUsername.value) return

  captchaRequired.value = false
  captchaUsername.value = ''
  resetCaptchaVerification()
  showCaptchaModal.value = false
  formError.value = ''
})

onBackPress(() => {
  if (!showCaptchaModal.value) return false
  closeCaptchaModal()
  return true
})

async function handleAccountBlur() {
  focusedField.value = ''
  // 验证码只应在用户点击图片/刷新链接、或登录失败需要新验证码时才刷新
  // 不在账号失焦时自动刷新，避免用户输入验证码过程中被打断
}

function togglePassword() {
  showPassword.value = !showPassword.value
}

function closeCaptchaModal() {
  // 关闭只影响弹框显示，不清空服务端挑战、验证结果或安全校验要求。
  showCaptchaModal.value = false
}

function resetCaptchaVerification() {
  // 验证码与验证令牌均为一次性数据。密码再次错误后必须彻底废弃，
  // 防止后续请求重复提交已经被服务端消费的旧 token。
  captchaChallenge.value = null
  captchaToken.value = ''
  captchaVerified.value = false
  captchaError.value = ''
}

async function openCaptchaModal() {
  const username = account.value.trim()
  if (!username) {
    formError.value = '请先输入登录账号'
    return
  }

  showCaptchaModal.value = true
  // 进入验证码流程后，页面只保留验证码状态入口，避免旧错误与弹框提示重复。
  formError.value = ''
  if (!captchaVerified.value && !captchaChallenge.value && !captchaLoading.value) {
    await refreshCaptcha()
  }
}

async function refreshCaptcha(options = {}) {
  const preserveError = Boolean(options?.preserveError)
  const username = account.value.trim()
  if (!username) {
    formError.value = '请先输入登录账号'
    return
  }
  if (captchaLoading.value || captchaVerifying.value) return

  captchaLoading.value = true
  captchaToken.value = ''
  captchaVerified.value = false
  if (!preserveError) captchaError.value = ''

  try {
    const result = await getLoginCaptcha(username)
    if (!result?.captchaId || !result?.backgroundImageBase64 || !result?.pieceImageBase64) {
      throw new Error('滑块验证码数据不完整')
    }
    if (account.value.trim() !== username) return
    captchaChallenge.value = result
    captchaUsername.value = username
  } catch (error) {
    console.error('[Login] 验证码加载失败:', error)
    captchaError.value = error?.message || '验证码加载失败，请点击刷新重试'
  } finally {
    captchaLoading.value = false
  }
}

function enableCaptcha() {
  captchaRequired.value = true
  captchaUsername.value = account.value.trim()
  resetCaptchaVerification()
  // 登录结果提示统一为一句，不暴露账号是否存在，也不重复展示失败次数。
  formError.value = '账号或密码错误，请检查后重试'

  // 本次登录失败只提示错误；即使此前存在残留状态，也强制保持弹框关闭。
  // 用户下一次主动点击登录时才由 handleLogin 打开验证弹框。
  showCaptchaModal.value = false
}

async function verifyCaptcha(offsetX) {
  const username = account.value.trim()
  const captchaId = captchaChallenge.value?.captchaId
  if (!username || !captchaId || captchaVerifying.value) return

  captchaVerifying.value = true
  captchaVerified.value = false
  captchaToken.value = ''
  captchaError.value = ''

  let shouldRefresh = false
  try {
    const result = await verifyLoginCaptcha(username, captchaId, offsetX)
    if (!result?.verificationToken) {
      throw new Error('滑块验证结果无效')
    }
    if (account.value.trim() !== username) return
    captchaToken.value = result.verificationToken
    captchaVerified.value = true
    formError.value = ''
    // 验证成功后自动关闭弹框，无需手动点击关闭
    showCaptchaModal.value = false
  } catch (error) {
    console.error('[Login] 滑块验证失败:', error)
    const errorCode = error?.errorCode || ''
    captchaError.value = errorCode === 'DEALER_LOGIN_CAPTCHA_EXPIRED'
      ? '验证码已过期，已为你更换，请重新验证'
      : '拼图位置不正确，已为你更换，请重试'
    if ([
      'DEALER_LOGIN_CAPTCHA_INVALID',
      'DEALER_LOGIN_CAPTCHA_EXPIRED',
    ].includes(errorCode)) {
      shouldRefresh = true
    }
  } finally {
    captchaVerifying.value = false
  }

  if (shouldRefresh) await refreshCaptcha({ preserveError: true })
}

async function handleLogin() {
  if (logging.value) return

  const username = account.value.trim()
  if (!username || !password.value) {
    formError.value = '请输入登录账号和密码'
    return
  }
  if (!agreeProtocol.value) {
    formError.value = '请先阅读并同意用户协议和隐私政策'
    return
  }
  if (captchaRequired.value && (!captchaVerified.value || !captchaToken.value)) {
    await openCaptchaModal()
    return
  }

  logging.value = true
  formError.value = ''

  try {
    const result = await login(username, password.value, {
      captchaToken: captchaRequired.value ? captchaToken.value : '',
    })

    userStore.setLoginData(result)
    uni.showToast({ title: '登录成功', icon: 'success', duration: 600 })
    const target = redirectTarget.value || routes.home()
    navigator.reLaunch(target)
  } catch (error) {
    console.error('[Login] 登录失败:', error)
    const errorCode = error?.errorCode || ''
    const message = error?.message || '登录失败，请稍后重试'

    if (errorCode === 'DEALER_LOGIN_INVALID_CREDENTIALS') {
      enableCaptcha()
    } else if (CAPTCHA_ERRORS.has(errorCode)) {
      captchaRequired.value = true
      captchaUsername.value = username
      resetCaptchaVerification()
      formError.value = errorCode === 'DEALER_LOGIN_CAPTCHA_REQUIRED'
        ? '请完成安全验证后登录'
        : '安全验证已失效，请重新验证'
      showCaptchaModal.value = false
      // 本次只提示需要验证，等用户再次点击登录时再弹出。
    } else {
      formError.value = message
      // 网络或其他业务错误不自动刷新验证码，避免无意义地创建新挑战。
      // 若服务端判定令牌已失效，会在下一次登录时返回验证码错误码，再按上面分支刷新。
    }
  } finally {
    logging.value = false
  }
}

function openAgreement(type) {
  navigator.navigateTo(routes.auth.agreement({ type: type === 'privacy' ? 'privacy' : 'user' }))
}

</script>

<style lang="scss" scoped>
.login-page {
  min-height: 100%;
  padding: $space-10 $page-padding-mobile calc(#{$space-6} + env(safe-area-inset-bottom));
  box-sizing: border-box;
  background: $color-bg-page;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
}

.login-main {
  width: 100%;
  max-width: 720rpx;
  margin: 0 auto;
}

.brand-block {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  margin-bottom: $space-8;
}

.brand-logo {
  width: 112rpx;
  height: 112rpx;
  margin-bottom: $space-3;
}

.brand-title {
  color: $color-brand-500;
  font-size: $font-size-h1;
  line-height: $line-height-h1;
  font-weight: $font-weight-bold;
  letter-spacing: 4rpx;
}

.brand-subtitle {
  margin-top: $space-1;
  color: $color-text-primary;
  font-size: $font-size-body-l;
  line-height: $line-height-body-l;
  font-weight: $font-weight-semibold;
}

.brand-description {
  margin-top: $space-1;
  color: $color-text-secondary;
  font-size: $font-size-caption;
  line-height: $line-height-caption;
}

.login-card {
  padding: $space-6;
  background: $color-bg-card;
  border: 2rpx solid $color-border-default;
  border-radius: $radius-feature;
}

.card-heading {
  display: flex;
  flex-direction: column;
  margin-bottom: $space-6;
}

.card-title {
  color: $color-text-primary;
  font-size: $font-size-h2;
  line-height: $line-height-h2;
  font-weight: $font-weight-bold;
}

.card-caption {
  margin-top: $space-1;
  color: $color-text-secondary;
  font-size: $font-size-caption;
  line-height: $line-height-caption;
}

.form-field + .form-field {
  margin-top: $space-5;
}

.field-label {
  display: block;
  margin-bottom: $space-2;
  color: $color-text-primary;
  font-size: $font-size-body-m;
  line-height: $line-height-body-m;
  font-weight: $font-weight-semibold;
}

.field-control {
  height: $control-height;
  padding: 0 $space-4;
  box-sizing: border-box;
  display: flex;
  align-items: center;
  gap: $space-3;
  background: $color-gray-25;
  border: 2rpx solid $color-border-default;
  border-radius: $radius-control;
  transition: border-color $duration-normal $easing-standard,
    background-color $duration-normal $easing-standard;

  &.focused {
    background: $color-bg-card;
    border-color: $color-brand-500;
  }
}

.field-input {
  min-width: 0;
  height: 100%;
  flex: 1;
  color: $color-text-primary;
  font-size: $font-size-body-m;
}

.icon-action {
  width: $touch-target-min;
  height: $touch-target-min;
  margin-right: -$space-3;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
}

.icon-action--pressed {
  background: $color-gray-100;
}

.password-toggle {
  flex-shrink: 0;
}

.captcha-entry {
  min-height: 72rpx;
  margin-top: $space-4;
  padding: 0 $space-3;
  box-sizing: border-box;
  display: flex;
  align-items: center;
  gap: $space-2;
  color: #b54708;
  background: #fffaeb;
  border: 2rpx solid #fedf89;
  border-radius: $radius-control;

  &.verified {
    color: #027a48;
    background: #ecfdf3;
    border-color: #abefc6;
  }
}

.captcha-entry__title {
  min-width: 0;
  flex: 1;
  color: $color-text-primary;
  font-size: $font-size-caption;
  line-height: $line-height-caption;
  font-weight: $font-weight-semibold;
}

.captcha-entry__status {
  flex-shrink: 0;
  color: inherit;
  font-size: $font-size-micro;
  line-height: $line-height-micro;
  font-weight: $font-weight-semibold;
}

.captcha-modal-mask {
  position: fixed;
  top: 0;
  right: 0;
  bottom: 0;
  left: 0;
  z-index: 1200;
  padding: $space-6 $page-padding-mobile calc(#{$space-6} + env(safe-area-inset-bottom));
  box-sizing: border-box;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(16, 24, 40, 0.56);
}

.captcha-modal {
  width: 100%;
  max-width: 680rpx;
  padding: $space-5;
  box-sizing: border-box;
  background: $color-bg-card;
  border-radius: $radius-feature;
  box-shadow: 0 24rpx 64rpx rgba(16, 24, 40, 0.2);
}

.captcha-modal__header {
  min-height: $touch-target-min;
  margin-bottom: $space-4;
  display: flex;
  align-items: flex-start;
  gap: $space-3;
}

.captcha-modal__heading {
  min-width: 0;
  flex: 1;
  display: flex;
  flex-direction: column;
}

.captcha-modal__title {
  color: $color-text-primary;
  font-size: $font-size-h3;
  line-height: $line-height-h3;
  font-weight: $font-weight-bold;
}

.captcha-modal__close {
  width: $touch-target-min;
  height: $touch-target-min;
  margin-top: -$space-2;
  margin-right: -$space-2;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
}

.captcha-modal__close--pressed {
  background: $color-gray-100;
}

.form-error {
  margin-top: $space-4;
  padding: $space-3;
  display: flex;
  align-items: flex-start;
  gap: $space-2;
  color: $color-error;
  background: $color-error-bg;
  border-radius: $radius-control;
  font-size: $font-size-caption;
  line-height: $line-height-caption;
}

.agreement-row {
  min-height: $touch-target-min;
  margin-top: $space-3;
  display: flex;
  align-items: center;
}

.checkbox {
  width: 36rpx;
  height: 36rpx;
  margin-right: $space-2;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  box-sizing: border-box;
  background: $color-bg-card;
  border: 2rpx solid $color-gray-300;
  border-radius: $radius-tag;

  &.checked {
    background: $color-action-primary;
    border-color: $color-action-primary;
  }
}

.agreement-text {
  color: $color-text-secondary;
  font-size: $font-size-caption;
  line-height: $line-height-caption;
}

.agreement-link,
.apply-link {
  color: $color-action-primary;
  font-weight: $font-weight-medium;
}

.login-button {
  width: 100%;
  height: $control-height;
  margin-top: $space-4;
  display: flex;
  align-items: center;
  justify-content: center;
  color: $color-gray-0;
  background: $color-action-primary;
  border-radius: $radius-control;
  font-size: $font-size-body-l;
  font-weight: $font-weight-semibold;
  line-height: 1;

  &::after {
    border: 0;
  }

  &[disabled] {
    color: $color-gray-0;
    background: $color-brand-300;
  }
}

.apply-entry {
  min-height: $touch-target-min;
  margin-top: $space-4;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: $space-1;
  font-size: $font-size-body-m;
  line-height: $line-height-body-m;
}

.apply-copy {
  color: $color-text-secondary;
}

.security-note {
  display: block;
  max-width: 720rpx;
  margin: $space-6 auto 0;
  color: $color-text-disabled;
  text-align: center;
  font-size: $font-size-micro;
  line-height: $line-height-micro;
}

@media (min-width: 768px) {
  .login-page {
    padding-left: $page-padding-tablet;
    padding-right: $page-padding-tablet;
  }
}
</style>
