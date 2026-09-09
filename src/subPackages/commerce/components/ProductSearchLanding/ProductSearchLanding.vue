<template>
  <view class="search-landing">
    <view v-if="history.length" class="search-section">
      <view class="section-header">
        <text class="section-title">最近搜索</text>
        <view class="clear-history" hover-class="entry--pressed" @click="$emit('clear-history')">
          <AppIcon name="trash" :size="20" :stroke-width="1.8" />
        </view>
      </view>

      <view class="history-list">
        <view
          v-for="item in history"
          :key="item"
          class="history-chip"
          hover-class="entry--pressed"
          @click="$emit('search', item)"
        >
          <text>{{ item }}</text>
        </view>
      </view>
    </view>

    <view class="search-section recommendation-section">
      <view class="section-header">
        <text class="section-title">搜索推荐</text>
      </view>

      <view class="recommendation-grid">
        <view
          v-for="item in recommendations"
          :key="item"
          class="recommendation-item"
          hover-class="entry--pressed"
          @click="$emit('search', item)"
        >
          <AppIcon name="search" :size="18" :stroke-width="1.8" />
          <text>{{ item }}</text>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup>
import AppIcon from '../../../../shared/ui/AppIcon/AppIcon.vue'

defineProps({
  history: {
    type: Array,
    default: () => [],
  },
  recommendations: {
    type: Array,
    default: () => [],
  },
})

defineEmits(['search', 'clear-history'])
</script>

<style lang="scss" scoped>
.search-landing {
  width: 100%;
  padding: 18px 2px 40px;
  box-sizing: border-box;
}

.search-section + .search-section {
  margin-top: 30px;
}

.section-header {
  min-height: 36px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.section-title {
  color: #17191d;
  font-size: 19px;
  font-weight: 750;
  line-height: 28px;
}

.clear-history {
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #555a62;
}

.history-list {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin-top: 10px;
}

.history-chip {
  max-width: 220px;
  min-height: 36px;
  display: flex;
  align-items: center;
  padding: 0 15px;
  box-sizing: border-box;
  border-radius: 18px;
  color: #3c4047;
  font-size: 13px;
  background: #e9eaec;
}

.history-chip text,
.recommendation-item text {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.recommendation-grid {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  column-gap: 28px;
  margin-top: 8px;
}

.recommendation-item {
  min-width: 0;
  min-height: 54px;
  display: flex;
  align-items: center;
  gap: 12px;
  border-bottom: 1px solid rgba(42, 44, 51, .07);
  color: #30333a;
  font-size: 14px;
}

.recommendation-item :deep(.app-icon) {
  flex-shrink: 0;
  color: #555a62;
}

.entry--pressed {
  opacity: .58;
}

@media screen and (min-width: 600px) {
  .search-landing {
    padding: 24px 4px 48px;
  }

  .recommendation-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media screen and (min-width: 900px) {
  .search-landing {
    padding-top: 28px;
  }

  .search-section + .search-section {
    margin-top: 34px;
  }

  .section-title {
    font-size: 20px;
  }

  .recommendation-grid {
    grid-template-columns: repeat(3, minmax(0, 1fr));
    column-gap: 38px;
  }

  .recommendation-item {
    min-height: 62px;
    font-size: 15px;
  }
}
</style>
