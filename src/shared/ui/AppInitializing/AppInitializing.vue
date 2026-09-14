<template>
  <view
    class="app-initializing"
    :class="{ 'is-fill': fill, 'is-compact': compact }"
    aria-live="polite"
    aria-busy="true"
  >
    <view class="initializing-visual" aria-hidden="true">
      <view class="visual-halo" />
      <AppSvgIllustration class="loading-illustration" :svg="loadingSvg" :size="compact ? 'sm' : 'md'" />
      <view class="visual-shadow" />
    </view>

    <view class="initializing-copy">
      <text class="initializing-title">{{ title }}</text>
      <view class="initializing-description">
        <text>{{ description }}</text>
        <view class="loading-dots" aria-hidden="true">
          <view v-for="index in 3" :key="index" class="loading-dot" :class="`dot-${index}`" />
        </view>
      </view>
    </view>

    <text v-if="showBrand" class="initializing-brand">薰风体育 · 经销商采购平台</text>
  </view>
</template>

<script setup>
import AppSvgIllustration from '../AppSvgIllustration/AppSvgIllustration.vue'
import loadingSvg from '../../assets/illustrations/loading.svg?raw'

defineProps({
  title: {
    type: String,
    default: '正在加载',
  },
  description: {
    type: String,
    default: '正在准备页面',
  },
  /** 填满父容器，适合路由首屏和 Tab 首次初始化。 */
  fill: {
    type: Boolean,
    default: false,
  },
  /** 紧凑模式，适合卡片或局部区域。 */
  compact: {
    type: Boolean,
    default: false,
  },
  showBrand: {
    type: Boolean,
    default: false,
  },
})
</script>

<style lang="scss" scoped>
.app-initializing {
  position: relative;
  display: flex;
  width: 100%;
  min-height: 360px;
  align-items: center;
  justify-content: center;
  flex-direction: column;
  overflow: hidden;
  color: var(--type-title-color, #1b1c20);
  background: transparent;
  box-sizing: border-box;
  opacity: 0;
  animation: initializing-reveal 180ms ease 120ms forwards;
}

.app-initializing.is-fill {
  min-height: 100%;
}

.app-initializing.is-compact {
  min-height: 280px;
}

.initializing-visual {
  position: relative;
  display: grid;
  width: min(54vw, 232px);
  height: min(54vw, 232px);
  place-items: center;
}

.is-compact .initializing-visual {
  width: min(45vw, 180px);
  height: min(45vw, 180px);
}

.visual-halo {
  position: absolute;
  inset: 18%;
  border-radius: 50%;
  background: radial-gradient(circle, rgba(215, 25, 45, 0.07) 0%, rgba(215, 25, 45, 0) 70%);
  animation: initializing-breathe 1.8s ease-in-out infinite;
}

.loading-illustration {
  position: relative;
  z-index: 1;
  filter: drop-shadow(0 12px 20px rgba(42, 48, 56, 0.06));
  animation: initializing-float 2.1s ease-in-out infinite;
}

.visual-shadow {
  position: absolute;
  z-index: 0;
  bottom: 12%;
  width: 42%;
  height: 10px;
  border-radius: 50%;
  background: rgba(35, 41, 49, 0.08);
  filter: blur(5px);
  animation: initializing-shadow 2.1s ease-in-out infinite;
}

.initializing-copy {
  display: flex;
  align-items: center;
  flex-direction: column;
  margin-top: -8px;
  text-align: center;
}

.initializing-title {
  color: var(--type-title-color, #1b1c20);
  font-size: var(--type-card-title-size, 16px);
  font-weight: var(--font-weight-semibold, 600);
  line-height: var(--type-card-title-line-height, 24px);
}

.initializing-description {
  display: flex;
  min-height: 20px;
  align-items: center;
  justify-content: center;
  margin-top: 7px;
  color: var(--type-secondary-color, #62666f);
  font-size: var(--type-body-small-size, 13px);
  line-height: var(--type-body-small-line-height, 20px);
}

.loading-dots {
  display: flex;
  width: 20px;
  align-items: center;
  gap: 3px;
  margin-left: 5px;
}

.loading-dot {
  width: 4px;
  height: 4px;
  border-radius: 50%;
  background: var(--primary-color, #d7192d);
  animation: loading-dot-wave 1.2s ease-in-out infinite;
}

.dot-2 { animation-delay: 140ms; }
.dot-3 { animation-delay: 280ms; }

.initializing-brand {
  position: absolute;
  right: 0;
  bottom: max(22px, env(safe-area-inset-bottom));
  left: 0;
  color: var(--type-muted-color, #969aa3);
  font-size: var(--type-micro-size, 11px);
  line-height: var(--type-micro-line-height, 16px);
  letter-spacing: 0.08em;
  text-align: center;
}

@keyframes initializing-reveal {
  to { opacity: 1; }
}

@keyframes initializing-float {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-7px); }
}

@keyframes initializing-shadow {
  0%, 100% { opacity: 0.75; transform: scaleX(1); }
  50% { opacity: 0.42; transform: scaleX(0.82); }
}

@keyframes initializing-breathe {
  0%, 100% { opacity: 0.7; transform: scale(0.9); }
  50% { opacity: 1; transform: scale(1.08); }
}

@keyframes loading-dot-wave {
  0%, 60%, 100% { opacity: 0.3; transform: translateY(0); }
  30% { opacity: 1; transform: translateY(-3px); }
}

@media screen and (min-width: 600px) {
  .app-initializing { min-height: 420px; }
  .app-initializing.is-compact { min-height: 340px; }
}

@media (prefers-reduced-motion: reduce) {
  .app-initializing,
  .visual-halo,
  .loading-illustration,
  .visual-shadow,
  .loading-dot {
    animation: none;
    opacity: 1;
  }
}
</style>
