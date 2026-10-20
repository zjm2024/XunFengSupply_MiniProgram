<!--
  经销商入驻资料提交页
  表单字段严格对应后端 ApplyRequest；行政区划通过 sys_area 接口级联选择。
-->
<template>
  <AppPageShell>
    <template #header>
      <AppHeader title="提交签约资料" :show-back="true" :show-shadow="true" />
    </template>

    <template #content>
      <AppContent :scroll-into-view="scrollTarget">
        <view class="apply-page">
          <view v-if="applicationState" class="application-status-card">
            <view class="application-status-badge" :class="`status-${applicationState.status}`">
              <AppIcon :name="applicationState.status === 'pending' ? 'shield-check' : 'lock'" :size="28" color="#D7192D" />
            </view>
            <text class="application-status-title">{{ applicationStatusTitle }}</text>
            <text class="application-status-description">{{ applicationStatusDescription }}</text>
            <view class="application-timeline">
              <view class="timeline-step active">
                <view class="timeline-dot">✓</view>
                <text>资料已提交</text>
              </view>
              <view class="timeline-line active"></view>
              <view class="timeline-step" :class="{ active: applicationState.status === 'approved', current: applicationState.status === 'pending' }">
                <view class="timeline-dot">{{ applicationState.status === 'approved' ? '✓' : '2' }}</view>
                <text>{{ applicationState.status === 'approved' ? '审核通过' : '平台审核' }}</text>
              </view>
            </view>
            <text v-if="applicationState.companyName" class="application-company">{{ applicationState.companyName }}</text>
            <button v-if="applicationState.status === 'rejected'" class="status-action" @tap="resetApplicationState">重新提交申请</button>
            <button v-else class="status-action secondary" @tap="leaveApplicationStatus">返回</button>
          </view>
          <template v-else>
          <view class="progress-card" aria-label="签约进度">
            <view class="progress-step active">
              <view class="step-dot">1</view>
              <text class="step-name">资料提交</text>
            </view>
            <view class="progress-line"></view>
            <view class="progress-step">
              <view class="step-dot">2</view>
              <text class="step-name">平台审核</text>
            </view>
          </view>

          <view class="form-card">
            <view class="section-heading">
              <view class="heading-accent"></view>
              <view>
                <text class="section-title">企业与联系人</text>
                <text class="section-description">请填写营业执照及负责人对应的真实信息</text>
              </view>
            </view>

            <view class="form-grid">
              <view id="field-companyName" class="form-item full">
                <text class="field-label"><text class="required">*</text>公司名称</text>
                <input
                  v-model="formData.companyName"
                  class="form-control"
                  :class="{ error: errors.companyName }"
                  maxlength="120"
                  placeholder="请输入营业执照上的公司名称"
                  :placeholder-style="placeholderStyle"
                  @input="clearFieldError('companyName')"
                  @blur="validateField('companyName')"
                />
                <text v-if="errors.companyName" class="field-error">{{ errors.companyName }}</text>
              </view>

              <view id="field-contactName" class="form-item">
                <text class="field-label"><text class="required">*</text>联系人姓名</text>
                <input
                  v-model="formData.contactName"
                  class="form-control"
                  :class="{ error: errors.contactName }"
                  maxlength="50"
                  placeholder="请输入联系人姓名"
                  :placeholder-style="placeholderStyle"
                  @input="clearFieldError('contactName')"
                  @blur="validateField('contactName')"
                />
                <text v-if="errors.contactName" class="field-error">{{ errors.contactName }}</text>
              </view>

              <view id="field-mobile" class="form-item">
                <text class="field-label"><text class="required">*</text>手机号码</text>
                <input
                  v-model="formData.mobile"
                  class="form-control"
                  :class="{ error: errors.mobile }"
                  type="number"
                  maxlength="11"
                  placeholder="请输入11位手机号码"
                  :placeholder-style="placeholderStyle"
                  @input="clearFieldError('mobile')"
                  @blur="validateField('mobile')"
                />
                <text v-if="errors.mobile" class="field-error">{{ errors.mobile }}</text>
              </view>

              <view id="field-landlinePhone" class="form-item">
                <text class="field-label"><text class="required">*</text>固定电话</text>
                <input
                  v-model="formData.landlinePhone"
                  class="form-control"
                  :class="{ error: errors.landlinePhone }"
                  maxlength="20"
                  placeholder="如：0571-88888888"
                  :placeholder-style="placeholderStyle"
                  @input="clearFieldError('landlinePhone')"
                  @blur="validateField('landlinePhone')"
                />
                <text v-if="errors.landlinePhone" class="field-error">{{ errors.landlinePhone }}</text>
              </view>

              <view id="field-taxNo" class="form-item">
                <text class="field-label">统一社会信用代码<text class="optional">（选填）</text></text>
                <input
                  v-model="formData.taxNo"
                  class="form-control"
                  :class="{ error: errors.taxNo }"
                  maxlength="32"
                  placeholder="请输入统一社会信用代码"
                  :placeholder-style="placeholderStyle"
                  @input="clearFieldError('taxNo')"
                  @blur="validateField('taxNo')"
                />
                <text v-if="errors.taxNo" class="field-error">{{ errors.taxNo }}</text>
              </view>

              <view id="field-email" class="form-item full">
                <text class="field-label">联系邮箱<text class="optional">（选填）</text></text>
                <input
                  v-model="formData.email"
                  class="form-control"
                  :class="{ error: errors.email }"
                  maxlength="100"
                  placeholder="用于接收入驻通知"
                  :placeholder-style="placeholderStyle"
                  @input="clearFieldError('email')"
                  @blur="validateField('email')"
                />
                <text v-if="errors.email" class="field-error">{{ errors.email }}</text>
              </view>
            </view>
          </view>

          <view class="form-card">
            <view class="section-heading">
              <view class="heading-accent"></view>
              <view>
                <text class="section-title">经营地址</text>
                <text class="section-description">省市区来自已启用的国标行政区划</text>
              </view>
            </view>

            <view class="form-grid">
              <view id="field-region" class="form-item full">
                <text class="field-label"><text class="required">*</text>所在地区</text>
                <AreaCascadePicker
                  v-model="regionValue"
                  :error="Boolean(errors.region)"
                  @open="regionPickerVisible = true"
                />
                <text v-if="errors.region" class="field-error">{{ errors.region }}</text>
              </view>

              <view id="field-addressDetail" class="form-item full">
                <text class="field-label"><text class="required">*</text>详细地址</text>
                <textarea
                  v-model="formData.addressDetail"
                  class="form-textarea"
                  :class="{ error: errors.addressDetail }"
                  maxlength="200"
                  placeholder="请输入街道、门牌号等详细地址"
                  :placeholder-style="placeholderStyle"
                  @input="clearFieldError('addressDetail')"
                  @blur="validateField('addressDetail')"
                />
                <text v-if="errors.addressDetail" class="field-error">{{ errors.addressDetail }}</text>
              </view>

              <view id="field-registeredAddress" class="form-item full">
                <text class="field-label">工商注册地址<text class="optional">（选填）</text></text>
                <textarea
                  v-model="formData.registeredAddress"
                  class="form-textarea compact"
                  :class="{ error: errors.registeredAddress }"
                  maxlength="200"
                  placeholder="与经营地址不同时填写"
                  :placeholder-style="placeholderStyle"
                  @input="clearFieldError('registeredAddress')"
                  @blur="validateField('registeredAddress')"
                />
                <text v-if="errors.registeredAddress" class="field-error">{{ errors.registeredAddress }}</text>
              </view>
            </view>
          </view>

          <view class="form-card">
            <view class="section-heading">
              <view class="heading-accent"></view>
              <view>
                <text class="section-title">营业执照</text>
                <text class="section-description">请上传清晰、完整且在有效期内的证照</text>
              </view>
            </view>

            <view id="field-licenseUrl" class="form-item">
              <text class="field-label"><text class="required">*</text>营业执照照片</text>
              <FileUploader
                v-model="licenseImages"
                scene="dealer-application-license"
                :maxCount="1"
                tips="支持相册或拍照上传，最多1张"
              />
              <text v-if="errors.licenseUrl" class="field-error">{{ errors.licenseUrl }}</text>
            </view>
          </view>

          <view id="field-agreed" class="agreement-block" :class="{ error: errors.agreed }">
            <checkbox-group @change="handleAgreementChange">
              <label class="agreement-label">
                <checkbox value="agreed" :checked="agreed" color="#D7192D" />
                <text class="agreement-text">我已阅读并同意</text>
                <text class="agreement-link" @tap.stop="openAgreement">《经销商签约协议》</text>
              </label>
            </checkbox-group>
            <text v-if="errors.agreed" class="field-error agreement-error">{{ errors.agreed }}</text>
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
              <text class="captcha-modal__title">安全验证</text>
              <text class="captcha-modal__description">提交申请前请完成图形验证</text>
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
            @image-error="handleCaptchaImageError"
          />
        </view>
      </view>
    </template>

    <template #footer>
      <view v-if="!applicationState" class="submit-footer">
        <button
          class="submit-button"
          :disabled="submitting"
          :loading="submitting"
          hover-class="submit-button-hover"
          @tap="handleSubmit"
        >
          {{ submitting ? '提交中...' : '提交审核' }}
        </button>
      </view>
    </template>
  </AppPageShell>
</template>

<script setup>
import { computed, nextTick, reactive, ref, watch } from 'vue'
import { onBackPress, onLoad, onUnload } from '@dcloudio/uni-app'
import { applySign, getApplicationCaptcha, getSignStatus, verifyApplicationCaptcha } from '../../api/auth.js'
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
const successTimer = ref(null)
const applicationState = ref(null)
const captchaLoading = ref(false)
const captchaVerifying = ref(false)
const captchaVerified = ref(false)
const captchaChallenge = ref(null)
const captchaToken = ref('')
const captchaError = ref('')
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
  return '资料已提交，平台正在审核。审核完成后会通过站内通知或联系方式告知你。'
})

async function loadApplicationState() {
  const cached = storage.get(APPLICATION_CACHE_KEY, null)
  if (cached?.status === 'pending') applicationState.value = cached
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

function resetApplicationState() {
  applicationState.value = null
  storage.remove(APPLICATION_CACHE_KEY)
}

function leaveApplicationStatus() {
  navigator.back()
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

function validateField(field) {
  const result = validateSignForm(validationData.value)
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
    throw new Error('图形验证码数据不完整，请点击刷新重试')
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
  if (errorCode === 'DEALER_LOGIN_CAPTCHA_TOO_FREQUENT') return '验证码刷新过快，请稍后再试'
  if (errorCode === 'DEALER_LOGIN_CAPTCHA_EXPIRED') return '验证码已过期，已为你更换，请重新验证'
  if (errorCode === 'DEALER_LOGIN_CAPTCHA_INVALID') return '拼图位置不正确，已为你更换，请重试'
  if (errorCode === 'DEALER_LOGIN_CAPTCHA_REQUIRED') return '请完成安全验证后提交'
  return error?.message || error?.msg || '验证码加载失败，请点击刷新重试'
}

/** 打开验证码弹层；过期或缺失时自动生成新的挑战。 */
async function openCaptchaModal() {
  const mobile = formData.mobile.trim()
  showCaptchaModal.value = true

  if (!mobile) {
    captchaError.value = '请先填写联系人手机号码'
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
    captchaError.value = '请先填写联系人手机号码'
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
  captchaError.value = '验证码图片加载失败，请点击刷新重试'
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
  try {
    const result = await verifyApplicationCaptcha(mobile, captchaId, offsetX)
    if (!result?.verificationToken) throw new Error('图形验证码校验结果无效')
    if (formData.mobile.trim() !== mobile) return

    captchaToken.value = result.verificationToken
    captchaTokenExpiresAt.value = Date.now() + Math.max(Number(result.expiresIn) || 0, 1) * 1000
    captchaVerified.value = true
    showCaptchaModal.value = false
  } catch (error) {
    console.error('[ApplySign] 验证码校验失败:', error)
    captchaError.value = getCaptchaErrorMessage(error)
    shouldRefresh = ['DEALER_LOGIN_CAPTCHA_INVALID', 'DEALER_LOGIN_CAPTCHA_EXPIRED'].includes(error?.errorCode || '')
  } finally {
    captchaVerifying.value = false
  }

  if (shouldRefresh) await refreshCaptcha({ preserveError: true })
}
async function handleSubmit() {
  if (submitting.value) return

  const result = validateSignForm(validationData.value)
  replaceErrors(result.errors)

  if (!result.valid) {
    const firstField = Object.keys(result.errors)[0]
    scrollToError(firstField)
    uni.showToast({ title: result.firstError, icon: 'none' })
    return
  }

  if (!hasUsableCaptchaToken()) {
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
    })
    // 只有后端确认申请提交成功后，才清理本地申请草稿。
    storage.remove(APPLICATION_DRAFT_CACHE_KEY)
    storage.set(APPLICATION_CACHE_KEY, { applicationId, companyName: data.companyName.trim(), status: 'pending', submittedAt: Date.now() })

    uni.showToast({ title: '提交成功，等待审核', icon: 'success', duration: 1500 })
    successTimer.value = setTimeout(() => {
      navigator.reLaunch(routes.auth.applySign())
    }, 1500)
  } catch (error) {
    console.error('[ApplySign] 提交失败:', error)
    if (CAPTCHA_RECOVERABLE_ERRORS.has(error?.errorCode || '')) {
      resetCaptchaVerification()
      captchaError.value = getCaptchaErrorMessage(error)
      showCaptchaModal.value = true
      await refreshCaptcha({ preserveError: true })
      return
    }

    uni.showToast({
      title: error?.message || error?.msg || '提交失败，请稍后重试',
      icon: 'none',
    })  } finally {
    submitting.value = false
  }
}

onUnload(() => {
  if (successTimer.value) clearTimeout(successTimer.value)
})
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
  min-height: 520rpx;
  padding: $space-8 $space-6;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  background: var(--glass-card-background, rgba(255,255,255,.74));
  border-radius: $radius-card;
}
.application-status-badge { width: 88rpx; height: 88rpx; display: flex; align-items: center; justify-content: center; border-radius: 50%; background: $color-error-bg; }
.application-status-title { margin-top: $space-4; color: $color-text-primary; font-size: $font-size-h2; line-height: $line-height-h2; font-weight: $font-weight-semibold; }
.application-status-description { max-width: 620rpx; margin-top: $space-2; color: $color-text-secondary; font-size: $font-size-body-m; line-height: $line-height-body-m; }
.application-timeline { width: 100%; max-width: 620rpx; margin: $space-8 0 $space-5; display: flex; align-items: flex-start; justify-content: center; }
.timeline-step { min-width: 160rpx; display: flex; flex-direction: column; align-items: center; gap: $space-2; color: $color-text-disabled; font-size: $font-size-caption; }
.timeline-step.active, .timeline-step.current { color: $color-action-primary; }
.timeline-dot { width: 48rpx; height: 48rpx; display: flex; align-items: center; justify-content: center; border: 2rpx solid $color-gray-300; border-radius: 50%; background: $color-bg-card; }
.timeline-step.active .timeline-dot, .timeline-step.current .timeline-dot { color: $color-gray-0; border-color: $color-action-primary; background: $color-action-primary; }
.timeline-line { flex: 1; height: 2rpx; margin: 24rpx $space-2 0; background: $color-gray-200; }
.timeline-line.active { background: $color-action-primary; }
.application-company { color: $color-text-primary; font-size: $font-size-body-m; font-weight: $font-weight-semibold; }
.status-action { width: min(520rpx, 100%); margin-top: $space-6; display: flex; align-items: center; justify-content: center; color: $color-gray-0; background: $color-action-primary; border: 0; border-radius: $radius-control; font-size: $font-size-body-m; }
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
