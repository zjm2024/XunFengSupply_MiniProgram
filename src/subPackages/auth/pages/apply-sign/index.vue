<!--
  经销商入驻资料提交页
  表单字段严格对应后端 ApplyRequest；行政区划通过 sys_area 接口级联选择。
-->
<template>
  <AppPageShell>
    <template #header>
      <AppHeader :title="t('auth.titles.apply')" :show-back="true" :show-shadow="true" />
    </template>

    <template #content>
      <AppContent :scroll-into-view="scrollTarget">
        <view class="apply-page">
          <view v-if="applicationState" class="application-status-card" :class="`status-${applicationState.status}`">
            <view class="status-hero">
              <view class="application-status-badge">
                <AppIcon :name="applicationState.status === 'approved' ? 'shield-check' : applicationState.status === 'rejected' ? 'info' : 'clock'" :size="30" color="currentColor" />
              </view>
              <text class="status-eyebrow">{{ t('auth.apply.eyebrow') }}</text>
              <text class="application-status-title">{{ applicationStatusTitle }}</text>
              <text class="application-status-description">{{ applicationStatusDescription }}</text>
            </view>
            <view class="application-receipt">
              <view v-if="applicationState.companyName" class="receipt-row"><text class="receipt-label">{{ t('auth.apply.company') }}</text><text class="receipt-value">{{ applicationState.companyName }}</text></view>
              <view v-if="applicationState.mobile" class="receipt-row"><text class="receipt-label">{{ t('auth.apply.loginAccount') }}</text><text class="receipt-value">{{ applicationState.mobile }}</text></view>
              <view v-if="applicationState.applicationId" class="receipt-row"><text class="receipt-label">{{ t('auth.apply.applicationNo') }}</text><text class="receipt-value">{{ applicationState.applicationId }}</text></view>
              <view v-if="applicationState.submittedAt" class="receipt-row"><text class="receipt-label">{{ t('auth.apply.submittedAt') }}</text><text class="receipt-value">{{ formatDateTime(applicationState.submittedAt) }}</text></view>
            </view>
            <view class="application-timeline">
              <view class="timeline-step completed"><view class="timeline-dot"><AppIcon name="check" :size="14" color="#fff" /></view><view><text class="timeline-title">资料已提交</text><text class="timeline-copy">申请资料已收到</text></view></view>
              <view class="timeline-step" :class="{ current: applicationState.status === 'pending', completed: applicationState.status === 'approved' }"><view class="timeline-dot">2</view><view><text class="timeline-title">{{ applicationState.status === 'rejected' ? '审核未通过' : '平台审核' }}</text><text class="timeline-copy">{{ applicationState.status === 'pending' ? '请耐心等待审核结果' : applicationState.status === 'approved' ? '审核通过，可以登录' : '请完善资料后重新提交' }}</text></view></view>
            </view>
            <view class="status-actions">
              <button v-if="applicationState.status === 'rejected'" class="status-action button-center" :loading="statusRefreshing" :disabled="statusRefreshing" @tap="resetApplicationState">{{ t('auth.apply.editResubmit') }}</button>
              <button v-else-if="applicationState.status === 'approved'" class="status-action button-center" @tap="goToLogin">{{ t('auth.apply.goLogin') }}</button>
              <button v-else class="status-action button-center" :loading="statusRefreshing" :disabled="statusRefreshing" @tap="refreshApplicationStatus">{{ t('auth.apply.refreshStatus') }}</button>
              <button class="status-action secondary button-center" @tap="leaveApplicationStatus">{{ t('auth.apply.returnLogin') }}</button>
            </view>
          </view>
          <template v-else>
          <view class="progress-card" :aria-label="t('auth.apply.progress')">
            <view class="progress-step active">
              <view class="step-dot">1</view>
              <text class="step-name">{{ t('auth.apply.stepSubmit') }}</text>
            </view>
            <view class="progress-line"></view>
            <view class="progress-step">
              <view class="step-dot">2</view>
              <text class="step-name">平台审核</text>
            </view>
          </view>

          <view class="form-card">
            <view class="section-heading"><view class="heading-accent"></view><view><text class="section-title">{{ t('auth.apply.passwordSection') }}</text><text class="section-description">{{ t('auth.apply.passwordNote') }}</text></view></view>
            <view class="form-grid">
              <view id="field-password" class="form-item">
                <text class="field-label"><text class="required">*</text>{{ formData.applicationId ? t('auth.apply.originalPassword') : t('auth.apply.password') }}</text>
                <input v-model="formData.password" class="form-control" :class="{ error: errors.password }" password maxlength="64" :placeholder="t('auth.apply.passwordPlaceholder')" :placeholder-style="placeholderStyle" @input="clearFieldError('password')" @blur="validateField('password')" />
                <text v-if="errors.password" class="field-error">{{ displayError(errors.password) }}</text>
              </view>
              <view id="field-confirmPassword" class="form-item">
                <text class="field-label"><text class="required">*</text>{{ t('auth.apply.confirmPassword') }}</text>
                <input v-model="formData.confirmPassword" class="form-control" :class="{ error: errors.confirmPassword }" password maxlength="64" :placeholder="t('auth.apply.confirmPasswordPlaceholder')" :placeholder-style="placeholderStyle" @input="clearFieldError('confirmPassword')" @blur="validateField('confirmPassword')" />
                <text v-if="errors.confirmPassword" class="field-error">{{ displayError(errors.confirmPassword) }}</text>
              </view>
            </view>
          </view>

          <view class="form-card">
            <view class="section-heading">
              <view class="heading-accent"></view>
              <view>
                <text class="section-title">{{ t('auth.apply.companyContact') }}</text>
                <text class="section-description">{{ t('auth.apply.companyContactNote') }}</text>
              </view>
            </view>

            <view class="form-grid">
              <view id="field-companyName" class="form-item full">
                <text class="field-label"><text class="required">*</text>{{ t('auth.apply.companyName') }}</text>
                <input
                  v-model="formData.companyName"
                  class="form-control"
                  :class="{ error: errors.companyName }"
                  maxlength="120"
                  :placeholder="t('auth.apply.companyPlaceholder')"
                  :placeholder-style="placeholderStyle"
                  @input="clearFieldError('companyName')"
                  @blur="validateField('companyName')"
                />
                <text v-if="errors.companyName" class="field-error">{{ displayError(errors.companyName) }}</text>
              </view>

              <view id="field-contactName" class="form-item">
                <text class="field-label"><text class="required">*</text>{{ t('auth.apply.contactName') }}</text>
                <input
                  v-model="formData.contactName"
                  class="form-control"
                  :class="{ error: errors.contactName }"
                  maxlength="50"
                  :placeholder="t('auth.apply.contactPlaceholder')"
                  :placeholder-style="placeholderStyle"
                  @input="clearFieldError('contactName')"
                  @blur="validateField('contactName')"
                />
                <text v-if="errors.contactName" class="field-error">{{ displayError(errors.contactName) }}</text>
              </view>

              <view id="field-mobile" class="form-item">
                <text class="field-label"><text class="required">*</text>{{ t('auth.apply.mobile') }}</text>
                <input
                  v-model="formData.mobile"
                  class="form-control"
                  :class="{ error: errors.mobile }"
                  type="number"
                  maxlength="11"
                  :placeholder="t('auth.apply.mobilePlaceholder')"
                  :placeholder-style="placeholderStyle"
                  @input="clearFieldError('mobile')"
                  @blur="validateField('mobile')"
                />
                <text v-if="errors.mobile" class="field-error">{{ displayError(errors.mobile) }}</text>
              </view>

              <view id="field-landlinePhone" class="form-item">
                <text class="field-label"><text class="required">*</text>{{ t('auth.apply.landline') }}</text>
                <input
                  v-model="formData.landlinePhone"
                  class="form-control"
                  :class="{ error: errors.landlinePhone }"
                  maxlength="20"
                  :placeholder="t('auth.apply.landlinePlaceholder')"
                  :placeholder-style="placeholderStyle"
                  @input="clearFieldError('landlinePhone')"
                  @blur="validateField('landlinePhone')"
                />
                <text v-if="errors.landlinePhone" class="field-error">{{ displayError(errors.landlinePhone) }}</text>
              </view>

              <view id="field-taxNo" class="form-item">
                <text class="field-label">{{ t('auth.apply.taxNo') }}<text class="optional">{{ t('auth.apply.optional') }}</text></text>
                <input
                  v-model="formData.taxNo"
                  class="form-control"
                  :class="{ error: errors.taxNo }"
                  maxlength="32"
                  :placeholder="t('auth.apply.taxPlaceholder')"
                  :placeholder-style="placeholderStyle"
                  @input="clearFieldError('taxNo')"
                  @blur="validateField('taxNo')"
                />
                <text v-if="errors.taxNo" class="field-error">{{ displayError(errors.taxNo) }}</text>
              </view>

              <view id="field-email" class="form-item full">
                <text class="field-label">{{ t('auth.apply.email') }}<text class="optional">{{ t('auth.apply.optional') }}</text></text>
                <input
                  v-model="formData.email"
                  class="form-control"
                  :class="{ error: errors.email }"
                  maxlength="100"
                  :placeholder="t('auth.apply.emailPlaceholder')"
                  :placeholder-style="placeholderStyle"
                  @input="clearFieldError('email')"
                  @blur="validateField('email')"
                />
                <text v-if="errors.email" class="field-error">{{ displayError(errors.email) }}</text>
              </view>
            </view>
          </view>

          <view class="form-card">
            <view class="section-heading">
              <view class="heading-accent"></view>
              <view>
                <text class="section-title">{{ t('auth.apply.addressSection') }}</text>
                <text class="section-description">{{ t('auth.apply.addressNote') }}</text>
              </view>
            </view>

            <view class="form-grid">
              <view id="field-region" class="form-item full">
                <text class="field-label"><text class="required">*</text>{{ t('auth.apply.region') }}</text>
                <AreaCascadePicker
                  v-model="regionValue"
                  :error="Boolean(errors.region)"
                  @open="regionPickerVisible = true"
                />
                <text v-if="errors.region" class="field-error">{{ displayError(errors.region) }}</text>
              </view>

              <view id="field-addressDetail" class="form-item full">
                <text class="field-label"><text class="required">*</text>{{ t('auth.apply.addressDetail') }}</text>
                <textarea
                  v-model="formData.addressDetail"
                  class="form-textarea"
                  :class="{ error: errors.addressDetail }"
                  maxlength="200"
                  :placeholder="t('auth.apply.addressPlaceholder')"
                  :placeholder-style="placeholderStyle"
                  @input="clearFieldError('addressDetail')"
                  @blur="validateField('addressDetail')"
                />
                <text v-if="errors.addressDetail" class="field-error">{{ displayError(errors.addressDetail) }}</text>
              </view>

              <view id="field-registeredAddress" class="form-item full">
                <text class="field-label">{{ t('auth.apply.registeredAddress') }}<text class="optional">{{ t('auth.apply.optional') }}</text></text>
                <textarea
                  v-model="formData.registeredAddress"
                  class="form-textarea compact"
                  :class="{ error: errors.registeredAddress }"
                  maxlength="200"
                  :placeholder="t('auth.apply.registeredPlaceholder')"
                  :placeholder-style="placeholderStyle"
                  @input="clearFieldError('registeredAddress')"
                  @blur="validateField('registeredAddress')"
                />
                <text v-if="errors.registeredAddress" class="field-error">{{ displayError(errors.registeredAddress) }}</text>
              </view>
            </view>
          </view>

          <view class="form-card">
            <view class="section-heading">
              <view class="heading-accent"></view>
              <view>
                <text class="section-title">{{ t('auth.apply.license') }}</text>
                <text class="section-description">{{ t('auth.apply.licenseNote') }}</text>
              </view>
            </view>

            <view id="field-licenseUrl" class="form-item">
              <text class="field-label"><text class="required">*</text>{{ t('auth.apply.licensePhoto') }}</text>
              <FileUploader
                v-model="licenseImages"
                scene="dealer-application-license"
                :maxCount="1"
                :tips="t('auth.apply.licenseTip')"
              />
              <text v-if="errors.licenseUrl" class="field-error">{{ displayError(errors.licenseUrl) }}</text>
            </view>
          </view>

          <view id="field-agreed" class="agreement-block" :class="{ error: errors.agreed }">
            <checkbox-group @change="handleAgreementChange">
              <label class="agreement-label">
                <checkbox value="agreed" :checked="agreed" color="#D7192D" />
                <text class="agreement-text">{{ t('auth.apply.agreementLead') }}</text>
                <text class="agreement-link" @tap.stop="openAgreement">{{ t('auth.apply.agreement') }}</text>
              </label>
            </checkbox-group>
            <text v-if="errors.agreed" class="field-error agreement-error">{{ displayError(errors.agreed) }}</text>
          </view>
          </template>
        </view>
      </AppContent>
    </template>

    <template #overlay>
      <AreaCascadePickerPanel
        v-model:visible="regionPickerVisible"
        v-model="regionValue"
        @confirm="handleRegionConfirm"
      />
      <view
        v-if="showCaptchaModal"
        class="captcha-modal-mask"
        @click.self="closeCaptchaModal"
      >
        <view class="captcha-modal" @click.stop>
          <view class="captcha-modal__header">
            <view class="captcha-modal__heading">
              <text class="captcha-modal__title">{{ t('auth.apply.verification') }}</text>
              <text class="captcha-modal__description">{{ t('auth.apply.verificationNote') }}</text>
            </view>
            <view
              class="captcha-modal__close"
              hover-class="captcha-modal__close--pressed"
              :aria-label="t('auth.apply.closeVerification')"
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
            :error-text="captchaErrorText"
            @refresh="refreshCaptcha"
            @verify="verifyCaptcha"
            @image-error="handleCaptchaImageError"
          />
        </view>
      </view>
    </template>

    <template #footer>
      <view v-if="!applicationState" class="submit-footer">
        <button
          class="submit-button button-center"
          :disabled="submitting || captchaVerifying"
          :loading="submitting"
          hover-class="submit-button-hover"
          @tap="handleSubmit"
        >
          {{ submitting ? t('auth.apply.submitting') : t('auth.apply.submit') }}
        </button>
      </view>
    </template>
  </AppPageShell>
</template>

<script setup>
import { t } from '@/shared/i18n/index.js'
import { AppError, ErrorKind } from '@/shared/api/appError.js'
import '@/subPackages/auth/i18n/register.js'
import { computed, nextTick, reactive, ref, watch } from 'vue'
import { onBackPress, onLoad, onUnload } from '@dcloudio/uni-app'
import { applySign, getApplicationCaptcha, getSignStatus, queryApplicationStatus, verifyApplicationCaptcha } from '../../api/auth.js'
import { validateSignForm } from '../../../../shared/utils/validate.js'
import { navigator } from '../../../../app/navigation/navigator.js'
import { routes } from '../../../../app/config/routes.js'
import AppHeader from '../../../../shared/ui/AppHeader/AppHeader.vue'
import AppIcon from '../../../../shared/ui/AppIcon/AppIcon.vue'
import AppPageShell from '../../../../shared/ui/AppPageShell/AppPageShell.vue'
import AppContent from '../../../../shared/ui/AppContent/AppContent.vue'
import AreaCascadePicker from '../../components/AreaCascadePicker/AreaCascadePicker.vue'
import AreaCascadePickerPanel from '../../components/AreaCascadePicker/AreaCascadePickerPanel.vue'
import FileUploader from '../../../../shared/ui/FileUploader/FileUploader.vue'
import LoginSliderCaptcha from '../../components/LoginSliderCaptcha.vue'
import storage from '../../../../shared/utils/storage.js'
import { useUserStore } from '../../../../shared/session/userStore.js'
import { formatDateTime } from '../../../../shared/utils/format.js'

const placeholderStyle = 'color: #989BA3; font-size: 14px;'
const CAPTCHA_CHALLENGE_SAFETY_WINDOW_MS = 10 * 1000
const CAPTCHA_TOKEN_SAFETY_WINDOW_MS = 5 * 1000
const CAPTCHA_RECOVERABLE_ERRORS = new Set([
  'DEALER_LOGIN_CAPTCHA_REQUIRED',
  'DEALER_LOGIN_CAPTCHA_INVALID',
  'DEALER_LOGIN_CAPTCHA_EXPIRED',
])
const submitting = ref(false)
const agreed = ref(false)
const scrollTarget = ref('')
const regionPickerVisible = ref(false)
const licenseImages = ref([])
const applicationState = ref(null)
const applicationDetails = ref(null)
const statusRefreshing = ref(false)
const submitAfterVerification = ref(false)
const captchaLoading = ref(false)
const captchaVerifying = ref(false)
const captchaVerified = ref(false)
const captchaChallenge = ref(null)
const captchaToken = ref('')
const captchaError = ref('')
const captchaErrorText = computed(() => displayError(captchaError.value))
const captchaChallengeExpiresAt = ref(0)
const captchaTokenExpiresAt = ref(0)
const showCaptchaModal = ref(false)
const userStore = useUserStore()
const APPLICATION_CACHE_KEY = 'dealerApplication'
const APPLICATION_DRAFT_CACHE_KEY = 'dealerApplicationDraft'

const applicationStatusTitle = computed(() => {
  if (applicationState.value?.status === 'approved') return '申请已通过'
  if (applicationState.value?.status === 'rejected') return '申请未通过'
  return '申请审核中'
})

const applicationStatusDescription = computed(() => {
  if (applicationState.value?.status === 'approved') return '平台已完成审核，后续请使用经销商账号登录。'
  if (applicationState.value?.status === 'rejected') return '当前申请未通过审核，可修改资料后重新提交。'
  return '资料已成功提交。审核通过后，即可使用手机号和设置的密码登录。'
})

/** 主动查询本次申请的审核结果，不用本地缓存代替远端审核事实。 */
async function refreshApplicationStatus() {
  const current = applicationState.value
  if (!current?.mobile || statusRefreshing.value) return
  statusRefreshing.value = true
  try {
    const result = await queryApplicationStatus(current.mobile)
    if (!result || Number(result.applicationId) !== Number(current.applicationId)) {
      uni.showToast({ title: t('auth.apply.notFound'), icon: 'none' })
      return
    }
    const status = Number(result.status) === 1 ? 'approved' : Number(result.status) === 2 ? 'rejected' : 'pending'
    applicationDetails.value = result
    applicationState.value = { ...current, status }
    storage.set(APPLICATION_CACHE_KEY, applicationState.value)
    if (status === 'pending') uni.showToast({ title: t('auth.apply.pendingNotice'), icon: 'none' })
  } catch (error) {
    uni.showToast({ title: error?.message || t('auth.apply.statusFailed'), icon: 'none' })
  } finally {
    statusRefreshing.value = false
  }
}

/** 携带申请手机号进入登录页，密码始终由用户重新输入。 */
function goToLogin() {
  navigator.reLaunch(routes.auth.login({ account: applicationState.value?.mobile || '' }))
}

/** 返回登录页，保留申请回执供后续查询。 */
function leaveApplicationStatus() {
  goToLogin()
}

/** 根据当前账号或本机申请回执恢复审核界面。 */
async function loadApplicationState() {
  const cached = storage.get(APPLICATION_CACHE_KEY, null)
  if (['pending', 'approved', 'rejected'].includes(cached?.status)) applicationState.value = cached
  if (!userStore.isLogin) return
  try {
    const context = await getSignStatus({ authStrategy: 'passive' })
    userStore.setLoginData({ token: userStore.token, refreshToken: userStore.refreshToken, expiresIn: userStore.tokenExpiresIn, userInfo: context })
    const signStatus = Number(context?.signStatus ?? 0)
    if (signStatus === 1) {
      applicationState.value = { ...cached, status: 'pending' }
      storage.set(APPLICATION_CACHE_KEY, applicationState.value)
    } else if (signStatus === -1) {
      applicationState.value = { ...cached, status: 'rejected' }
      storage.remove(APPLICATION_CACHE_KEY)
    } else if (signStatus === 2) {
      applicationState.value = { ...cached, status: 'approved' }
      storage.remove(APPLICATION_CACHE_KEY)
    } else {
      applicationState.value = null
      storage.remove(APPLICATION_CACHE_KEY)
    }
  } catch (error) {
    console.warn('[ApplySign] 查询申请状态失败，使用本地提交记录:', error)
  }
}

/** 恢复被驳回申请的资料草稿，密码需重新输入并由服务端核验。 */
async function resetApplicationState() {
  if (statusRefreshing.value) return
  await refreshApplicationStatus()
  if (applicationState.value?.status !== 'rejected') return
  const receipt = applicationState.value
  applicationState.value = null
  storage.remove(APPLICATION_CACHE_KEY)
  restoreApplicationDraft()
  formData.applicationId = receipt.applicationId || null
  const details = applicationDetails.value
  if (details) {
    for (const field of ['companyName', 'contactName', 'mobile', 'landlinePhone', 'taxNo', 'email', 'addressDetail', 'registeredAddress']) {
      formData[field] = details[field] || ''
    }
    licenseImages.value = details.licenseUrl ? [details.licenseUrl] : []
  }
  formData.password = ''
  formData.confirmPassword = ''
}

onLoad(async () => {
  await loadApplicationState()
  if (!applicationState.value || applicationState.value.status === 'rejected') restoreApplicationDraft()
})

const regionValue = ref({
  provinceCode: '',
  province: '',
  cityCode: '',
  city: '',
  districtCode: '',
  district: '',
})

const formData = reactive({
  companyName: '',
  contactName: '',
  mobile: '',
  landlinePhone: '',
  taxNo: '',
  email: '',
  addressDetail: '',
  registeredAddress: '',
  applicationId: null,
  password: '',
  confirmPassword: '',
})

const errors = reactive({})

const validationData = computed(() => ({
  ...formData,
  ...regionValue.value,
  licenseUrl: licenseImages.value[0] || '',
  agreed: agreed.value,
}))

watch(formData, persistApplicationDraft, { deep: true })
watch(regionValue, persistApplicationDraft, { deep: true })
watch(licenseImages, () => {
  clearFieldError('licenseUrl')
  persistApplicationDraft()
}, { deep: true })
watch(agreed, persistApplicationDraft)

watch(() => formData.mobile, () => {
  submitAfterVerification.value = false
  resetCaptchaVerification()
  showCaptchaModal.value = false
})

onBackPress(() => {
  if (!showCaptchaModal.value) return false
  closeCaptchaModal()
  return true
})

function restoreApplicationDraft() {
  const draft = storage.get(APPLICATION_DRAFT_CACHE_KEY, null)
  if (!draft || typeof draft !== 'object') return

  Object.assign(formData, {
    companyName: draft.companyName || '',
    contactName: draft.contactName || '',
    mobile: draft.mobile || '',
    landlinePhone: draft.landlinePhone || '',
    taxNo: draft.taxNo || '',
    email: draft.email || '',
    addressDetail: draft.addressDetail || '',
    registeredAddress: draft.registeredAddress || '',
    applicationId: draft.applicationId || formData.applicationId,
  })
  Object.assign(regionValue.value, draft.regionValue || {})
  licenseImages.value = Array.isArray(draft.licenseImages) ? draft.licenseImages : []
  agreed.value = Boolean(draft.agreed)
}

function persistApplicationDraft() {
  if (applicationState.value?.status === 'pending' || applicationState.value?.status === 'approved') return

  storage.set(APPLICATION_DRAFT_CACHE_KEY, {
    companyName: formData.companyName,
    contactName: formData.contactName,
    mobile: formData.mobile,
    landlinePhone: formData.landlinePhone,
    taxNo: formData.taxNo,
    email: formData.email,
    addressDetail: formData.addressDetail,
    registeredAddress: formData.registeredAddress,
    applicationId: formData.applicationId,
    regionValue: { ...regionValue.value },
    licenseImages: [...licenseImages.value],
    agreed: agreed.value,
    updatedAt: Date.now(),
  })
}

function replaceErrors(nextErrors) {
  Object.keys(errors).forEach((key) => delete errors[key])
  Object.assign(errors, nextErrors)
}

function clearFieldError(field) {
  if (errors[field]) delete errors[field]
}

/** 校验当前字段并保留本地资源描述，语言切换时按最新语言显示。 */
function validateField(field) {
  const result = validateSignForm(validationData.value, key => localError(key))
  if (result.errors[field]) {
    errors[field] = result.errors[field]
  } else {
    clearFieldError(field)
  }
}

function handleRegionConfirm(value) {
  regionValue.value = value
  clearFieldError('region')
}

function handleAgreementChange(event) {
  agreed.value = event.detail.value.includes('agreed')
  clearFieldError('agreed')
}

function openAgreement() {
  navigator.navigateTo(routes.auth.agreement({ type: 'sign' }))
}

function scrollToError(field) {
  scrollTarget.value = ''
  nextTick(() => {
    scrollTarget.value = 'field-' + field
  })
}

function closeCaptchaModal() {
  submitAfterVerification.value = false
  showCaptchaModal.value = false
}

/** 清除已失效的验证码挑战和验证凭证。 */
function resetCaptchaVerification() {
  captchaChallenge.value = null
  captchaToken.value = ''
  captchaVerified.value = false
  captchaError.value = ''
  captchaChallengeExpiresAt.value = 0
  captchaTokenExpiresAt.value = 0
}

/** 将服务端的验证码图片字段规范为可直接用于 image 的 Data URL。 */
function normalizeCaptchaImageSource(value) {
  const source = String(value || '').trim()
  if (!source) return ''
  return source.startsWith('data:image/') ? source : 'data:image/png;base64,' + source
}

/** 校验并标准化服务端返回的验证码挑战数据。 */
function normalizeCaptchaChallenge(result) {
  const imageWidth = Number(result?.imageWidth)
  const imageHeight = Number(result?.imageHeight)
  const pieceSize = Number(result?.pieceSize)
  const pieceY = Number(result?.pieceY)
  const backgroundImageBase64 = normalizeCaptchaImageSource(result?.backgroundImageBase64)
  const pieceImageBase64 = normalizeCaptchaImageSource(result?.pieceImageBase64)

  if (!result?.captchaId || !backgroundImageBase64 || !pieceImageBase64
    || !Number.isFinite(imageWidth) || !Number.isFinite(imageHeight)
    || !Number.isFinite(pieceSize) || !Number.isFinite(pieceY)
    || imageWidth <= 0 || imageHeight <= 0 || pieceSize <= 0 || pieceY < 0) {
    throw localError('captchaIncomplete')
  }

  return {
    ...result,
    backgroundImageBase64,
    pieceImageBase64,
    imageWidth,
    imageHeight,
    pieceSize,
    pieceY,
  }
}

/** 判断已通过的验证凭证是否仍可用于本次提交。 */
function hasUsableCaptchaToken() {
  return captchaVerified.value
    && Boolean(captchaToken.value)
    && captchaTokenExpiresAt.value > Date.now() + CAPTCHA_TOKEN_SAFETY_WINDOW_MS
}

/** 判断当前挑战是否仍可用于指定手机号。 */
function hasUsableCaptchaChallenge(mobile) {
  return Boolean(captchaChallenge.value?.captchaId)
    && captchaChallengeExpiresAt.value > Date.now() + CAPTCHA_CHALLENGE_SAFETY_WINDOW_MS
    && formData.mobile.trim() === mobile
}

/** 将验证码服务错误转换为用户可操作的提示。 */
function getCaptchaErrorMessage(error) {
  const errorCode = error?.errorCode || ''
  if (errorCode === 'DEALER_LOGIN_CAPTCHA_TOO_FREQUENT') return localError('captchaFrequent')
  if (errorCode === 'DEALER_LOGIN_CAPTCHA_EXPIRED') return localError('captchaExpired')
  if (errorCode === 'DEALER_LOGIN_CAPTCHA_INVALID') return localError('captchaInvalid')
  if (errorCode === 'DEALER_LOGIN_CAPTCHA_REQUIRED') return localError('captchaRequired')
  return error?.message ? error : (error?.msg ? { message: error.msg } : localError('captchaLoadFailed'))
}

/** 打开验证码弹层；过期或缺失时自动生成新的挑战。 */
async function openCaptchaModal() {
  const mobile = formData.mobile.trim()
  showCaptchaModal.value = true

  if (!mobile) {
    captchaError.value = localError('mobileRequired')
    return
  }

  if (captchaVerifying.value || hasUsableCaptchaToken()) return
  if (!hasUsableCaptchaChallenge(mobile)) await refreshCaptcha()
}

/** 生成新的验证码挑战并保留失败提示。 */
async function refreshCaptcha(options = {}) {
  const preserveError = Boolean(options.preserveError)
  const mobile = formData.mobile.trim()
  showCaptchaModal.value = true

  if (!mobile) {
    captchaError.value = localError('mobileRequired')
    return
  }
  if (captchaLoading.value || captchaVerifying.value) return

  captchaLoading.value = true
  captchaToken.value = ''
  captchaTokenExpiresAt.value = 0
  captchaVerified.value = false
  captchaChallenge.value = null
  captchaChallengeExpiresAt.value = 0
  if (!preserveError) captchaError.value = ''

  try {
    const result = await getApplicationCaptcha(mobile)
    if (formData.mobile.trim() !== mobile) return

    const challenge = normalizeCaptchaChallenge(result)
    captchaChallenge.value = challenge
    captchaChallengeExpiresAt.value = Date.now() + Math.max(Number(challenge.expiresIn) || 0, 1) * 1000
  } catch (error) {
    console.error('[ApplySign] 验证码加载失败:', error)
    captchaError.value = getCaptchaErrorMessage(error)
  } finally {
    captchaLoading.value = false
  }
}

/** 处理验证码图片渲染失败，保留弹层并提示用户刷新。 */
function handleCaptchaImageError() {
  captchaChallenge.value = null
  captchaChallengeExpiresAt.value = 0
  captchaError.value = localError('captchaImageFailed')
}

/** 校验滑块位置，成功后保存一次性提交凭证。 */
async function verifyCaptcha(offsetX) {
  const mobile = formData.mobile.trim()
  const captchaId = captchaChallenge.value?.captchaId
  if (!mobile || !captchaId || captchaVerifying.value) return

  captchaVerifying.value = true
  captchaVerified.value = false
  captchaToken.value = ''
  captchaTokenExpiresAt.value = 0
  captchaError.value = ''

  let shouldRefresh = false
  let shouldSubmit = false
  try {
    const result = await verifyApplicationCaptcha(mobile, captchaId, offsetX)
    if (!result?.verificationToken) throw localError('captchaResultInvalid')
    if (formData.mobile.trim() !== mobile || captchaChallenge.value?.captchaId !== captchaId || !showCaptchaModal.value) return

    captchaToken.value = result.verificationToken
    captchaTokenExpiresAt.value = Date.now() + Math.max(Number(result.expiresIn) || 0, 1) * 1000
    captchaVerified.value = true
    showCaptchaModal.value = false
    shouldSubmit = submitAfterVerification.value
    submitAfterVerification.value = false
  } catch (error) {
    console.error('[ApplySign] 验证码校验失败:', error)
    captchaError.value = getCaptchaErrorMessage(error)
    shouldRefresh = ['DEALER_LOGIN_CAPTCHA_INVALID', 'DEALER_LOGIN_CAPTCHA_EXPIRED'].includes(error?.errorCode || '')
  } finally {
    captchaVerifying.value = false
  }

  if (shouldRefresh) await refreshCaptcha({ preserveError: true })
  if (shouldSubmit) await handleSubmit()
}
/** 校验完整资料，完成滑块验证后只提交一次入驻申请。 */
async function handleSubmit() {
  if (submitting.value || captchaVerifying.value || applicationState.value) return

  const result = validateSignForm(validationData.value, key => localError(key))
  replaceErrors(result.errors)

  if (!result.valid) {
    const firstField = Object.keys(result.errors)[0]
    scrollToError(firstField)
    uni.showToast({ title: displayError(result.firstError), icon: 'none' })
    return
  }

  if (!hasUsableCaptchaToken()) {
    submitAfterVerification.value = true
    resetCaptchaVerification()
    await openCaptchaModal()
    return
  }

  submitting.value = true
  try {
    const data = validationData.value
    const applicationId = await applySign({
      companyName: data.companyName.trim(),
      contactName: data.contactName.trim(),
      mobile: data.mobile.trim(),
      landlinePhone: data.landlinePhone.trim(),
      taxNo: data.taxNo.trim() || null,
      email: data.email.trim() || null,
      province: data.province,
      city: data.city,
      district: data.district,
      addressDetail: data.addressDetail.trim(),
      registeredAddress: data.registeredAddress.trim() || null,
      licenseUrl: data.licenseUrl,
      captchaToken: captchaToken.value,
      password: data.password,
      applicationId: data.applicationId || null,
    })
    // 只有后端确认申请提交成功后，才清理本地申请草稿。
    applicationState.value = { applicationId, companyName: data.companyName.trim(), mobile: data.mobile.trim(), status: 'pending', submittedAt: Date.now() }
    storage.set(APPLICATION_CACHE_KEY, applicationState.value)
    storage.remove(APPLICATION_DRAFT_CACHE_KEY)
    formData.password = ''
    formData.confirmPassword = ''
    resetCaptchaVerification()
    scrollTarget.value = ''
  } catch (error) {
    console.error('[ApplySign] 提交失败:', error)
    if (CAPTCHA_RECOVERABLE_ERRORS.has(error?.errorCode || '')) {
      resetCaptchaVerification()
      captchaError.value = getCaptchaErrorMessage(error)
      showCaptchaModal.value = true
      submitAfterVerification.value = true
      await refreshCaptcha({ preserveError: true })
      return
    }

    uni.showToast({
      title: error?.message || error?.msg || t('auth.apply.submitFailed'),
      icon: 'none',
    })
    resetCaptchaVerification()
  } finally {
    submitting.value = false
  }
}

onUnload(() => {
  submitAfterVerification.value = false
  formData.password = ''
  formData.confirmPassword = ''
})
/** 创建签约本地提示，不附加业务错误码或改变验证码恢复策略。 */
function localError(key) {
  return new AppError('', ErrorKind.UNKNOWN, { messageKey: 'auth.apply.' + key })
}

/** 延迟显示本地错误；服务端 message 或 msg 保持原文。 */
function displayError(value) {
  return value?.message || (typeof value === 'string' ? value : '')
}
</script>

<style lang="scss" scoped>
.apply-page {
  box-sizing: border-box;
  padding: $space-3 0 $space-6;
  display: flex;
  flex-direction: column;
  gap: $space-5;
}

.application-status-card {
  width: 100%;
  max-width: 600px;
  margin: 12px auto 0;
  overflow: hidden;
  background: #fff;
  border-radius: 22px;
  box-shadow: 0 8px 32px rgba(33, 39, 50, .05);
}
.status-hero { display: flex; flex-direction: column; align-items: center; padding: 32px 24px 24px; text-align: center; background: linear-gradient(180deg, #fff5f0, #fff); }
.application-status-badge { width: 68px; height: 68px; display: flex; align-items: center; justify-content: center; border-radius: 22px; color: #b76a23; background: #fff0df; }
.status-approved .application-status-badge { color: #287852; background: #eaf6ef; }
.status-rejected .application-status-badge { color: #d7192d; background: #fff0f2; }
.status-eyebrow { margin-top: 20px; color: #9b7c6a; font-size: var(--type-caption-size, 12px); letter-spacing: 2px; }
.application-status-title { display: block; margin-top: 8px; color: $color-text-primary; font-size: var(--type-page-title-size, 20px); line-height: 32px; font-weight: 700; }
.application-status-description { max-width: 360px; margin-top: 12px; color: $color-text-secondary; font-size: var(--type-body-size, 14px); line-height: 24px; }
.application-receipt { margin: 0 20px; padding: 16px; border-radius: 14px; background: #f7f8fa; }
.receipt-row { display: flex; align-items: flex-start; justify-content: space-between; gap: 16px; }
.receipt-row + .receipt-row { margin-top: 12px; }
.receipt-label { flex: 0 0 auto; color: #8a8e98; font-size: var(--type-body-small-size, 13px); line-height: 22px; }
.receipt-value { min-width: 0; color: #343944; font-size: var(--type-body-small-size, 13px); line-height: 22px; text-align: right; overflow-wrap: anywhere; }
.application-timeline { margin: 24px 36px; }
.timeline-step { position: relative; display: flex; align-items: flex-start; gap: 14px; padding-bottom: 24px; }
.timeline-step:first-child::after { content: ''; position: absolute; top: 32px; left: 13px; bottom: 4px; width: 2px; background: #eceef2; }
.timeline-step:last-child { padding-bottom: 0; }
.timeline-dot { flex: 0 0 28px; height: 28px; display: flex; align-items: center; justify-content: center; box-sizing: border-box; border-radius: 50%; background: #f0f1f4; color: #9096a1; font-size: 12px; line-height: 18px; }
.timeline-step.completed .timeline-dot { background: #d7192d; color: #fff; }
.timeline-step.current .timeline-dot { color: #a9682e; background: #fff0df; }
.timeline-title, .timeline-copy { display: block; }
.timeline-title { color: #343944; font-size: var(--type-body-size, 14px); line-height: 24px; font-weight: 600; }
.timeline-copy { color: #9196a0; font-size: var(--type-caption-size, 12px); line-height: 20px; }
.status-actions { display: flex; flex-direction: column; gap: 10px; padding: 0 24px 24px; }
.status-action { width: 100%; min-height: 46px; margin: 0; padding: 12px 16px; color: $color-gray-0; background: $color-action-primary; border: 0; border-radius: 12px; font-size: 14px; line-height: 20px; }
.status-action::after { border: 0; }
.status-action.secondary { color: $color-text-secondary; background: $color-gray-100; }
.progress-card,
.form-card {
  background: var(--glass-card-background, rgba(255,255,255,.74));
  border-radius: $radius-card;
  box-shadow: var(--glass-card-shadow, 0 10px 28px rgba(55,65,80,.07));
  -webkit-backdrop-filter: blur(16px);
  backdrop-filter: blur(16px);
}

.progress-card {
  min-height: 152rpx;
  padding: $space-4 $space-6;
  display: flex;
  align-items: center;
  justify-content: center;
}

.progress-step {
  min-width: 128rpx;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: $space-2;
  color: $color-text-disabled;

  &.active {
    color: $color-action-primary;
  }
}

.step-dot {
  width: 48rpx;
  height: 48rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 2rpx solid $color-gray-300;
  border-radius: 50%;
  background: $color-bg-card;
  font-size: $font-size-caption;
  font-weight: $font-weight-semibold;
}

.progress-step.active .step-dot {
  color: $color-gray-0;
  border-color: $color-action-primary;
  background: $color-action-primary;
}

.step-name {
  font-size: $font-size-caption;
  line-height: $line-height-caption;
}

.progress-line {
  width: 160rpx;
  height: 2rpx;
  margin: 0 $space-2 52rpx;
  background: $color-gray-200;
}

.form-card {
  padding: $space-4;
}

.section-heading {
  padding-bottom: $space-4;
  margin-bottom: $space-5;
  display: flex;
  align-items: flex-start;
  gap: $space-3;
  border-bottom: 2rpx solid $color-gray-100;
}

.heading-accent {
  width: 6rpx;
  height: 36rpx;
  margin-top: 6rpx;
  flex-shrink: 0;
  background: $color-action-primary;
  border-radius: $radius-full;
}

.section-title,
.section-description {
  display: block;
}

.section-title {
  color: $color-text-primary;
  font-size: $font-size-h3;
  line-height: $line-height-h3;
  font-weight: $font-weight-semibold;
}

.section-description {
  margin-top: $space-1;
  color: $color-text-secondary;
  font-size: $font-size-caption;
  line-height: $line-height-caption;
}

.form-grid {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: $space-5;
}

.form-item {
  min-width: 0;
}

.field-label {
  display: block;
  margin-bottom: $space-2;
  color: $color-text-primary;
  font-size: $font-size-body-m;
  line-height: $line-height-body-m;
  font-weight: $font-weight-medium;
}

.required {
  margin-right: $space-1;
  color: $color-error;
}

.optional {
  color: $color-text-disabled;
  font-weight: $font-weight-regular;
}

.form-control,
.form-textarea {
  box-sizing: border-box;
  width: 100%;
  color: $color-text-primary;
  background: $color-bg-card;
  border: 2rpx solid $color-border-default;
  border-radius: $radius-control;
  font-size: $font-size-body-m;
  transition: border-color $duration-normal $easing-standard,
    box-shadow $duration-normal $easing-standard;

  &:focus {
    border-color: $color-action-primary;
    box-shadow: 0 0 0 4rpx rgba(215, 25, 45, 0.08);
  }

  &.error {
    border-color: $color-error;
  }
}

.form-control {
  height: $control-height;
  padding: 0 $space-3;
}

.form-textarea {
  min-height: 192rpx;
  padding: $space-3;
  line-height: $line-height-body-m;

  &.compact {
    min-height: 160rpx;
  }
}

.field-error {
  display: block;
  margin-top: $space-2;
  color: $color-error;
  font-size: $font-size-caption;
  line-height: $line-height-caption;
}

.agreement-block {
  padding: 0 $space-1;

  &.error {
    padding: $space-3;
    background: $color-error-bg;
    border-radius: $radius-control;
  }
}

.agreement-label {
  min-height: $touch-target-min;
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  color: $color-text-secondary;
  font-size: $font-size-body-m;
  line-height: $line-height-body-m;
}

.agreement-label checkbox {
  transform: scale(0.82);
  transform-origin: left center;
}

.agreement-link {
  color: $color-action-primary;
}

.agreement-error {
  margin-left: 56rpx;
}

.captcha-modal-mask {
  position: absolute;
  pointer-events: auto;
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
  gap: $space-1;
}

.captcha-modal__title {
  color: $color-text-primary;
  font-size: $font-size-h3;
  line-height: $line-height-h3;
  font-weight: $font-weight-bold;
}

.captcha-modal__description {
  color: $color-text-secondary;
  font-size: $font-size-caption;
  line-height: $line-height-caption;
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

.submit-footer {
  padding: $space-3 $page-padding-mobile;
  background: rgba(255, 255, 255, 0.98);
}

.submit-button {
  height: $control-height;
  margin: 0 auto;
  display: flex;
  align-items: center;
  justify-content: center;
  color: $color-gray-0;
  background: $color-action-primary;
  border: 0;
  border-radius: $radius-control;
  font-size: $font-size-body-l;
  font-weight: $font-weight-semibold;
  line-height: $control-height;

  &::after {
    border: 0;
  }

  &[disabled] {
    color: $color-gray-0;
    background: $color-brand-300;
    opacity: 1;
  }
}

.submit-button-hover {
  background: $color-action-primary-pressed;
}

@media (min-width: 768px) {
  .apply-page {
    padding-top: $space-4;
  }

  .form-card {
    padding: $space-5;
  }

  .form-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .form-item.full {
    grid-column: 1 / -1;
  }

  .submit-footer {
    padding-left: $page-padding-tablet;
    padding-right: $page-padding-tablet;
  }

  .submit-button {
    max-width: 720px;
  }
}
</style>
