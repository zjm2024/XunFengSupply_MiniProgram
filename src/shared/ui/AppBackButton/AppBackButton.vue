<template>
  <view
    class="app-back-button"
    :class="[
      `theme-${theme}`,
      { 'is-transparent': transparent },
    ]"
    hover-class="app-back-button--pressed"
    :hover-start-time="0"
    :hover-stay-time="80"
    @tap="$emit('click')"
  >
    <AppIcon name="chevron-left" :size="24" :stroke-width="2.2" />
  </view>
</template>

<script setup>
import AppIcon from '../AppIcon/AppIcon.vue'

defineProps({
  transparent: {
    type: Boolean,
    default: false,
  },
  theme: {
    type: String,
    default: 'dark',
    validator: value => ['dark', 'light'].includes(value),
  },
})

defineEmits(['click'])
</script>

<style lang="scss" scoped>
.app-back-button {
  width: 44px;
  height: 44px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  box-sizing: border-box;
  border: 1px solid transparent;
  border-radius: 50%;
  color: #22252a;
  background: #e7e8eb;
  transition: opacity .16s ease, transform .16s ease, background-color .16s ease;
}

.app-back-button.is-transparent {
  border-color: rgba(255, 255, 255, .72);
  background: rgba(255, 255, 255, .84);
  -webkit-backdrop-filter: blur(12px);
  backdrop-filter: blur(12px);
}

.app-back-button.theme-light {
  border-color: rgba(255, 255, 255, .38);
  color: #fff;
  background: rgba(22, 24, 29, .26);
}

.app-back-button--pressed {
  opacity: .68;
  transform: scale(.95);
}
</style>
