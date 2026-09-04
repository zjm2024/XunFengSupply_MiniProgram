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
                  @confirm="handleRegionConfirm"
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
              <UploadFile
                v-model="licenseImages"
                scene="dealer-application-license"
                :max-count="1"
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
        </view>
      </AppContent>
    </template>

    <template #footer>
      <view class="submit-footer">
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
import { onUnload } from '@dcloudio/uni-app'
import { applySign } from '@/api/auth.js'
import { validateSignForm } from '@/utils/validate.js'
import { safeNavigateBack } from '@/utils/routeGuard.js'
import AppHeader from '@/components/AppHeader/AppHeader.vue'
import AppPageShell from '@/components/AppPageShell/AppPageShell.vue'
import AppContent from '@/components/AppContent/AppContent.vue'
import AreaCascadePicker from '@/components/AreaCascadePicker/AreaCascadePicker.vue'
import UploadFile from '@/components/upload-file/upload-file.vue'

const placeholderStyle = 'color: #989BA3; font-size: 14px;'
const submitting = ref(false)
const agreed = ref(false)
const scrollTarget = ref('')
const licenseImages = ref([])
const successTimer = ref(null)

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

watch(licenseImages, () => clearFieldError('licenseUrl'), { deep: true })

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
  uni.navigateTo({ url: '/subPackages/systemSub/agreement' })
}

function scrollToError(field) {
  scrollTarget.value = ''
  nextTick(() => {
    scrollTarget.value = 'field-' + field
  })
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

  submitting.value = true
  try {
    const data = validationData.value
    await applySign({
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
    })

    uni.showToast({ title: '提交成功，等待审核', icon: 'success', duration: 1500 })
    successTimer.value = setTimeout(() => safeNavigateBack(), 1500)
  } catch (error) {
    console.error('[ApplySign] 提交失败:', error)
    uni.showToast({
      title: error?.message || error?.msg || '提交失败，请稍后重试',
      icon: 'none',
    })
  } finally {
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

.progress-card,
.form-card {
  background: $color-bg-card;
  border: 2rpx solid $color-gray-100;
  border-radius: $radius-card;
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
