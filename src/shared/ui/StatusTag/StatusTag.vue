<template>
  <view class="status-tag" :class="tagClass">
    <text class="tag-text">{{ text }}</text>
  </view>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  // 标签类型: success | warning | error | info | default
  type: {
    type: String,
    default: 'default'
  },
  // 标签文本
  text: {
    type: String,
    required: true
  }
})

const tagClass = computed(() => `tag-${props.type}`)
</script>

<style lang="scss" scoped>
.status-tag {
  display: inline-flex;
  align-items: center;
  min-height: 22px;
  padding: 2px 8px;
  border-radius: var(--radius-xs, 6px);
  font-size: var(--font-size-xs, 11px);
  font-weight: 600;
  line-height: 1;
}

.tag-text {
  white-space: nowrap;
}

/* 默认 - 灰色 */
.tag-default {
  color: var(--text-secondary, #62666F);
  background: var(--surface-page, #F4F5F8);
}

/* 成功 */
.tag-success {
  color: var(--success-color, #168A52);
  background: var(--success-light, #EAF7F0);
}

/* 警告 */
.tag-warning {
  color: var(--warning-color, #B76500);
  background: var(--warning-light, #FFF4E5);
}

/* 错误 */
.tag-error {
  color: var(--danger-color, #B42318);
  background: var(--danger-light, #FDECEA);
}

/* 信息 */
.tag-info {
  color: var(--info-color, #246BCE);
  background: var(--info-light, #EAF2FF);
}
</style>
