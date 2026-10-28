<template>
  <view class="dynamic-home">
    <view v-for="component in roots" :key="component.homeComponentId" class="home-top-component">
      <view v-if="component.componentType === 0" class="home-combination" :class="'layout-' + component.config.layout"><HomeContentBlock v-for="child in children(component)" :key="child.homeComponentId" :component="child" :active="active" :section="sections[child.homeComponentId]" :can-purchase="home.canPurchase" @visible="$emit('visible',$event)" @target="$emit('target',$event)" @announcements="$emit('announcements')" @more="$emit('more',$event)" @detail="$emit('detail',$event)" @buy="$emit('buy',$event)" @retry="$emit('retry',$event)" /></view>
      <HomeContentBlock v-else :component="component" :active="active" :section="sections[component.homeComponentId]" :can-purchase="home.canPurchase" @visible="$emit('visible',$event)" @target="$emit('target',$event)" @announcements="$emit('announcements')" @more="$emit('more',$event)" @detail="$emit('detail',$event)" @buy="$emit('buy',$event)" @retry="$emit('retry',$event)" />
    </view>
  </view>
</template>
<script setup>
import { computed } from 'vue'
import HomeContentBlock from './HomeContentBlock.vue'
const props=defineProps({ home:{type:Object,required:true},sections:{type:Object,default:()=>({})},active:Boolean })
const emit=defineEmits(['target','announcements','more','detail','buy','retry','visible'])
const roots=computed(()=>props.home.components.filter(c=>!c.parentComponentId).sort((a,b)=>a.sortOrder-b.sortOrder))
/** 返回同一组合行的子内容。 */
function children(parent){return props.home.components.filter(c=>c.parentComponentId===parent.homeComponentId).sort((a,b)=>a.sortOrder-b.sortOrder)}
</script>
<style scoped>
.dynamic-home{width:100%;max-width:1450px;margin:0 auto;padding:20px 18px 32px;box-sizing:border-box}.home-top-component{margin-bottom:24px;min-width:0}.home-top-component:last-child{margin-bottom:0}.home-combination{display:grid;grid-template-columns:1fr;gap:18px;min-width:0}@media(min-width:768px){.dynamic-home{padding:24px 28px 40px}.home-top-component{margin-bottom:28px}.home-combination.layout-split{grid-template-columns:minmax(0,1.7fr) minmax(0,1fr)}.home-combination.layout-equal{grid-template-columns:repeat(2,minmax(0,1fr))}.home-combination.layout-full{grid-template-columns:1fr}}
</style>

