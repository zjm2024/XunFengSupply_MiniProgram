<template>
  <view class="category-layout">
    <scroll-view class="primary-scroll" scroll-y :show-scrollbar="false">
      <view class="primary-list">
        <view v-if="includeAll" class="primary-item" :class="{ 'is-active': activeId === null }"
          role="button" :aria-label="allLabel" hover-class="primary-item--pressed" @click="emit('select', null)">
          <view class="primary-indicator" /><text>{{ allLabel }}</text>
        </view>
        <view v-for="category in categories" :key="String(category.id)" class="primary-item"
          :class="{ 'is-active': String(category.id) === String(activeId) }" role="button" :aria-label="category.name"
          hover-class="primary-item--pressed" @click="emit('select', category)">
          <view class="primary-indicator" /><text>{{ category.name }}</text>
        </view>
      </view>
    </scroll-view>
    <view class="category-content"><slot /></view>
  </view>
</template>
<script setup>
/** 分类浏览通用壳层：仅负责导航与响应式布局，不请求业务接口或读取会话。 */
defineProps({
  categories: { type: Array, default: () => [] },
  activeId: { type: [String, Number], default: null },
  includeAll: { type: Boolean, default: false },
  allLabel: { type: String, default: '全部分类' },
})
const emit = defineEmits(['select'])
</script>
<style scoped>
.category-layout { display:flex; width:100%; min-height:0; flex:1; overflow:hidden; border-radius:20px; background:rgba(242,243,244,.62); -webkit-backdrop-filter:blur(12px); backdrop-filter:blur(12px); }
.primary-scroll { width:92px; height:100%; flex:0 0 92px; }
.primary-list { padding:7px 0 35px; }
.primary-item { position:relative; display:flex; min-height:54px; padding:7px 11px; align-items:center; justify-content:center; box-sizing:border-box; color:#696d75; font-size:12px; line-height:1.35; text-align:center; overflow-wrap:anywhere; }
.primary-item.is-active { color:#202228; font-weight:720; }
.primary-indicator { position:absolute; top:50%; left:0; width:3px; height:18px; border-radius:0 3px 3px 0; background:transparent; transform:translateY(-50%); }
.primary-item.is-active .primary-indicator { background:var(--color-brand,#d7192d); }
.primary-item--pressed { opacity:.66; }
.category-content { display:flex; min-width:0; height:100%; flex:1; flex-direction:column; }
@media screen and (max-width:360px) { .primary-scroll { width:82px; flex-basis:82px; } }
@media screen and (min-width:600px) { .primary-scroll { width:124px; flex-basis:124px; } .primary-item { min-height:58px; padding-right:15px; padding-left:15px; font-size:13px; } }
@media screen and (min-width:821px) { .category-layout { border-radius:24px; } .primary-scroll { width:150px; flex-basis:150px; } .primary-item { min-height:62px; font-size:14px; } }
</style>
