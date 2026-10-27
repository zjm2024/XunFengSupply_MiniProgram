<template>
  <view class="password-control" :class="{ 'is-disabled': disabled }">
    <input :id="inputName" class="password-input" :value="modelValue" :type="visible ? 'text' : 'password'" :password="!visible" :disabled="disabled" :aria-label="label" :name="inputName" :maxlength="64" :placeholder="placeholder" autocomplete="off" text-content-type="none" autocapitalize="off" autocorrect="off" :spellcheck="false" data-lpignore="true" data-1p-ignore="true" confirm-type="done" @input="updateValue" @confirm="emit('confirm')" />
    <button class="password-eye" :disabled="disabled" :aria-label="(visible ? hideText : showText) + ' · ' + label" :aria-pressed="visible" @tap="visible = !visible">
      <AppIcon :name="visible ? 'eye-off' : 'eye'" :size="21" color="#747b86" />
    </button>
  </view>
</template>

<script setup>
import { getCurrentInstance, onMounted, ref } from 'vue'
import AppIcon from './AppIcon/AppIcon.vue'

const props = defineProps({ modelValue: { type: String, default: '' }, label: { type: String, required: true }, showText: { type: String, required: true }, hideText: { type: String, required: true }, placeholder: { type: String, default: '' }, disabled: { type: Boolean, default: false } })
const emit = defineEmits(['update:modelValue', 'confirm'])
const visible = ref(false)
const instance = getCurrentInstance()
// 每次重新打开创建新输入实例，避免复用登录表单字段身份。
const inputName = 'account-entry-' + instance.uid + '-' + Math.random().toString(36).slice(2, 10)

/** 只更新当前输入；显隐切换不提交或持久化密码。 */
function updateValue(event) {
  if (!props.disabled) emit('update:modelValue', String(event?.detail?.value ?? event?.target?.value ?? ''))
}

// #ifdef H5
/** UniApp 的自定义属性停留在包装层，H5 需把自动填充提示写到真实 input。 */
onMounted(() => {
  const input = instance.proxy.$el?.querySelector?.('input')
  if (!input) return
  for (const [name, value] of Object.entries({ autocomplete: 'off', name: inputName, autocorrect: 'off', autocapitalize: 'off', spellcheck: 'false', 'data-lpignore': 'true', 'data-1p-ignore': 'true', 'data-form-type': 'other' })) input.setAttribute(name, value)
})
// #endif
</script>

<style scoped>
.password-control { display: flex; width: 100%; min-width: 0; min-height: 48px; align-items: center; border: 1px solid #dfe2e7; border-radius: 11px; background: #fafbfc; box-sizing: border-box; overflow: hidden; }
.password-control:focus-within { border-color: #a1a7b0; background: #fff; }
.password-input { flex: 1; width: 0; min-width: 0; height: 48px; padding: 0 0 0 13px; border: 0; outline: 0; background: transparent; color: #24282f; font-size: 16px; }
.password-eye { display: flex; flex: 0 0 48px; width: 48px; min-height: 48px; align-items: center; justify-content: center; margin: 0; padding: 0; border: 0; border-radius: 0; background: transparent; }
.password-eye::after { border: 0; }
.password-eye:disabled { opacity: .45; }
.is-disabled { opacity: .65; }
</style>
