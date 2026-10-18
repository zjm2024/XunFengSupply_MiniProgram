<!--
  账号冻结提示页（分包：accountSub）
  对应业务流程节点：
  签约准入 → 账号冻结停用拦截页
  全局路由守卫 → 冻结账号强制跳转至此页面
-->
<template>
  <AppPageShell>
    <template #header>
      <AppStatusBarSpacer />
    </template>
    <template #content>
      <AppContent>
        <view class="frozen-page" :class="{ 'pending-page': isApplicationPending }">
          <view class="frozen-icon">
            <AppIcon :name="isApplicationPending ? 'shield-check' : 'lock'" size="120rpx" :color="isApplicationPending ? '#D7192D' : '#F56C6C'" :stroke-width="1.6" />
          </view>
          
          <text class="frozen-title">{{ isApplicationPending ? '申请审核中' : '账号已被冻结' }}</text>
          <text class="frozen-reason">{{ isApplicationPending ? '资料已提交，平台正在审核，请耐心等待审核结果。' : (frozenReason || '您的账号因违规操作已被暂时冻结') }}</text>
          
          <view v-if="isApplicationPending" class="frozen-tips pending-tips">
            <text class="tips-title">当前进度：</text>
            <text class="tips-item">✓ 申请资料已提交</text>
            <text class="tips-item">● 平台审核中</text>
            <text class="tips-item">审核完成后将开放对应账号权限</text>
          </view>
          <view v-else class="frozen-tips">
            <text class="tips-title">可能的原因：</text>
            <text class="tips-item">• 多次逾期未付款</text>
            <text class="tips-item">• 恶意拒收商品</text>
            <text class="tips-item">• 违反平台交易规则</text>
            <text class="tips-item">• 资质信息异常</text>
          </view>

          <view class="action-buttons">
            <button v-if="isApplicationPending" class="contact-btn" @click="goToApplication">查看申请进度</button>
            <button v-else class="contact-btn" @click="contactService">联系客服申诉</button>
            <button class="back-btn" @click="goBack">返回</button>
          </view>
        </view>
      </AppContent>
    </template>
  </AppPageShell>
</template>

<script setup>
import { ref } from 'vue'
import { getBootstrapContext } from '../../../../app/bootstrap/bootstrapApi.js'
import { onLoad } from '@dcloudio/uni-app'
import { useUserStore } from '@/shared/session/userStore.js'
import AppPageShell from '@/shared/ui/AppPageShell/AppPageShell.vue'
import AppContent from '@/shared/ui/AppContent/AppContent.vue'
import AppIcon from '@/shared/ui/AppIcon/AppIcon.vue'
import AppStatusBarSpacer from '../../../../shared/ui/AppStatusBarSpacer/AppStatusBarSpacer.vue'
import { navigator } from '@/app/navigation/navigator.js'
import { APPLY_SIGN, LOGIN } from '@/app/config/routes.js'

const userStore = useUserStore()
const frozenReason = ref('')
const isApplicationPending = ref(false)

onLoad(async (options) => {
  if (options.reason) {
    frozenReason.value = decodeURIComponent(options.reason)
  }
  await resolveAccountState()
})

async function resolveAccountState() {
  if (userStore.signStatus === 1) {
    isApplicationPending.value = true
    return
  }
  if (!userStore.isLogin) return

  try {
    const context = await getBootstrapContext({ authStrategy: 'passive', timeout: 8000 })
    userStore.setLoginData({
      token: userStore.token,
      refreshToken: userStore.refreshToken,
      expiresIn: userStore.tokenExpiresIn,
      userInfo: context,
    })
    isApplicationPending.value = Number(context?.signStatus) === 1
  } catch (error) {
    console.warn('[AccountStatus] 查询签约状态失败:', error)
  }
}

function goToApplication() {
  navigator.reLaunch(APPLY_SIGN)
}

/**
 * 联系客服申诉
 */
// TODO: 接入真实客服电话
function contactService() {
  uni.showModal({
    title: '联系客服',
    content: '请拨打经销商服务热线',
    showCancel: false
  })
}

/**
 * 返回上一页或退出
 */
function goBack() {
  // 清除登录态并返回登录页
  userStore.logout()
  navigator.reLaunch(LOGIN)
}
</script>

<style lang="scss" scoped>
.frozen-page {
  min-height: 100%;
  padding: 24px 16px 32px;
  box-sizing: border-box;
  background: var(--bg-color);
  display: flex;
  flex-direction: column;
  align-items: center;
  padding-top: 200rpx;
  
  .frozen-icon {
    margin-bottom: 40rpx;
  }
  
  .frozen-title {
    font-size: 20px;
    font-weight: 700;
    color: var(--text-primary);
    margin-bottom: 20rpx;
  }
  
  .frozen-reason {
    font-size: 14px;
    color: var(--text-secondary);
    max-width: 600rpx;
    text-align: center;
    line-height: 1.6;
    margin-bottom: 48rpx;
  }
  
  .frozen-tips {
    width: min(620rpx, 100%);
    box-sizing: border-box;
    background: rgba(255,247,247,.72);
    border-radius: 12rpx;
    padding: 28rpx 32rpx;
    margin-bottom: 60rpx;
    -webkit-backdrop-filter: blur(14px);
    backdrop-filter: blur(14px);
    
    .tips-title {
      display: block;
      font-size: 13px;
      color: var(--text-primary);
      font-weight: 600;
      margin-bottom: 16rpx;
    }
    
    .tips-item {
      display: block;
      font-size: 13px;
      color: var(--text-secondary);
      line-height: 2;
    }
  }
  
  .action-buttons {
    display: flex;
    gap: 24rpx;
    
    .contact-btn, .back-btn {
      width: 260rpx;
      height: 84rpx;
      line-height: 84rpx;
      border-radius: 42rpx;
      font-size: 15px;
      border: none;
    }
    
    .contact-btn {
      background: var(--primary-color);
      color: #fff;
    }
    
    .back-btn {
      background: var(--bg-color);
      color: var(--text-secondary);
    }
  }
}
</style>
