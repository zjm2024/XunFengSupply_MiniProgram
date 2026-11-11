<template>
  <AppPageShell>
    <template #header>
      <AppHeader :title="t('content.titles.about')" :show-back="true" />
    </template>

    <template #content>
      <AppContent width-mode="standard">
        <view class="content">
          <!-- 品牌信息 -->
          <view class="brand-card">
            <AppImage src="/static/images/logo.png" width="72px" height="72px" mode="aspectFit" radius="16px" />
            <view class="brand-copy">
              <text class="brand-name">薰风体育</text>
              <text class="brand-slogan">{{ t('content.about.slogan') }}</text>
              <view class="version-info">
                <text>{{ t('content.about.version') }}</text>
                <text class="version-value">{{ version }}</text>
              </view>
            </view>

          </view>

          <!-- 公司简介 -->
          <view class="info-card">
            <text class="card-title">{{ t('content.about.company') }}</text>
            <text class="card-text">
              薰风（XUNFENG）是专业的羽毛球运动品牌，致力于为全球羽毛球爱好者提供高品质的运动装备。公司成立于2008年，总部位于中国广州，拥有完整的研发、生产、销售体系。
            </text>
            <text class="card-text">
              经销商下单系统是我们为合作伙伴打造的专属采购平台，提供便捷的商品浏览、在线下单、订单跟踪等一站式服务。
            </text>
          </view>

          <!-- 联系方式 -->
          <view class="info-card">
            <text class="card-title">{{ t('content.about.contact') }}</text>

            <view class="contact-list">
              <view class="contact-item">
                <AppIcon name="map-pin" :size="20" />
                <view class="contact-detail">
                  <text class="contact-label">{{ t('content.about.address') }}</text>
                  <text class="contact-value">广州市番禺区南村镇万惠二路103号2栋209</text>
                </view>
              </view>

              <view class="contact-item">
                <AppIcon name="service" :size="20" />
                <view class="contact-detail">
                  <text class="contact-label">{{ t('content.about.hotline') }}</text>
                  <text class="contact-value">86-(20)38106798</text>
                </view>
              </view>


              <view class="contact-item">
                <AppIcon name="globe" :size="20" />
                <view class="contact-detail">
                  <text class="contact-label">{{ t('content.about.website') }}</text>
                  <text class="contact-value link" @click="openWebsite">www.kumpoo.com</text>
                </view>
              </view>
            </view>
          </view>

          <!-- 相关链接 -->
          <view class="link-card">
            <view
              v-for="link in links"
              :key="link.key"
              class="link-item"
              @click="openLink(link)"
            >
              <text class="link-name">{{ link.name }}</text>
              <AppIcon name="chevron-right" :size="16" color="#92969f" />
            </view>
          </view>

          <!-- 版权信息 -->
          <view class="copyright">
            <text class="copyright-text">© 2008-2026 薰风体育用品有限公司</text>
          </view>
        </view>
      </AppContent>
    </template>
  </AppPageShell>
</template>

<script setup>
import { t } from '@/shared/i18n/index.js'
import '@/subPackages/content/i18n/register.js'
import { computed } from 'vue'
import AppHeader from '@/shared/ui/AppHeader/AppHeader.vue'
import AppPageShell from '@/shared/ui/AppPageShell/AppPageShell.vue'
import AppContent from '@/shared/ui/AppContent/AppContent.vue'
import { navigator } from '@/app/navigation/navigator.js'
import { routes } from '@/app/config/routes.js'
import AppImage from '@/shared/ui/AppImage/AppImage.vue'
import AppIcon from '@/shared/ui/AppIcon/AppIcon.vue'
import { getAppVersionName } from '@/shared/utils/appVersion.js'

const version = getAppVersionName()

// 相关链接
const links = computed(() => [
  { key: 'user_agreement', name: t('content.about.agreement') },
  { key: 'privacy_policy', name: t('content.about.privacy') },
  { key: 'disclaimer', name: t('content.about.disclaimer') }
])

/** 保留现有网站目标与跨端打开方式。 */
function openWebsite() {
  // #ifdef H5
  window.open('https://www.kumpoo.com', '_blank')
  // #endif
  // #ifndef H5
  uni.showToast({ title: t('content.about.browserHint'), icon: 'none' })
  // #endif
}

function openLink(link) {
  switch (link.key) {
    case 'user_agreement':
      viewTerms()
      break
    case 'privacy_policy':
      viewPrivacy()
      break
    default:
      uni.showToast({ title: link.name, icon: 'none' })
  }
}

/** 保留隐私政策尚未开放的占位反馈。 */
function viewPrivacy() {
  // webview 页面暂未实现，显示暂未开放提示
  uni.showToast({ title: t('content.about.privacyUnavailable'), icon: 'none' })
}

function viewTerms() {
  // 跳转到协议页面（auth 分包）
  navigator.navigateTo(routes.auth.agreement())
}
</script>


<style lang="scss" scoped>
.content { display: grid; gap: 12px; padding-bottom: 20px; }
.brand-card, .info-card, .link-card {
  min-width: 0;
  background: var(--surface-card, #fff);
  border-radius: var(--radius-card, 14px);
}
.brand-card { display: flex; align-items: center; gap: 18px; padding: 24px 20px; }
.brand-copy { flex: 1; min-width: 0; display: grid; gap: 6px; }
.brand-name { font-size: var(--type-page-title-size, 20px); font-weight: 700; color: var(--type-title-color, #1b1c20); }
.brand-slogan, .version-info { font-size: var(--type-body-small-size, 13px); line-height: 1.5; color: var(--type-secondary-color, #62666f); }
.version-info { display: flex; gap: 8px; margin-top: 4px; }
.version-value { font-variant-numeric: tabular-nums; }
.info-card { padding: 18px 20px; }
.card-title { display: block; font-size: var(--type-card-title-size, 16px); font-weight: 600; color: var(--type-title-color, #1b1c20); margin-bottom: 12px; }
.card-text { display: block; font-size: var(--type-body-size, 14px); color: var(--type-secondary-color, #62666f); line-height: 1.8; }
.card-text + .card-text { margin-top: 10px; }
.contact-list { display: grid; gap: 16px; }
.contact-item { display: flex; align-items: flex-start; gap: 12px; }
.contact-item > .app-icon { margin-top: 3px; flex: none; }
.contact-detail { min-width: 0; flex: 1; display: grid; gap: 4px; }
.contact-label { font-size: var(--type-caption-size, 12px); line-height: 1.5; color: var(--type-tertiary-color, #92969f); }
.contact-value { display: block; font-size: var(--type-body-size, 14px); color: var(--type-title-color, #1b1c20); line-height: 1.6; overflow-wrap: anywhere; }
.contact-value.link { color: var(--color-brand, #d7192d); }
.link-card { padding: 0 20px; }
.link-item { display: flex; justify-content: space-between; align-items: center; gap: 12px; min-height: 50px; padding: 10px 0; box-sizing: border-box; }
.link-item + .link-item { border-top: 1px solid var(--divider-color, #eceef2); }
.link-name { font-size: var(--type-body-size, 14px); color: var(--type-title-color, #1b1c20); }
.link-item:active, .contact-value.link:active { opacity: .65; }
.copyright { padding: 12px 16px; text-align: center; }
.copyright-text { display: block; font-size: var(--type-caption-size, 12px); color: var(--type-tertiary-color, #92969f); line-height: 1.6; }
@media (max-width: 360px) {
  .brand-card { padding: 20px 16px; gap: 14px; }
  .info-card { padding: 16px; }
  .link-card { padding: 0 16px; }
}
</style>
