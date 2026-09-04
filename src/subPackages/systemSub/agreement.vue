<!--
  用户协议/隐私政策页面（分包：systemSub）
  用于展示各类协议内容
-->
<template>
  <AppPageShell>
    <template #header>
      <AppHeader :title="pageTitle" :show-back="true" />
    </template>
    <template #content>
      <AppContent>
        <view class="agreement-page">
          <view class="content">
            <rich-text :nodes="content" />
          </view>
        </view>
      </AppContent>
    </template>
  </AppPageShell>
</template>

<script setup>
import { ref } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import AppPageShell from '@/components/AppPageShell/AppPageShell.vue'
import AppHeader from '@/components/AppHeader/AppHeader.vue'
import AppContent from '@/components/AppContent/AppContent.vue'

const content = ref('')
const pageTitle = ref('用户协议')

onLoad((options) => {
  const type = options?.type || 'user'
  
  // 根据类型加载不同协议内容
  switch (type) {
    case 'user':
      pageTitle.value = '用户协议'
      content.value = getUserAgreementContent()
      break
    case 'privacy':
      pageTitle.value = '隐私政策'
      content.value = getPrivacyContent()
      break
    case 'sign':
      pageTitle.value = '经销商合作协议'
      content.value = getSignAgreementContent()
      break
    default:
      content.value = getUserAgreementContent()
  }
})

function getUserAgreementContent() {
  return `<div style="padding:30rpx; line-height:1.8; color:#333;">
    <h2 style="text-align:center; font-size:36rpx; margin-bottom:30rpx;">用户协议</h2>
    <p><strong>更新日期：</strong>2026年1月1日</p>
    <p><strong>生效日期：</strong>2026年1月1日</p>
    
    <h3 style="margin-top:40rpx; font-size:30rpx;">一、总则</h3>
    <p>1.1 本协议是您与薰风体育B2B采购平台（以下简称"本平台"）之间就使用本平台服务所订立的协议。</p>
    <p>1.2 您在使用本平台服务前，应当认真阅读本协议的全部内容，特别是免除或限制责任的条款。</p>
    
    <h3 style="margin-top:40rpx; font-size:30rpx;">二、账号注册与使用</h3>
    <p>2.1 您在注册时应当提供真实、准确、完整的信息。</p>
    <p>2.2 您应当妥善保管账号和密码，因保管不当导致的损失由您自行承担。</p>
    
    <h3 style="margin-top:40rpx; font-size:30rpx;">三、服务内容</h3>
    <p>3.1 本平台为经审核的经销商提供体育用品B2B采购服务。</p>
    <p>3.2 本平台保留随时调整、中止或终止服务的权利。</p>
    
    <h3 style="margin-top:40rpx; font-size:30rpx;">四、用户行为规范</h3>
    <p>4.1 您承诺不会利用本平台从事违法违规活动。</p>
    <p>4.2 您应当遵守商业道德，不得进行恶意竞争。</p>
    
    <h3 style="margin-top:40rpx; font-size:30rpx;">五、知识产权</h3>
    <p>5.1 本平台的所有内容，包括但不限于文字、图片、标识等，均受知识产权法保护。</p>
    
    <h3 style="margin-top:40rpx; font-size:30rpx;">六、免责声明</h3>
    <p>6.1 因不可抗力导致的服务中断，本平台不承担责任。</p>
    
    <h3 style="margin-top:40rpx; font-size:30rpx;">七、其他</h3>
    <p>7.1 本协议的解释权归薰风体育所有。</p>
  </div>`
}

function getPrivacyContent() {
  return `<div style="padding:30rpx; line-height:1.8; color:#333;">
    <h2 style="text-align:center; font-size:36rpx; margin-bottom:30rpx;">隐私政策</h2>
    <p><strong>更新日期：</strong>2026年1月1日</p>
    <p><strong>生效日期：</strong>2026年1月1日</p>
    
    <h3 style="margin-top:40rpx; font-size:30rpx;">引言</h3>
    <p>薰风体育B2B采购平台（以下简称"我们"）非常重视您的隐私保护。本隐私政策旨在向您说明我们如何收集、使用、存储和保护您的个人信息。</p>
    
    <h3 style="margin-top:40rpx; font-size:30rpx;">一、我们收集的信息</h3>
    <p>1.1 账号信息：手机号、姓名、门店名称等注册信息。</p>
    <p>1.2 资质信息：营业执照、身份证等签约资质材料。</p>
    <p>1.3 交易信息：订单记录、支付信息、收货地址等。</p>
    <p>1.4 设备信息：设备型号、操作系统版本等。</p>
    
    <h3 style="margin-top:40rpx; font-size:30rpx;">二、信息的使用</h3>
    <p>2.1 提供、维护和改进我们的服务。</p>
    <p>2.2 处理您的订单和支付。</p>
    <p>2.3 与您进行沟通。</p>
    <p>2.4 遵守法律法规要求。</p>
    
    <h3 style="margin-top:40rpx; font-size:30rpx;">三、信息的共享</h3>
    <p>3.1 除法律法规要求外，我们不会向第三方共享您的个人信息。</p>
    
    <h3 style="margin-top:40rpx; font-size:30rpx;">四、信息的存储与保护</h3>
    <p>4.1 我们采用业界标准的安全措施保护您的信息。</p>
    <p>4.2 信息存储期限为实现处理目的所必要的最短期限。</p>
    
    <h3 style="margin-top:40rpx; font-size:30rpx;">五、您的权利</h3>
    <p>5.1 您有权访问、更正、删除您的个人信息。</p>
    <p>5.2 您有权撤回授权同意。</p>
    <p>5.3 您有权注销账号。</p>
  </div>`
}

function getSignAgreementContent() {
  return `<div style="padding:30rpx; line-height:1.8; color:#333;">
    <h2 style="text-align:center; font-size:36rpx; margin-bottom:30rpx;">薰风体育经销商合作协议</h2>
    <p><strong>甲方：</strong>薰风体育</p>
    <p><strong>乙方：</strong>__________________（经销商）</p>
    
    <h3 style="margin-top:40rpx; font-size:30rpx;">第一条 合作内容</h3>
    <p>1.1 甲方授权乙方作为____________地区经销商，销售甲方经营的体育用品。</p>
    <p>1.2 乙方应按照甲方规定的价格体系进行销售。</p>
    
    <h3 style="margin-top:40rpx; font-size:30rpx;">第二条 订货与供货</h3>
    <p>2.1 乙方通过甲方B2B采购平台下单订货。</p>
    <p>2.2 甲方收到订单后确认库存并安排发货。</p>
    
    <h3 style="margin-top:40rpx; font-size:30rpx;">第三条 结算方式</h3>
    <p>3.1 双方约定结算周期为月结。</p>
    <p>3.2 乙方可申请授信额度，具体额度由甲方根据乙方资质评定。</p>
    
    <h3 style="margin-top:40rpx; font-size:30rpx;">第四条 双方权利义务</h3>
    <p>4.1 甲方保证所供商品质量符合国家标准。</p>
    <p>4.2 乙方保证合法经营，维护甲方品牌形象。</p>
    
    <h3 style="margin-top:40rpx; font-size:30rpx;">第五条 协议终止</h3>
    <p>5.1 协议有效期为一年，期满前30天可协商续签。</p>
    <p>5.2 任何一方违约，另一方有权终止协议。</p>
  </div>`
}
</script>

<style lang="scss" scoped>
.agreement-page {
  min-height: 100%;
  background: #fff;
  
  .content {
    padding-bottom: 60rpx;
  }
}
</style>
