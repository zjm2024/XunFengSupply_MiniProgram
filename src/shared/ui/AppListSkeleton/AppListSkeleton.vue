<!-- 列表首次读取的公共占位；不发请求，不参与分页和数据提交。 -->
<template>
  <view class="app-list-skeleton" :class="{ 'is-compact': compact }" role="status" :aria-label="t('common.loading')">
    <view v-for="row in count" :key="row" class="list-skeleton-row" aria-hidden="true">
      <view class="list-skeleton-media skeleton-pulse" />
      <view class="list-skeleton-copy">
        <view class="list-skeleton-line list-skeleton-title skeleton-pulse" />
        <view class="list-skeleton-line list-skeleton-summary skeleton-pulse" />
        <view v-if="!compact" class="list-skeleton-line list-skeleton-meta skeleton-pulse" />
      </view>
    </view>
  </view>
</template>
<script setup>
import { t } from '@/shared/i18n/index.js'

defineProps({
  /** 固定少量占位，不能随整页数据量创建骨架。 */
  count: { type: Number, default: 3, validator: value => Number.isInteger(value) && value > 0 && value <= 8 },
  /** 局部分组用紧凑占位，不能占用页面级加载高度。 */
  compact: { type: Boolean, default: false },
})
</script>
<style scoped>
.app-list-skeleton { display: flex; flex-direction: column; gap: 12px; width: 100%; box-sizing: border-box; }
.list-skeleton-row { display: flex; align-items: center; gap: 14px; padding: 16px; border-radius: 14px; background: #fff; box-sizing: border-box; }
.list-skeleton-media { flex-shrink: 0; width: 64px; height: 64px; border-radius: 10px; background: #eef0f3; }
.list-skeleton-copy { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 10px; }
.list-skeleton-line { height: 12px; border-radius: 4px; background: #eef0f3; }
.list-skeleton-title { width: 68%; height: 15px; }
.list-skeleton-summary { width: 92%; }
.list-skeleton-meta { width: 36%; height: 10px; }
.skeleton-pulse { animation: list-skeleton-pulse 1.4s ease-in-out infinite; }
.is-compact { gap: 8px; }
.is-compact .list-skeleton-row { padding: 8px 0; gap: 10px; }
.is-compact .list-skeleton-media { width: 40px; height: 40px; border-radius: 6px; }
.is-compact .list-skeleton-title { height: 12px; }
.is-compact .list-skeleton-line { max-width: 320px; }
@keyframes list-skeleton-pulse { 0%, 100% { opacity: 1; } 50% { opacity: .5; } }
@media (prefers-reduced-motion: reduce) { .skeleton-pulse { animation: none; } }
</style>
