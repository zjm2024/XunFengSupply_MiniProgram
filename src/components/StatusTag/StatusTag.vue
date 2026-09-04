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
  padding: 6rpx 16rpx;
  border-radius: 12rpx;
  font-size: 24rpx;
  font-weight: 600;
  line-height: 1;
}

.tag-text {
  white-space: nowrap;
}

/* 默认 - 灰色 */
.tag-default {
  color: #5E626B;
  background: #F7F7F8;
}

/* 成功 */
.tag-success {
  color: #168A52;
  background: #EAF7F0;
}

/* 警告 */
.tag-warning {
  color: #B76500;
  background: #FFF4E5;
}

/* 错误 */
.tag-error {
  color: #B42318;
  background: #FDECEA;
}

/* 信息 */
.tag-info {
  color: #246BCE;
  background: #EAF2FF;
}
</style>
