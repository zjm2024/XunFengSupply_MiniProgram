﻿<template>
  <AppPageShell>
    <template #header>
      <app-header title="帮助中心" :show-back="true" />
    </template>

    <template #content>
      <AppContent>
        <view class="content">
          <!-- 搜索框 -->
          <view class="search-box">
            <text class="search-icon">🔍</text>
            <input
              class="search-input"
              v-model="keyword"
              placeholder="搜索帮助内容"
              placeholder-class="placeholder"
              @confirm="handleSearch"
            />
          </view>

          <!-- 常见问题分类 -->
          <view class="category-section">
            <text class="section-title">常见问题</text>

            <view class="category-grid">
              <view
                v-for="cat in categories"
                :key="cat.key"
                class="category-item"
                @click="openCategory(cat)"
              >
                <text class="cat-icon">{{ cat.icon }}</text>
                <text class="cat-name">{{ cat.name }}</text>
                <text class="cat-count">{{ cat.count }}篇</text>
              </view>
            </view>
          </view>

          <!-- 热门问题 -->
          <view class="hot-section">
            <view class="section-header">
              <text class="section-title">热门问题</text>
              <button class="more-btn" @click="viewAll">查看全部</button>
            </view>

            <view class="question-list">
              <view
                v-for="(item, index) in hotQuestions"
                :key="index"
                class="question-item"
                @click="viewQuestion(item)"
              >
                <view class="q-header">
                  <text class="q-title">{{ item.title }}</text>
                  <status-tag-new v-if="item.isHot" type="error" text="HOT" />
                </view>
                <text class="q-summary">{{ item.summary }}</text>
                <view class="q-footer">
                  <text class="q-views">{{ item.views }} 次浏览</text>
                  <text class="q-arrow">›</text>
                </view>
              </view>
            </view>
          </view>

          <!-- 联系客服 -->
          <view class="contact-section">
            <text class="section-title">联系我们</text>

            <view class="contact-card">
              <view class="contact-item" @click="callService">
                <text class="contact-icon">📞</text>
                <view class="contact-info">
                  <text class="contact-label">电话客服</text>
                  <text class="contact-value">400-888-8888</text>
                </view>
                <text class="contact-arrow">›</text>
              </view>

              <view class="contact-item" @click="onlineService">
                <text class="contact-icon">💬</text>
                <view class="contact-info">
                  <text class="contact-label">在线客服</text>
                  <text class="contact-value">工作日 9:00-18:00</text>
                </view>
                <text class="contact-arrow">›</text>
              </view>

              <view class="contact-item" @click="sendEmail">
                <text class="contact-icon">✉️</text>
                <view class="contact-info">
                  <text class="contact-label">邮件支持</text>
                  <text class="contact-value">support@xunfeng.com</text>
                </view>
                <text class="contact-arrow">›</text>
              </view>
            </view>
          </view>

          <!-- 使用指南入口 -->
          <view class="guide-section">
            <text class="section-title">使用指南</text>

            <view class="guide-list">
              <view
                v-for="guide in guides"
                :key="guide.id"
                class="guide-item"
                @click="openGuide(guide)"
              >
                <image class="guide-cover" :src="guide.cover" mode="aspectFill" />
                <view class="guide-info">
                  <text class="guide-name">{{ guide.name }}</text>
                  <text class="guide-desc">{{ guide.desc }}</text>
                </view>
                <text class="guide-arrow">›</text>
              </view>
            </view>
          </view>

          <view class="bottom-spacer"></view>
        </view>
      </AppContent>
    </template>
  </AppPageShell>
</template>

<script setup>
import { ref } from 'vue'
import appHeader from '@/shared/ui/AppHeader/AppHeader.vue'
import statusTagNew from '@/shared/ui/StatusTag/StatusTag.vue'
import AppPageShell from '@/shared/ui/AppPageShell/AppPageShell.vue'
import AppContent from '@/shared/ui/AppContent/AppContent.vue'
import { navigator } from '@/app/navigation/navigator.js'
import { routes } from '@/app/config/routes.js'

const keyword = ref('')

// 问题分类
const categories = ref([
  { key: 'order', name: '订单相关', icon: '📦', count: 12 },
  { key: 'payment', name: '支付问题', icon: '💰', count: 8 },
  { key: 'account', name: '账户管理', icon: '👤', count: 6 },
  { key: 'product', name: '商品咨询', icon: '🏸', count: 10 },
  { key: 'after_sale', name: '售后服务', icon: '🔄', count: 7 },
  { key: 'other', name: '其他问题', icon: '❓', count: 5 }
])

// 热门问题
const hotQuestions = ref([
  {
    id: '1',
    title: '如何下单购买商品？',
    summary: '详细介绍从浏览商品到完成下单的完整流程',
    views: 1520,
    isHot: true
  },
  {
    id: '2',
    title: '支付方式有哪些？',
    summary: '支持银行转账、在线支付等多种付款方式',
    views: 1280,
    isHot: true
  },
  {
    id: '3',
    title: '如何申请售后？',
    summary: '退货、换货、退款等售后服务的申请流程说明',
    views: 980,
    isHot: false
  },
  {
    id: '4',
    title: '发票如何开具？',
    summary: '增值税专用发票和普通发票的开具方法',
    views: 860,
    isHot: false
  }
])

// 使用指南
const guides = ref([
  {
    id: '1',
    name: '新手入门指南',
    desc: '快速了解系统功能和使用方法',
    cover: '/static/images/guide-1.png'
  },
  {
    id: '2',
    name: '下单操作手册',
    desc: '详细的下单步骤和注意事项',
    cover: '/static/images/guide-2.png'
  }
])

function handleSearch() {
  if (!keyword.value.trim()) {
    uni.showToast({ title: '请输入搜索关键词', icon: 'none' })
    return
  }
  uni.showToast({ title: `搜索：${keyword.value}`, icon: 'none' })
}

function openCategory(cat) {
  uni.showToast({ title: `打开：${cat.name}`, icon: 'none' })
}

function viewQuestion(item) {
  uni.showToast({ title: item.title, icon: 'none' })
}

function viewAll() {
  uni.showToast({ title: '查看全部问题', icon: 'none' })
}

function callService() {
  uni.makePhoneCall({ phoneNumber: '4008888888' })
}

function onlineService() {
  uni.showToast({ title: '正在连接在线客服...', icon: 'none' })
}

function sendEmail() {
  // #ifdef H5
  window.location.href = 'mailto:support@xunfeng.com'
  // #endif
  // #ifndef H5
  uni.setClipboardData({
    data: 'support@xunfeng.com',
    success: () => {
      uni.showToast({ title: '邮箱已复制', icon: 'success' })
    }
  })
  // #endif
}

function openGuide(guide) {
  navigator.navigateTo(routes.content.manualPreview(guide.id))
}
</script>

<style lang="scss" scoped>
.content {
  padding-bottom: env(safe-area-inset-bottom);
}

/* 搜索框 */
.search-box {
  display: flex;
  align-items: center;
  gap: 8px;
  background: white;
  border: 1px solid #EFEFF1; /* 稳定 px */
  border-radius: 10px;
  padding: 10px 14px;
  margin-bottom: 16px;
}

.search-icon {
  font-size: 16px;
}

.search-input {
  flex: 1;
  font-size: 14px;
  color: #111216;
}

.placeholder {
  color: #989BA5;
}

/* 分类区域 */
.category-section, .hot-section, .contact-section, .guide-section {
  margin-bottom: 16px;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 10px;
}

.section-title {
  font-size: 16px; /* 稳定 px */
  font-weight: 600;
  color: #111216;
  display: block;
  margin-bottom: 10px;

  .section-header & {
    margin-bottom: 0;
  }
}

.more-btn {
  background: transparent;
  border: none;
  color: #D7192D;
  font-size: 13px;

  &:active {
    opacity: 0.7;
  }
}

.category-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;
}

.category-item {
  background: white;
  border: 1px solid #EFEFF1;
  border-radius: 9px;
  padding: 14px 8px;
  text-align: center;

  &:active {
    border-color: #D7192D;
  }
}

.cat-icon {
  font-size: 24px;
  display: block;
  margin-bottom: 6px;
}

.cat-name {
  font-size: 13px;
  color: #111216;
  display: block;
  margin-bottom: 2px;
}

.cat-count {
  font-size: 11px;
  color: #989BA5;
  display: block;
}

/* 热门问题 */
.question-list {
  background: white;
  border: 1px solid #EFEFF1; /* 稳定 px */
  border-radius: 12px;
  overflow: hidden;
}

.question-item {
  padding: 14px;
  border-bottom: 1px solid #F5F5F6;

  &:last-child {
    border-bottom: none;
  }

  &:active {
    background: rgba(0, 0, 0, 0.02);
  }
}

.q-header {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 5px;
}

.q-title {
  font-size: 15px;
  font-weight: 500;
  color: #111216;
  flex: 1;
}

.q-summary {
  font-size: 13px;
  color: #5E626B;
  line-height: 1.5;
  display: block;
  margin-bottom: 6px;
}

.q-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.q-views {
  font-size: 12px;
  color: #989BA5;
}

.q-arrow {
  font-size: 16px;
  color: #989BA5;
}

/* 联系客服 */
.contact-card {
  background: white;
  border: 1px solid #EFEFF1; /* 稳定 px */
  border-radius: 12px;
  overflow: hidden;
}

.contact-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 14px;
  border-bottom: 1px solid #F5F5F6;

  &:last-child {
    border-bottom: none;
  }

  &:active {
    background: rgba(0, 0, 0, 0.02);
  }
}

.contact-icon {
  font-size: 20px;
}

.contact-info {
  flex: 1;
}

.contact-label {
  font-size: 14px;
  color: #111216;
  display: block;
}

.contact-value {
  font-size: 12px;
  color: #5E626B;
  display: block;
  margin-top: 2px;
}

.contact-arrow {
  font-size: 16px;
  color: #989BA5;
}

/* 使用指南 */
.guide-list {
  display: grid;
  gap: 8px;
}

.guide-item {
  display: flex;
  align-items: center;
  gap: 10px;
  background: white;
  border: 1px solid #EFEFF1;
  border-radius: 9px;
  padding: 10px;

  &:active {
    border-color: #D7192D;
  }
}

.guide-cover {
  width: 60px; /* 稳定 px */
  height: 45px;
  border-radius: 6px;
  object-fit: cover;
  background: #F5F5F6;
}

.guide-info {
  flex: 1;
}

.guide-name {
  font-size: 14px;
  font-weight: 500;
  color: #111216;
  display: block;
}

.guide-desc {
  font-size: 12px;
  color: #5E626B;
  display: block;
  margin-top: 2px;
}

.guide-arrow {
  font-size: 16px;
  color: #989BA5;
}

.bottom-spacer {
  height: 24px;
}
</style>
