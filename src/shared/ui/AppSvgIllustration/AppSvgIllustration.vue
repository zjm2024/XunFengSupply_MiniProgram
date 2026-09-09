<template>
  <view class="app-svg-illustration" :class="`is-${size}`">
    <view
      v-if="backgroundImage"
      class="app-svg-illustration__image"
      :style="{ backgroundImage }"
    />
    <slot v-else />
  </view>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  svg: {
    type: String,
    default: '',
  },
  size: {
    type: String,
    default: 'md',
    validator: value => ['sm', 'md', 'lg'].includes(value),
  },
})

const normalizedSvg = computed(() => props.svg
  .replace(/<\?xml[\s\S]*?\?>/gi, '')
  .replace(/<!doctype[\s\S]*?>/gi, '')
  .trim())

const backgroundImage = computed(() => normalizedSvg.value
  ? `url("data:image/svg+xml;charset=UTF-8,${encodeURIComponent(normalizedSvg.value)}")`
  : '')
</script>

<style lang="scss">
.app-svg-illustration {
  display: flex;
  align-items: center;
  justify-content: center;
  flex: 0 0 auto;

  &.is-sm {
    width: 280rpx;
    height: 280rpx;
    max-width: 180px;
    max-height: 180px;
  }

  &.is-md {
    width: 360rpx;
    height: 360rpx;
    max-width: 232px;
    max-height: 232px;
  }

  &.is-lg {
    width: 420rpx;
    height: 420rpx;
    max-width: 272px;
    max-height: 272px;
  }

  &__image,
  > svg {
    display: block;
    width: 100%;
    height: 100%;
  }

  &__image {
    background-position: center;
    background-repeat: no-repeat;
    background-size: contain;
  }
}
</style>
