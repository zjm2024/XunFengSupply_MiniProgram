<template>
  <AppPageShell>
    <template #header><AppHeader :title="t(pageTitle)" :show-back="true" /></template>
    <template #content>
      <AppContent width-mode="standard" padding="12px var(--page-padding-x, 16px) 32px">
        <view class="agreement-document">
          <text class="document-title">{{ document.title }}</text>
          <view class="document-body">
            <text v-for="(block, index) in document.blocks" :key="index"
              class="document-block" :class="{ 'section-title': block.type === 'h3', 'document-meta': index < 2 }"
              selectable>{{ block.text }}</text>
          </view>
        </view>
      </AppContent>
    </template>
  </AppPageShell>
</template>

<script setup>
import { computed, ref } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import { t } from '@/shared/i18n/index.js'
import '@/subPackages/auth/i18n/register.js'
import AppPageShell from '@/shared/ui/AppPageShell/AppPageShell.vue'
import AppHeader from '@/shared/ui/AppHeader/AppHeader.vue'
import AppContent from '@/shared/ui/AppContent/AppContent.vue'

const documents = {
  "user": {
    "title": "用户协议",
    "blocks": [
      {
        "type": "p",
        "text": "更新日期：2026年1月1日"
      },
      {
        "type": "p",
        "text": "生效日期：2026年1月1日"
      },
      {
        "type": "h3",
        "text": "一、总则"
      },
      {
        "type": "p",
        "text": "1.1 本协议是您与薰风体育B2B采购平台（以下简称\"本平台\"）之间就使用本平台服务所订立的协议。"
      },
      {
        "type": "p",
        "text": "1.2 您在使用本平台服务前，应当认真阅读本协议的全部内容，特别是免除或限制责任的条款。"
      },
      {
        "type": "h3",
        "text": "二、账号注册与使用"
      },
      {
        "type": "p",
        "text": "2.1 您在注册时应当提供真实、准确、完整的信息。"
      },
      {
        "type": "p",
        "text": "2.2 您应当妥善保管账号和密码，因保管不当导致的损失由您自行承担。"
      },
      {
        "type": "h3",
        "text": "三、服务内容"
      },
      {
        "type": "p",
        "text": "3.1 本平台为经审核的经销商提供体育用品B2B采购服务。"
      },
      {
        "type": "p",
        "text": "3.2 本平台保留随时调整、中止或终止服务的权利。"
      },
      {
        "type": "h3",
        "text": "四、用户行为规范"
      },
      {
        "type": "p",
        "text": "4.1 您承诺不会利用本平台从事违法违规活动。"
      },
      {
        "type": "p",
        "text": "4.2 您应当遵守商业道德，不得进行恶意竞争。"
      },
      {
        "type": "h3",
        "text": "五、知识产权"
      },
      {
        "type": "p",
        "text": "5.1 本平台的所有内容，包括但不限于文字、图片、标识等，均受知识产权法保护。"
      },
      {
        "type": "h3",
        "text": "六、免责声明"
      },
      {
        "type": "p",
        "text": "6.1 因不可抗力导致的服务中断，本平台不承担责任。"
      },
      {
        "type": "h3",
        "text": "七、其他"
      },
      {
        "type": "p",
        "text": "7.1 本协议的解释权归薰风体育所有。"
      }
    ]
  },
  "privacy": {
    "title": "隐私政策",
    "blocks": [
      {
        "type": "p",
        "text": "更新日期：2026年1月1日"
      },
      {
        "type": "p",
        "text": "生效日期：2026年1月1日"
      },
      {
        "type": "h3",
        "text": "引言"
      },
      {
        "type": "p",
        "text": "薰风体育B2B采购平台（以下简称\"我们\"）非常重视您的隐私保护。本隐私政策旨在向您说明我们如何收集、使用、存储和保护您的个人信息。"
      },
      {
        "type": "h3",
        "text": "一、我们收集的信息"
      },
      {
        "type": "p",
        "text": "1.1 账号信息：手机号、姓名、门店名称等注册信息。"
      },
      {
        "type": "p",
        "text": "1.2 资质信息：营业执照、身份证等签约资质材料。"
      },
      {
        "type": "p",
        "text": "1.3 交易信息：订单记录、支付信息、收货地址等。"
      },
      {
        "type": "p",
        "text": "1.4 设备信息：设备型号、操作系统版本等。"
      },
      {
        "type": "h3",
        "text": "二、信息的使用"
      },
      {
        "type": "p",
        "text": "2.1 提供、维护和改进我们的服务。"
      },
      {
        "type": "p",
        "text": "2.2 处理您的订单和支付。"
      },
      {
        "type": "p",
        "text": "2.3 与您进行沟通。"
      },
      {
        "type": "p",
        "text": "2.4 遵守法律法规要求。"
      },
      {
        "type": "h3",
        "text": "三、信息的共享"
      },
      {
        "type": "p",
        "text": "3.1 除法律法规要求外，我们不会向第三方共享您的个人信息。"
      },
      {
        "type": "h3",
        "text": "四、信息的存储与保护"
      },
      {
        "type": "p",
        "text": "4.1 我们采用业界标准的安全措施保护您的信息。"
      },
      {
        "type": "p",
        "text": "4.2 信息存储期限为实现处理目的所必要的最短期限。"
      },
      {
        "type": "h3",
        "text": "五、您的权利"
      },
      {
        "type": "p",
        "text": "5.1 您有权访问、更正、删除您的个人信息。"
      },
      {
        "type": "p",
        "text": "5.2 您有权撤回授权同意。"
      },
      {
        "type": "p",
        "text": "5.3 您有权注销账号。"
      }
    ]
  },
  "sign": {
    "title": "薰风体育经销商合作协议",
    "blocks": [
      {
        "type": "p",
        "text": "甲方：薰风体育"
      },
      {
        "type": "p",
        "text": "乙方：__________________（经销商）"
      },
      {
        "type": "h3",
        "text": "第一条 合作内容"
      },
      {
        "type": "p",
        "text": "1.1 甲方授权乙方作为____________地区经销商，销售甲方经营的体育用品。"
      },
      {
        "type": "p",
        "text": "1.2 乙方应按照甲方规定的价格体系进行销售。"
      },
      {
        "type": "h3",
        "text": "第二条 订货与供货"
      },
      {
        "type": "p",
        "text": "2.1 乙方通过甲方B2B采购平台下单订货。"
      },
      {
        "type": "p",
        "text": "2.2 甲方收到订单后确认库存并安排发货。"
      },
      {
        "type": "h3",
        "text": "第三条 结算方式"
      },
      {
        "type": "p",
        "text": "3.1 双方约定结算周期为月结。"
      },
      {
        "type": "p",
        "text": "3.2 乙方可申请授信额度，具体额度由甲方根据乙方资质评定。"
      },
      {
        "type": "h3",
        "text": "第四条 双方权利义务"
      },
      {
        "type": "p",
        "text": "4.1 甲方保证所供商品质量符合国家标准。"
      },
      {
        "type": "p",
        "text": "4.2 乙方保证合法经营，维护甲方品牌形象。"
      },
      {
        "type": "h3",
        "text": "第五条 协议终止"
      },
      {
        "type": "p",
        "text": "5.1 协议有效期为一年，期满前30天可协商续签。"
      },
      {
        "type": "p",
        "text": "5.2 任何一方违约，另一方有权终止协议。"
      }
    ]
  }
}
const documentType = ref('user')
const document = computed(() => documents[documentType.value])
const pageTitle = computed(() => ({
  user: 'auth.titles.userAgreement', privacy: 'auth.titles.privacy', sign: 'auth.titles.signAgreement',
})[documentType.value])
onLoad(options => { documentType.value = Object.hasOwn(documents, options?.type) ? options.type : 'user' })
</script>

<style scoped lang="scss">
.agreement-document { max-width: 720px; margin: 0 auto; padding: 26px 20px 30px; border-radius: 16px; background: var(--surface-card, #fff); }
.document-title { display: block; margin-bottom: 18px; color: #22252B; font-size: 22px; font-weight: 700; line-height: 1.5; }
.document-block { display: block; margin-top: 12px; color: #50545D; font-size: 14px; line-height: 1.9; overflow-wrap: anywhere; text-align: left; }
.document-meta { margin-top: 3px; color: #969AA3; font-size: 12px; line-height: 1.7; }
.section-title { margin-top: 26px; margin-bottom: 7px; color: #24272D; font-size: 16px; font-weight: 600; line-height: 1.6; }
@media (min-width: 700px) { .agreement-document { padding: 36px 40px 44px; } .document-block { font-size: 15px; } .document-meta { font-size: 12px; } }
</style>
