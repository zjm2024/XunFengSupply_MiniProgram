<template>
  <view class="home-content-block" :class="'block-type-' + component.componentType">
    <swiper v-if="component.componentType === 1 && items.length" class="home-banner" :indicator-dots="items.length > 1" :autoplay="active && items.length > 1" :interval="5000" circular indicator-active-color="#ffffff" indicator-color="rgba(255,255,255,.4)">
      <swiper-item v-for="item in items" :key="item.homeItemId"><view class="home-banner-item" @click="$emit('target', item)"><AppImage :src="item.imageUrl" width="100%" height="100%" mode="aspectFill" radius="0" /><view class="banner-copy"><text class="banner-brand">KUMPOO</text><text class="banner-title">{{ item.title }}</text><text v-if="item.subtitle" class="banner-subtitle">{{ item.subtitle }}</text></view></view></swiper-item>
    </swiper>
    <view v-else-if="component.componentType === 2" class="home-notices"><view class="home-block-heading"><text>{{ component.title }}</text><view v-if="component.config.showMore" @click="$emit('announcements')">{{ t('common.homePage.more') }} ›</view></view><view v-for="item in items" :key="item.announcementId" class="home-notice-line" @click="$emit('target', item)"><text>{{ item.title }}</text><AppIcon name="arrow-right" :size="14" /></view><text v-if="!items.length" class="home-inline-empty">{{ t('common.homePage.noAnnouncements') }}</text></view>
    <view v-else-if="component.componentType === 3 && items.length" class="home-quick-entries" :style="quickEntryStyle">
      <view v-for="item in items" :key="item.homeItemId" class="home-quick-entry" hover-class="entry--pressed" @click="$emit('target', item)">
        <view class="quick-icon">
          <AppImage
            v-if="item.imageUrl || !item.iconCode"
            :src="item.imageUrl"
            width="100%"
            height="100%"
            mode="aspectFit"
            :error-icon-size="26"
          />
          <AppIcon v-else :name="item.iconCode" :size="26" />
        </view>
        <text>{{ item.title }}</text>
      </view>
    </view>
    <view v-else-if="component.componentType === 4 && items.length" class="home-ad-list"><view v-for="item in items" :key="item.homeItemId" class="home-ad" @click="$emit('target', item)"><AppImage :src="item.imageUrl" width="100%" height="100%" mode="aspectFill" radius="0" /><view class="ad-copy"><text>{{ item.title }}</text><text v-if="item.subtitle" class="ad-subtitle">{{ item.subtitle }}</text></view></view></view>
    <view
      v-else-if="component.componentType === 5"
      class="home-product-floor"
      :style="{ '--floor-columns': component.config.columns }"
      :data-component-id="component.homeComponentId"
    >
      <view class="home-floor-heading">
        <text class="home-floor-title">{{ component.title }}</text>
        <button
          v-if="component.config.showMore"
          class="home-floor-more"
          hover-class="entry--pressed"
          @tap="$emit('more', component)"
        >
          <text>{{ t('common.homePage.more') }}</text>
          <AppIcon name="chevron-right" :size="14" />
        </button>
      </view>
      <view v-if="section?.state === 'ready' && section.items.length" class="home-product-grid">
        <HomeProductTile
          v-for="product in section.items"
          :key="product.productId"
          :product="product"
          :can-purchase="canPurchase"
          @detail="$emit('detail', $event)"
          @buy="$emit('buy', $event)"
        />
      </view>
      <view v-else-if="section?.state === 'ready'" class="home-floor-state">
        {{ t('common.homePage.emptyFloor') }}
      </view>
      <view v-else-if="section?.state === 'loading'" class="home-product-grid home-floor-skeleton">
        <view v-for="n in Math.max(2, Number(component.config.columns) || 4)" :key="n" class="home-floor-placeholder">
          <view class="home-floor-placeholder-image" />
          <view class="home-floor-placeholder-label" />
          <view class="home-floor-placeholder-price" />
        </view>
      </view>
      <view v-else class="home-floor-state" @click="$emit('retry', component.homeComponentId)">
        {{ section?.state === 'error' ? t('common.homePage.retry') : t('common.homePage.loadFloor') }}
        <AppIcon name="refresh" :size="16" />
      </view>
    </view>
  </view>
</template>
<script setup>
import { computed, getCurrentInstance, nextTick, onBeforeUnmount, watch } from 'vue'
import { quickEntryColumns } from '@/shared/utils/homeLayout.js'
import { t } from '@/shared/i18n/index.js'
import AppImage from '@/shared/ui/AppImage/AppImage.vue'
import AppIcon from '@/shared/ui/AppIcon/AppIcon.vue'
import HomeProductTile from '@/shared/ui/HomeProductTile/HomeProductTile.vue'
const props = defineProps({ component: { type: Object, required: true }, active: Boolean, section: Object, canPurchase: Boolean })
const emit=defineEmits(['target','announcements','more','detail','buy','retry','visible'])
const items = computed(() => props.component.items.filter(i => i.isEnabled !== false && i.itemRole !== 2))
const quickEntryStyle=computed(()=>({ '--entry-phone-columns':quickEntryColumns(items.value.length,4),'--entry-wide-columns':quickEntryColumns(items.value.length,6) }))
const instance=getCurrentInstance()
let observer,disposed=false
/** 在组件自身作用域观察楼层，兼容小程序自定义组件选择器边界。 */
async function observe(){observer?.disconnect();observer=null;if(!props.active||props.component.componentType!==5||disposed)return;await nextTick();if(disposed||!props.active)return;try{observer=uni.createIntersectionObserver(instance.proxy);observer.relativeToViewport({bottom:300}).observe('.home-product-floor',result=>{if(props.active&&result.intersectionRatio>0)emit('visible',props.component.homeComponentId)})}catch{observer?.disconnect();observer=null}}
watch(()=>[props.active,props.component.homeComponentId],observe,{immediate:true})
onBeforeUnmount(()=>{disposed=true;observer?.disconnect()})
</script>
<style lang="scss" scoped>
.home-content-block{min-width:0}.home-banner{height:200px;border-radius: var(--radius-card, 14px);overflow:hidden}.home-banner-item{height:100%;position:relative;background:#a44338}.banner-copy{position:absolute;left:20px;right:20px;top:23px;color:#fff;display:flex;flex-direction:column;gap:11px;text-shadow:0 1px 8px #0003;pointer-events:none}.banner-brand{font-size: var(--type-caption-size, 12px);letter-spacing:2px;opacity:.75}.banner-title{font-size: var(--type-heading-size, 24px);font-weight: var(--font-weight-bold, 700);line-height:1.4;max-width:85%;white-space:pre-line}.banner-subtitle{font-size: var(--type-caption-size, 12px);line-height:1.6}.home-notices{padding:15px;border-radius: var(--radius-control, 10px);background:var(--glass-card-background,#fff);height:100%;min-height:130px;box-sizing:border-box}.home-block-heading{display:flex;align-items:center;justify-content:space-between;gap:10px;margin-bottom:16px;font-size: var(--type-section-title-size, 18px);font-weight: var(--font-weight-semibold, 600);color:var(--color-text-primary,#2d3440)}.home-block-heading>view{font-size: var(--type-caption-size, 12px);font-weight: var(--font-weight-regular, 400);color:#959eab;padding:6px 0 6px 12px}.home-notice-line{display:flex;justify-content:space-between;align-items:center;gap:8px;padding:9px 0;color:#7f8997;font-size: var(--type-caption-size, 12px)}.home-notice-line text{white-space:nowrap;overflow:hidden;text-overflow:ellipsis;flex:1}.home-inline-empty{color:#a0a8b3;font-size: var(--type-caption-size, 12px);display:block;padding:13px 0}.home-ad-list{display:grid;gap:10px}.home-ad{height:105px;position:relative;overflow:hidden;border-radius: var(--radius-control, 10px);background:#eae4d6}.ad-copy{position:absolute;left:17px;right:17px;top:20px;display:flex;flex-direction:column;gap:8px;color:#937340;text-shadow:0 1px 5px #fff8;font-size: var(--type-section-title-size, 18px);font-weight: var(--font-weight-semibold, 600);pointer-events:none}.ad-subtitle{font-size: var(--type-caption-size, 12px);font-weight: var(--font-weight-regular, 400)}@media(min-width:768px){.home-banner{height:240px}.banner-title{font-size: var(--type-display-size, 28px)}.home-ad{height:115px}}


.home-product-floor {
  padding-top: 4px;
}

.home-floor-heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  min-height: 44px;
  margin-bottom: 6px;
}

.home-floor-title {
  min-width: 0;
  overflow-wrap: anywhere;
  color: var(--text-primary, #1b1c20);
  font-size: var(--type-page-title-size, 20px);
  font-weight: var(--font-weight-bold, 700);
  line-height: 1.3;
}

.home-floor-more {
  display: flex;
  flex: none;
  align-items: center;
  gap: 3px;
  min-height: 44px;
  margin: 0;
  padding: 0 0 0 10px;
  color: var(--text-secondary, #62666f);
  background: transparent;
  font-size: var(--type-body-small-size, 13px);
  line-height: 1.4;
}

.home-floor-more::after {
  border: 0;
}

.home-product-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
}

.home-floor-state {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 24px 12px;
  border-radius: var(--radius-card, 16px);
  color: var(--text-secondary, #62666f);
  background: var(--surface-card, #fff);
  font-size: var(--type-body-small-size, 13px);
  text-align: center;
}

.home-floor-placeholder {
  overflow: hidden;
  border-radius: var(--radius-card, 16px);
  background: var(--surface-card, #fff);
}

.home-floor-placeholder-image,
.home-floor-placeholder-label,
.home-floor-placeholder-price {
  background: var(--bg-subtle, #f4f5f8);
}

.home-floor-placeholder-image { aspect-ratio: 1 / 1; }
.home-floor-placeholder-label { width: 68%; height: 12px; margin: 18px auto 24px; border-radius: 6px; }
.home-floor-placeholder-price { width: 35%; height: 12px; margin: 0 auto 20px; border-radius: 6px; }

@media (max-width: 767px) {
  .home-floor-skeleton .home-floor-placeholder:nth-child(n + 3) { display: none; }
}

@media (min-width: 768px) {
  .home-product-grid {
    grid-template-columns: repeat(var(--floor-columns, 4), minmax(0, 1fr));
    gap: 14px;
  }
}

.home-quick-entries {
  --entry-columns: var(--entry-phone-columns);
  --quick-entry-icon-size: 44px;
  --app-image-background: transparent;
  display: flex;
  flex-wrap: wrap;
  gap: 16px 12px;
  padding: 14px 12px;
  background: var(--surface-card, #fff);
  border-radius: var(--radius-card, 14px);
}
.home-quick-entry {
  flex: 1 1 calc((100% - (var(--entry-columns) - 1) * 12px) / var(--entry-columns));
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  min-width: 0;
  text-align: center;
  font-size: 13px;
  line-height: 1.4;
  color: var(--text-primary, #252a34);
  overflow-wrap: anywhere;
}
.quick-icon {
  width: var(--quick-entry-icon-size);
  height: var(--quick-entry-icon-size);
  flex: none;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  border-radius: var(--radius-control, 10px);
  background: transparent;
  color: var(--text-tertiary, #9da1a8);
}
.entry--pressed { opacity: .6; }
@media (min-width: 480px) {
  .home-quick-entries {
    --quick-entry-icon-size: 50px;
  }
}
@media (min-width: 768px) {
  .home-quick-entries {
    --entry-columns: var(--entry-wide-columns);
    --quick-entry-icon-size: 56px;
    padding: 16px;
  }
  .home-quick-entry { font-size: 14px; }
}
</style>

