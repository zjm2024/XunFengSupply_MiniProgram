<template>
  <view class="account-tab tab-page">
    <view class="profile-card">
      <view class="profile-main">
        <view class="avatar-wrap">
          <image v-if="userStore.avatarUrl" class="avatar-image" :src="userStore.avatarUrl" mode="aspectFill" />
          <text v-else class="avatar-text">{{ avatarText }}</text>
        </view>

        <view class="profile-copy">
          <view class="name-row">
            <text class="profile-name">{{ displayName }}</text>
            <text class="status-tag" :class="{ 'is-warning': !userStore.isAccountNormal }">
              {{ accountStatusText }}
            </text>
          </view>
          <text class="account-identity">{{ accountIdentity }}</text>
        </view>
      </view>

      <view class="profile-entry" hover-class="item--pressed" @click="openProfile">
        <view class="entry-label">
          <AppIcon name="account" :size="19" />
          <text>账户资料</text>
        </view>
        <AppIcon name="chevron-right" :size="17" />
      </view>
    </view>

    <view class="account-metrics">
      <view class="metric-item">
        <text class="metric-value">¥{{ availableCredit }}</text>
        <text class="metric-label">可用授信</text>
      </view>
      <view class="metric-divider" />
      <view class="metric-item">
        <text class="metric-value">{{ userStore.creditScore || 0 }}</text>
        <text class="metric-label">信誉分</text>
      </view>
      <view class="metric-divider" />
      <view class="metric-item">
        <text class="metric-value">{{ userStore.isMainAccount ? '主账号' : '子账号' }}</text>
        <text class="metric-label">账号类型</text>
      </view>
    </view>

    <view class="section-block">
      <view class="section-heading">
        <text class="section-title">常用服务</text>
        <text class="section-subtitle">采购与账户快捷入口</text>
      </view>

      <view class="quick-grid">
        <view
          v-for="item in quickServices"
          :key="item.label"
          class="quick-item"
          hover-class="item--pressed"
          @click="item.action"
        >
          <view class="quick-icon"><AppIcon :name="item.icon" :size="23" /></view>
          <text class="quick-label">{{ item.label }}</text>
        </view>
      </view>
    </view>

    <view class="service-list">
      <view
        v-for="item in accountServices"
        :key="item.label"
        class="service-item"
        hover-class="item--pressed"
        @click="item.action"
      >
        <view class="service-label">
          <AppIcon :name="item.icon" :size="20" />
          <text>{{ item.label }}</text>
        </view>
        <AppIcon class="service-arrow" name="chevron-right" :size="17" />
      </view>
    </view>
  </view>
</template>

<script setup>
import { computed } from 'vue'
import { navigator } from '@/app/navigation/navigator.js'
import { routes } from '@/app/config/routes.js'
import { useUserStore } from '@/shared/session/userStore.js'
import AppIcon from '@/shared/ui/AppIcon/AppIcon.vue'

defineProps({ active: { type: Boolean, default: false } })

const userStore = useUserStore()

const displayName = computed(() => userStore.displayName || userStore.realName || userStore.username || '经销商')
const avatarText = computed(() => displayName.value.trim().slice(0, 1) || '薰')
const accountStatusText = computed(() => userStore.isAccountNormal ? '账号正常' : '状态异常')
const accountIdentity = computed(() => {
  const accountType = userStore.isMainAccount ? '主账号' : '子账号'
  const accountCode = userStore.userId || userStore.username
  return accountCode ? `${accountType} · 客户编号 ${accountCode}` : accountType
})
const availableCredit = computed(() => formatMoney(Number(userStore.availableCreditLimit || 0) / 100))

const quickServices = Object.freeze([
  { label: '订单中心', icon: 'order', action: () => navigator.navigateTo(routes.order.list()) },
  { label: '发票中心', icon: 'invoice', action: () => navigator.navigateTo(routes.account.invoice()) },
  { label: '充值中心', icon: 'wallet', action: () => navigator.navigateTo(routes.account.recharge()) },
  { label: '对账账单', icon: 'receipt', action: () => navigator.navigateTo(routes.account.billList()) },
])

const accountServices = Object.freeze([
  { label: '资金流水', icon: 'history', action: () => navigator.navigateTo(routes.account.fundFlow()) },
  { label: '售后服务', icon: 'service', action: () => navigator.navigateTo(routes.order.afterSaleList()) },
])

function formatMoney(value) {
  return value.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function openProfile() {
  return navigator.navigateTo(routes.account.profile())
}
</script>

<style lang="scss" scoped>
.tab-page {
  width: 100%;
  max-width: 1180px;
  min-height: 100%;
  margin: 0 auto;
  padding: 18px 16px calc(80px + env(safe-area-inset-bottom));
  box-sizing: border-box;
}

.profile-card,
.account-metrics,
.section-block,
.service-list {
  border: 1px solid rgba(42, 44, 51, 0.06);
  background: rgba(255, 255, 255, 0.9);
}

.profile-card {
  overflow: hidden;
  padding: 20px 18px 0;
  border-radius: 22px;
}

.profile-main,
.name-row,
.profile-entry,
.entry-label,
.account-metrics,
.section-heading,
.service-item,
.service-label {
  display: flex;
  align-items: center;
}

.profile-main {
  gap: 14px;
}

.avatar-wrap {
  display: grid;
  place-items: center;
  width: 58px;
  height: 58px;
  flex: 0 0 58px;
  overflow: hidden;
  border-radius: 50%;
  color: #fff;
  background: var(--color-brand, #d7192d);
}

.avatar-image {
  width: 100%;
  height: 100%;
}

.avatar-text {
  font-size: 23px;
  font-weight: 760;
}

.profile-copy {
  min-width: 0;
  flex: 1;
}

.name-row {
  min-width: 0;
  gap: 8px;
}

.profile-name {
  overflow: hidden;
  color: #24262c;
  font-size: 19px;
  font-weight: 760;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.status-tag {
  flex-shrink: 0;
  padding: 3px 7px;
  border-radius: 8px;
  color: #26864a;
  font-size: 9px;
  font-weight: 650;
  background: #edf8f1;
}

.status-tag.is-warning {
  color: #ad6514;
  background: #fff5e8;
}

.account-identity {
  display: block;
  margin-top: 6px;
  overflow: hidden;
  color: #8a8d95;
  font-size: 11px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.profile-entry {
  min-height: 52px;
  margin-top: 16px;
  justify-content: space-between;
  border-top: 1px solid rgba(42, 44, 51, 0.07);
  color: #64676f;
}

.entry-label,
.service-label {
  gap: 11px;
}

.entry-label {
  font-size: 13px;
  font-weight: 620;
}

.account-metrics {
  min-height: 92px;
  margin-top: 14px;
  justify-content: space-around;
  border-radius: 20px;
}

.metric-item {
  display: flex;
  min-width: 0;
  flex: 1;
  align-items: center;
  flex-direction: column;
}

.metric-value {
  max-width: 100%;
  overflow: hidden;
  color: #292b31;
  font-size: 17px;
  font-weight: 760;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.metric-label {
  margin-top: 6px;
  color: #9699a1;
  font-size: 10px;
}

.metric-divider {
  width: 1px;
  height: 32px;
  background: rgba(42, 44, 51, 0.08);
}

.section-block {
  margin-top: 14px;
  padding: 18px;
  border-radius: 22px;
}

.section-heading {
  justify-content: space-between;
  gap: 12px;
}

.section-title {
  color: #292b31;
  font-size: 16px;
  font-weight: 740;
}

.section-subtitle {
  color: #a0a2a9;
  font-size: 10px;
}

.quick-grid {
  display: grid;
  margin-top: 17px;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 8px;
}

.quick-item {
  display: flex;
  min-width: 0;
  align-items: center;
  flex-direction: column;
  gap: 8px;
}

.quick-icon {
  display: grid;
  place-items: center;
  width: 44px;
  height: 44px;
  border-radius: 14px;
  color: var(--color-brand, #d7192d);
  background: rgba(215, 25, 45, 0.07);
}

.quick-label {
  color: #5d6068;
  font-size: 11px;
  text-align: center;
}

.service-list {
  margin-top: 14px;
  padding: 0 18px;
  border-radius: 22px;
}

.service-item {
  min-height: 54px;
  justify-content: space-between;
  border-bottom: 1px solid rgba(42, 44, 51, 0.06);
}

.service-item:last-child {
  border-bottom: 0;
}

.service-label {
  color: #51545c;
  font-size: 13px;
}

.service-label :deep(.app-icon) {
  color: #737780;
}

.service-arrow {
  color: #b0b2b8;
}

.item--pressed {
  opacity: 0.68;
}

/* 平板 / 中等屏幕 */
@media screen and (min-width: 800px) {
  .tab-page {
    padding: 18px 24px 24px;
  }

  .account-tab {
    display: grid;
    align-content: start;
    grid-template-columns: minmax(300px, 0.78fr) minmax(420px, 1.22fr);
    gap: 18px;
  }

  .profile-card,
  .account-metrics {
    grid-column: 1;
  }

  .section-block,
  .service-list {
    grid-column: 2;
  }

  .section-block {
    grid-row: 1 / span 2;
    margin-top: 0;
  }

  .service-list {
    margin-top: 0;
  }

  .quick-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 14px;
  }

  .quick-item {
    min-height: 92px;
    justify-content: center;
    border-radius: 16px;
    background: #f7f7f8;
  }
}

/* 大桌面屏幕 */
@media screen and (min-width: 1100px) {
  .tab-page {
    padding: 24px 32px 32px;
  }

  .account-tab {
    grid-template-columns: minmax(320px, 0.75fr) minmax(480px, 1.25fr);
    gap: 24px;
  }

  .profile-card {
    padding: 24px 22px 0;
  }

  .avatar-wrap {
    width: 64px;
    height: 64px;
    flex: 0 0 64px;
  }

  .avatar-text {
    font-size: 25px;
  }

  .profile-name {
    font-size: 21px;
  }

  .account-metrics {
    min-height: 100px;
  }

  .metric-value {
    font-size: 19px;
  }

  .section-block {
    padding: 22px;
  }

  .section-title {
    font-size: 18px;
  }

  .quick-icon {
    width: 48px;
    height: 48px;
  }

  .quick-label {
    font-size: 12px;
  }
}

/* 小屏幕手机 */
@media screen and (max-width: 374px) {
  .tab-page {
    padding: 14px 12px calc(70px + env(safe-area-inset-bottom));
  }

  .profile-card {
    padding: 16px 14px 0;
    border-radius: 18px;
  }

  .profile-main {
    gap: 12px;
  }

  .avatar-wrap {
    width: 48px;
    height: 48px;
    flex: 0 0 48px;
  }

  .avatar-text {
    font-size: 19px;
  }

  .profile-name {
    font-size: 16px;
  }

  .profile-entry {
    min-height: 46px;
    margin-top: 12px;
  }

  .account-metrics {
    min-height: 80px;
    margin-top: 12px;
  }

  .metric-value {
    font-size: 15px;
  }

  .metric-label {
    font-size: 9px;
  }

  .section-block {
    margin-top: 12px;
    padding: 14px;
    border-radius: 18px;
  }

  .section-title {
    font-size: 14px;
  }

  .quick-grid {
    margin-top: 14px;
    gap: 6px;
  }

  .quick-icon {
    width: 38px;
    height: 38px;
    border-radius: 12px;
  }

  .quick-label {
    font-size: 10px;
  }

  .service-list {
    margin-top: 12px;
    border-radius: 18px;
  }

  .service-item {
    min-height: 48px;
  }

  .service-label {
    font-size: 12px;
  }
}
</style>
