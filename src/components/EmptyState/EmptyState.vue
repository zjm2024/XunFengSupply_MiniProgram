<!--
  ⚠️ [DEPRECATED] 此组件已废弃！

  旧版空状态组件（使用 Emoji 图标）
  替代者：components/AppPageState/AppPageState.vue（统一页面状态容器）

  废弃原因：
  - 使用 Emoji 作为正式图标，违反 Design System 规范
  - 功能已被 AppPageState 完全覆盖（empty/error/offline/loading）
  - AppPageState 使用纯 CSS 线性图标，更专业

  当前状态：DEPRECATED — 所有引用应迁移到 AppPageState
  计划删除版本：阶段2确认无引用后
-->
<template>
  <view class="empty-state">
    <!-- 空状态图标 -->
    <view class="empty-icon">
      <text class="icon-text">{{ iconText }}</text>
    </view>
    
    <!-- 标题 -->
    <text class="empty-title">{{ title }}</text>
    
    <!-- 描述 -->
    <text v-if="description" class="empty-desc">{{ description }}</text>
    
    <!-- 操作按钮 -->
    <view v-if="actionText" class="empty-action">
      <button class="action-btn" @click="handleAction">{{ actionText }}</button>
    </view>
  </view>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  // 标题
  title: {
    type: String,
    default: '暂无数据'
  },
  // 描述文字
  description: {
    type: String,
    default: ''
  },
  // 按钮文字
  actionText: {
    type: String,
    default: ''
  },
  // 图标类型: cart | order | news | search | default
  iconType: {
    type: String,
    default: 'default'
  }
})

const emit = defineEmits(['action'])

// 图标映射
const iconMap = {
  cart: '🛒',
  order: '📋',
  news: '📰',
  search: '🔍',
  default: '📭'
}

const iconText = computed(() => iconMap[props.iconType] || '📭')

function handleAction() {
  emit('action')
}
</script>

<script>
export default {
  options: { styleIsolation: 'shared' }
}
</script>

<style lang="scss" scoped>
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 96rpx 48rpx;
}

.empty-icon {
  width: 160rpx;
  height: 160rpx;
  margin-bottom: 32rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}

.icon-text {
  font-size: 80rpx;
  line-height: 1;
}

.empty-title {
  font-size: 34rpx;
  font-weight: 600;
  color: #26282D;
  margin-bottom: 12rpx;
  text-align: center;
}

.empty-desc {
  font-size: 28rpx;
  color: #989BA3;
  text-align: center;
  line-height: 1.6;
  margin-bottom: 40rpx;
}

.empty-action {
  width: 100%;
  max-width: 400rpx;
}

.action-btn {
  width: 100%;
  height: 88rpx;
  background: #D7192D;
  color: white;
  font-size: 30rpx;
  font-weight: 600;
  border: none;
  border-radius: 20rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  
  &:active {
    background: #B91224;
  }
}
</style>
