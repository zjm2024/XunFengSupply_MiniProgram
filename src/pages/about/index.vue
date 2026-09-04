<template>
  <AppPageShell>
    <template #header>
      <app-header title="关于我们" :show-back="true" />
    </template>

    <template #content>
      <AppContent>
        <view class="content">
          <!-- 品牌信息 -->
          <view class="brand-card">
            <view class="brand-logo">
              <text class="logo-text">薰风</text>
            </view>
            <text class="brand-name">薰风体育</text>
            <text class="brand-slogan">专业 · 品质 · 创新</text>

            <!-- 版本信息 -->
            <view class="version-info">
              <text class="version-label">当前版本</text>
              <text class="version-value">{{ version }}</text>
            </view>
          </view>

          <!-- 公司简介 -->
          <view class="info-card">
            <text class="card-title">公司简介</text>
            <text class="card-text">
              薰风（XUNFENG）是专业的羽毛球运动品牌，致力于为全球羽毛球爱好者提供高品质的运动装备。公司成立于2008年，总部位于中国广州，拥有完整的研发、生产、销售体系。
            </text>
            <text class="card-text">
              经销商下单系统是我们为合作伙伴打造的专属采购平台，提供便捷的商品浏览、在线下单、订单跟踪等一站式服务。
            </text>
          </view>

          <!-- 联系方式 -->
          <view class="info-card">
            <text class="card-title">联系方式</text>

            <view class="contact-list">
              <view class="contact-item">
                <text class="contact-icon">📍</text>
                <view class="contact-detail">
                  <text class="contact-label">公司地址</text>
                  <text class="contact-value">广东省广州市天河区体育西路XXX号</text>
                </view>
              </view>

              <view class="contact-item">
                <text class="contact-icon">📞</text>
                <view class="contact-detail">
                  <text class="contact-label">联系电话</text>
                  <text class="contact-value">400-888-8888</text>
                </view>
              </view>

              <view class="contact-item">
                <text class="contact-icon">✉️</text>
                <view class="contact-detail">
                  <text class="contact-label">电子邮箱</text>
                  <text class="contact-value">business@xunfeng.com</text>
                </view>
              </view>

              <view class="contact-item">
                <text class="contact-icon">🌐</text>
                <view class="contact-detail">
                  <text class="contact-label">官方网站</text>
                  <text class="contact-value link" @click="openWebsite">www.xunfeng.com</text>
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
              <text class="link-arrow">›</text>
            </view>
          </view>

          <!-- 法律信息 -->
          <view class="legal-section">
            <button class="legal-link" @click="viewPrivacy">隐私政策</button>
            <text class="divider">|</text>
            <button class="legal-link" @click="viewTerms">用户协议</button>
          </view>

          <!-- 版权信息 -->
          <view class="copyright">
            <text class="copyright-text">© 2008-2026 薰风体育用品有限公司</text>
            <text class="copyright-sub">All Rights Reserved</text>
          </view>

          <view class="bottom-spacer"></view>
        </view>
      </AppContent>
    </template>
  </AppPageShell>
</template>

<script setup>
import { ref } from 'vue'
import appHeader from '@/components/AppHeader/AppHeader.vue'
import AppPageShell from '@/components/AppPageShell/AppPageShell.vue'
import AppContent from '@/components/AppContent/AppContent.vue'

const version = ref('1.0.0')

// 相关链接
const links = ref([
  { key: 'user_agreement', name: '用户协议' },
  { key: 'privacy_policy', name: '隐私政策' },
  { key: 'disclaimer', name: '免责声明' }
])

function openWebsite() {
  // #ifdef H5
  window.open('https://www.xunfeng.com', '_blank')
  // #endif
  // #ifndef H5
  uni.showToast({ title: '请在浏览器中访问', icon: 'none' })
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

function viewPrivacy() {
  uni.navigateTo({
    url: '/pages/webview/index?title=隐私政策&url=https://www.xunfeng.com/privacy'
  })
}

function viewTerms() {
  uni.navigateTo({
    url: '/pages/webview/index?title=用户协议&url=https://www.xunfeng.com/terms'
  })
}
</script>

<style lang="scss" scoped>
.content {
  padding-bottom: env(safe-area-inset-bottom);
}

/* 品牌卡片 */
.brand-card {
  background: linear-gradient(135deg, #D7192D, #E8384F);
  border-radius: 12px;
  padding: 24px 16px;
  text-align: center;
  margin-bottom: 12px;
  color: white;
}

.brand-logo {
  width: 70px;
  height: 70px;
  background: rgba(255, 255, 255, 0.2);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto 10px;
}

.logo-text {
  font-size: 26px;
  font-weight: 800;
  letter-spacing: -2px;
}

.brand-name {
  font-size: 20px;
  font-weight: 700;
  display: block;
  margin-bottom: 4px;
}

.brand-slogan {
  font-size: 13px;
  opacity: 0.9;
  display: block;
  margin-bottom: 14px;
}

.version-info {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  background: rgba(255, 255, 255, 0.15);
  padding: 6px 14px;
  border-radius: 15px;
}

.version-label {
  font-size: 12px;
  opacity: 0.85;
}

.version-value {
  font-size: 13px;
  font-weight: 600;
}

/* 信息卡片 */
.info-card, .link-card {
  background: white;
  border: 1px solid #EFEFF1;
  border-radius: 12px;
  padding: 16px;
  margin-bottom: 12px;
}

.card-title {
  font-size: 15px;
  font-weight: 600;
  color: #111216;
  display: block;
  margin-bottom: 10px;
}

.card-text {
  font-size: 14px;
  color: #5E626B;
  line-height: 1.75;
  display: block;

  & + & {
    margin-top: 8px;
  }
}

/* 联系方式 */
.contact-list {
  display: grid;
  gap: 12px;
}

.contact-item {
  display: flex;
  gap: 8px;
  align-items: flex-start;
}

.contact-icon {
  font-size: 18px;
  margin-top: 2px;
}

.contact-detail {
  flex: 1;
}

.contact-label {
  font-size: 13px;
  color: #989BA5;
  display: block;
  margin-bottom: 2px;
}

.contact-value {
  font-size: 14px;
  color: #111216;
  line-height: 1.5;
  display: block;

  &.link {
    color: #D7192D;

    &:active {
      opacity: 0.7;
    }
  }
}

/* 链接列表 */
.link-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 0;
  border-bottom: 1px solid #F5F5F6;

  &:last-child {
    border-bottom: none;
  }

  &:active {
    opacity: 0.7;
  }
}

.link-name {
  font-size: 14px;
  color: #111216;
}

.link-arrow {
  font-size: 16px;
  color: #989BA5;
}

/* 法律信息 */
.legal-section {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 8px;
  padding: 12px 0;
}

.legal-link {
  background: transparent;
  border: none;
  color: #5E626B;
  font-size: 13px;

  &:active {
    color: #D7192D;
  }
}

.divider {
  color: #DEDFE3;
  font-size: 13px;
}

/* 版权信息 */
.copyright {
  text-align: center;
  padding: 16px 0;
}

.copyright-text {
  font-size: 12px;
  color: #989BA5;
  display: block;
}

.copyright-sub {
  font-size: 11px;
  color: #C4C6CC;
  display: block;
  margin-top: 2px;
}

.bottom-spacer {
  height: 24px;
}
</style>
