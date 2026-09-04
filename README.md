# 薰风体育 B2B 经销商采购平台

> UniApp Vue3 + Vite + Pinia | App优先 + 微信小程序分包架构

## 📋 项目简介

薰风体育羽毛球B2B经销商采购平台，覆盖**签约准入→登录校验→选购商品→购物车批量下单→结算（现款/赊账）→收货对账→售后**完整业务流程。

- **技术栈**：UniApp Vite + Vue3 `<script setup>` + 原生JS（禁止TS）
- **目标平台**：Android/iOS App + 微信小程序（移除H5）
- **UI方案**：uni-ui + 自研业务组件（不引入uView/Vant等第三方UI库）
- **状态管理**：Pinia 模块化
- **主色调**：`#C41E3A` 高级红，B2B品牌风格
- **核心机制**：授信额度 + 信誉分体系（无会员/优惠券）

---

## 📁 目录结构

```
xunfeng-sport-b2b/
├── pages.json                    # 路由配置（含TabBar、分包、EasyCom）
├── manifest.json                # 应用配置
├── App.vue                      # 应用入口
├── main.js                      # 入口文件（挂载Pinia）
├── uni.scss                     # UniApp内置变量覆盖
├── package.json                 # 依赖管理
├── vite.config.js               # Vite构建配置
│
├── config/                      # 全局配置
│   ├── env.js                   # 开发/测试/生产环境域名
│   ├── constant.js              # 订单/账号/售后/信誉分枚举常量
│   └── permission.js            # 子账号权限配置
│
├── api/                         # 接口层（按业务模块拆分）
│   ├── base.js                  # 请求基础封装
│   ├── auth.js                  # 签约资质、登录、子账号管理
│   ├── goods.js                 # 商品分类/搜索/SKU库存
│   ├── cart.js                  # 购物车批量操作
│   ├── order.js                 # 下单/支付/订单列表详情
│   ├── settlement.js            # 月度对账/结算/导出凭证
│   ├── aftersale.js             # 售后申请/进度查询
│   └── message.js               # 系统消息推送
│
├── utils/                       # 工具通用层
│   ├── request.js               # 请求拦截器（Token/401/冻结处理）
│   ├── storage.js               # 本地缓存封装
│   ├── format.js                # 金额/时间/账单格式化
│   ├── validate.js              # 表单校验（手机号/资质材料）
│   └── business.js              # 信誉分增减规则工具
│
├── store/                       # Pinia状态管理
│   ├── index.js                 # Store入口
│   └── modules/
│       ├── user.js              # 经销商信息/账号状态/授信额度/信誉分
│       ├── cart.js              # 购物车批量选中状态
│       ├── message.js           # 系统未读消息
│       └── order.js             # 待付款订单缓存
│
├── pages/                       # 主包页面（Tab常驻4页）
│   ├── home/home.vue            # [Tab] 经销商工作台首页
│   ├── classify/classify.vue     # [Tab] 商品分类选购
│   ├── cart/cart.vue            # [Tab] 购物车批量操作
│   └── mine/mine.vue            # [Tab] 个人中心/资质/账号管理
│
├── subPackages/                 # 分包页面（8个子包13个页面）
│   ├── authSub/                 # 签约认证分包
│   │   ├── applySign.vue        # 提交门店资质签约
│   │   └── login.vue            # 验证码登录页
│   ├── goodsSub/                # 商品分包
│   │   ├── goodsDetail.vue      # 商品详情+SKU实时库存
│   │   └── replenishList.vue    # 补货清单选购
│   ├── orderSub/                # 订单分包
│   │   ├── orderConfirm.vue     # 结算确认页
│   │   ├── orderList.vue        # 全部订单列表
│   │   └── orderDetail.vue      # 订单详情
│   ├── paySub/                  # 支付分包
│   │   └── payPage.vue          # 付款页（现款/授信赊账）
│   ├── settlementSub/           # 结算分包
│   │   ├── billList.vue         # 月度对账账单列表
│   │   └── billDetail.vue       # 账单详情+导出PDF
│   ├── afterSaleSub/            # 售后分包
│   │   ├── applyAfterSale.vue   # 发起售后申请+上传凭证
│   │   └── afterSaleList.vue    # 售后进度列表
│   ├── systemSub/               # 系统分包
│   │   └── messageList.vue      # APP系统消息通知
│   └── accountSub/              # 账号分包
│       ├── subAccountManage.vue # 总店创建子账号+分配权限
│       └── accountStatus.vue    # 账号冻结提示页
│
├── components/                  # 全局通用组件（EasyCom自动引入）
│   ├── uni-nav-bar/             # 自定义导航栏
│   ├── empty-view/              # 空状态组件
│   ├── batch-checkbox/          # 购物车批量勾选
│   ├── status-tag/              # 订单/售后/账单状态标签
│   ├── upload-file/             # 资质/凭证上传组件
│   ├── pay-mode-popup/          # 结算模式选择弹窗
│   └── message-popup/           # 消息推送弹窗
│
├── hooks/                       # 组合式钩子
│   ├── useAuth.js               # 签约/登录/账号状态校验
│   ├── useCart.js               # 购物车批量操作逻辑
│   ├── useOrder.js              # 下单/支付/订单流程
│   ├── useAfterSale.js          # 售后申请逻辑
│   └── useSettlement.js         # 对账结算逻辑
│
├── styles/                      # 全局样式
│   ├── reset.scss               # 样式重置
│   └── variable.scss            # CSS变量定义
│
├── static/                      # 静态资源
│   ├── images/                  # 图片资源
│   └── fonts/                   # 字体资源
│
└── nativePlugins/               # 原生插件目录
```

---

## 🔄 业务流程 → 页面映射

### 1️⃣ 签约准入流程（未签约经销商）

| 流程节点 | 页面路径 | 说明 |
|---------|---------|------|
| 提交门店资质 | `subPackages/authSub/applySign.vue` | 营业执照、身份证正反面上传 |
| 账号验证码登录 | `subPackages/authSub/login.vue` | 手机号+验证码登录 |
| 账号冻结拦截 | `subPackages/accountSub/accountStatus.vue` | 冻结原因展示+客服申诉 |

### 2️⃣ 工作台选购流程（已签约正常账号）

| 流程节点 | 页面路径 | 说明 |
|---------|---------|------|
| 经销商工作台 | `pages/home/home.vue` | 授信额度展示、快捷入口 |
| 分类浏览商品 | `pages/classify/classify.vue` | 左侧分类+右侧商品列表 |
| 补货清单选购 | `subPackages/goodsSub/replenishList.vue` | 基于历史采购智能推荐 |
| 商品SKU查看 | `subPackages/goodsSub/goodsDetail.vue` | SKU选择+实时库存校验 |

### 3️⃣ 购物车&下单结算流程

| 流程节点 | 页面路径 | 说明 |
|---------|---------|------|
| 批量勾选/改量/删除 | `pages/cart/cart.vue` | 购物车全量操作 |
| 结算确认 | `subPackages/orderSub/orderConfirm.vue` | 地址/备注/结算模式 |
| 支付付款 | `subPackages/paySub/payPage.vue` | **现款支付** 或 **授信赊账** |

### 4️⃣ 订单履约发货流程

| 流程节点 | 页面路径 | 说明 |
|---------|---------|------|
| 订单列表 | `subPackages/orderSub/orderList.vue` | 各状态筛选Tab |
| 订单详情 | `subPackages/orderSub/orderDetail.vue` | 完整信息+物流轨迹 |
| 状态变更通知 | `subPackages/systemSub/messageList.vue` | 全链路消息推送 |

### 5️⃣ 收货对账结算流程

| 流程节点 | 页面路径 | 说明 |
|---------|---------|------|
| 月度账单列表 | `subPackages/settlementSub/billList.vue` | 月份筛选+概览卡片 |
| 账单详情 | `subPackages/settlementSub/billDetail.vue` | 明细+导出PDF+还款 |

### 6️⃣ 售后闭环流程

| 流程节点 | 页面路径 | 说明 |
|---------|---------|------|
| 发起售后申请 | `subPackages/afterSaleSub/applyAfterSale.vue` | 选类型+填原因+传凭证 |
| 售后进度列表 | `subPackages/afterSaleSub/afterSaleList.vue` | 进度条+审核结果 |

### 7️⃣ 附属功能

| 功能 | 页面路径 | 说明 |
|-----|---------|------|
| 子账号管理 | `subPackages/accountSub/subAccountManage.vue` | 总店创建+权限分配 |
| 系统消息 | `subPackages/systemSub/messageList.vue` | 全链路通知汇总 |

---

## 🎨 设计规范要点

### 配色系统
- **主色**：`#C41E3A` 高级红（B2B专业感）
- **成功**：`#07C160`
- **警告**：`#FF9800`
- **危险**：`#F56C6C`

### 核心业务规则
- **无会员/优惠券**：全程依靠「授信额度+信誉分」体系
- **信誉分规则**：
  - 初始80分，范围0~100
  - 按时付款 +5 / 提前付款 +8
  - 逾期付款 -15 / 拒收 -20 / 恶意售后 -30
- **授信等级**：根据信誉分自动划分（初级→标准→优质→核心）
- **售后期限**：确认收货后15天内可发起售后

---

## 📝 新增页面规范

1. **所有非Tab页面必须放入 `subPackages/` 对应分包**
2. **在 `pages.json` 的对应分包中注册路由**
3. **导航栏主题色统一为 `#C41E3A`**
4. **页面模板需包含对应流程节点的注释**
5. **接口调用使用 `api/` 目录下已封装的方法**

```vue
<!--
  XXX页面（分包：xxxSub）
  对应业务流程节点：
  具体流程描述
-->
<template>
  <!-- 页面内容 -->
</template>

<script setup>
import { onShow } from '@dcloudio/uni-app'
// TODO: 引入对应的API和Hook
</script>
```

---

## 📡 新增接口规范

1. **在 `api/` 对应模块文件中新增接口函数**
2. **遵循已有命名风格**：`getXxx` / `createXxx` / `updateXxx` / `deleteXxx`
3. **参数注释清晰**：使用 JSDoc 注释说明每个参数含义
4. **错误处理**：接口调用处统一 try-catch + 用户提示

```javascript
/**
 * 接口功能描述
 * @param {Object} params - 参数说明 { field: 类型, ... }
 * @returns {Promise<Object>} 返回值说明
 */
export function apiFunctionName(params) {
  return http.post('/path/to/api', params)
}
```

---

## 🚀 快速开始

```bash
# 安装依赖
npm install

# 开发模式 - App
npm run dev:app

# 开发模式 - 微信小程序
npm run dev:weixin

# 构建生产包 - App
npm run build:app

# 构建生产包 - 微信小程序
npm run build:weixin
```

---

## ⚠️ 开发约束

| 约束项 | 规则 |
|-------|------|
| 语言 | 纯JS，禁止TypeScript |
| UI库 | 仅 uni-ui + 自研组件，禁用 uView/Vant |
| 会员体系 | 无会员/优惠券，仅授信+信誉分 |
| H5支持 | 移除，只打包App+微信小程序 |
| 页面归属 | Tab页留主包，其余全部放入分包 |
| 组件引入 | EasyCom 自动引入，无需手动 import |
| 状态管理 | 使用 Pinia + 组合式 API (useStore) |

---

## 📌 路由守卫说明

全局路由拦截逻辑位于 `hooks/useAuth.js` 的 `canAccessPage()` 方法：

1. **白名单放行**：登录页、签约页、冻结页无需登录即可访问
2. **未登录拦截** → 跳转登录页
3. **未签约拦截** → 跳转签约提交页
4. **账号冻结拦截** → 跳转冻结提示页

建议在 `App.vue` 的 `onLaunch` 或各页面 `onShow` 中调用。

---

*项目基于 UniApp Vue3 构建 | 薰风体育 B2B采购平台 © 2026*
