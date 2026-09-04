# 薰风经销商下单系统 UI 设计稿交付索引

## 交付说明

- 设计依据：项目根目录 `DESIGN_SYSTEM.md`
- 输出形式：高保真 PNG 视觉设计画板
- 生成方式：OpenAI 内置 ImageGen，`ui-mockup` 模式
- 统一视觉：品牌红 `#D7192D`、黑白灰、系统语义色、无底部导航、首页门户式信息架构
- 页面结构：首页仅保留经销商摘要、商品下单、新闻资讯和“进入经销商中心”；所有其他功能收纳到经销商中心
- 注意：PNG 用于视觉确认和开发参照，不是可编辑 Figma/Sketch 源文件。小字号业务数据在正式开发时应以需求、接口字段及 Design Tokens 为准。

## 画板清单

| 文件 | 覆盖界面 |
|---|---|
| `01-首页与经销商中心.png` | 首页、经销商中心、账户资料、消息中心及消息 Tab |
| `02-商品与购物车.png` | 购物车、空购物车、商品目录、商品搜索、SKU 批量下单 |
| `03-结算拆单与支付.png` | 确认订单、收货地址、买赠拆单、配送与发货、支付方式、支付结果、提交确认弹窗、支付待定弹窗 |
| `04-订单与物流.png` | 订单中心及状态 Tab、待品牌审核、待付款、待确认发货、物流详情、取消订单弹窗 |
| `05-资金售后与发票.png` | 资金总览、充值中心、对账账单、对公凭证、申请售后、发票中心及 Tab、凭证/开票弹窗 |
| `06-新闻资讯与产品手册.png` | 资讯频道 Tab、产品新闻详情、产品手册分类、PDF 手册预览、政策公告及阅读确认 |
| `07-登录入驻与账户安全.png` | 登录、新设备验证、经销商入驻、入驻状态、子账号管理/权限弹层、安全设置/设备退出弹窗 |
| `08-批量导单地址与公告.png` | Excel 批量导单、导入校验 Tab、部分成功结果、智能地址解析、地址管理/编辑弹层、ERP 公告弹窗 |
| `09-弹窗异常与组件状态.png` | 账号冻结、授信不足、购物车超限、MOQ 校验、库存变化、弱网、重试、成功反馈，以及组件状态总表 |
| `10-系统服务与同步状态.png` | 语言设置、帮助中心、关于薰风、修改登录密码、登录设备、ERP 数据同步状态 |
| `11-首页改版V2-双入口.png` | **最新版首页基线**：身份条、商品下单/新闻资讯两个等尺寸核心入口，以及空购物车和未读资讯状态 |
| `12-商品详情与批量选规格V2.png` | **最新版商品链路**：商品图片、参数图文、颜色×尺码、批量填数、复制数量、批量加购结果 |
| `13-多规格购物车V2.png` | **最新版购物车基线**：商品→颜色→尺码三级分组、展开编辑、批量修改和库存变化弹窗 |

> V2 优先级：涉及首页、商品详情、批量选规格和购物车时，以 11–13 号画板为准；01–02 号对应页面仅保留为早期方案对照。

## 关键导航路径

```text
首页
├─ 商品下单 → 购物车 → 商品目录/SKU 批量下单 → 结算 → 支付 → 订单
├─ 新闻资讯 → 资讯列表 → 新闻详情/产品手册/政策公告
└─ 进入经销商中心
   ├─ 订单与资金
   ├─ 服务与凭证
   ├─ 账号与消息
   └─ 系统服务
```

## 统一母版提示词

```text
Use case: ui-mockup
Asset type: high-fidelity mobile app UI design board for 薰风经销商下单系统
Style: shippable premium minimal Chinese B2B product UI; realistic flat interface, not concept art
Palette: #D7192D, #B91224, #111216, #5E626B, #DEDFE3, #F7F7F8, white, plus restrained semantic colors
Typography: clean PingFang SC-like Chinese sans-serif, clear tabular numbers
Layout: complete portrait mobile screens, 16px page padding, 4px spacing system, 10px controls, 12px cards, 16px feature cards, thin borders, almost no shadows
Navigation: no bottom navigation; homepage is the portal; secondary pages use top back navigation
Constraints: exact readable Chinese, accessible contrast, consistent component geometry, complete screens, no unrelated products, no promotions, no watermark, no gibberish
Avoid: consumer shopping-festival style, colorful grids, glassmorphism, gold, neon, heavy shadows, bubbly cards
```

每张画板在上述母版基础上加入对应页面、Tab、字段、弹窗、状态和业务规则；详细业务以 `DESIGN_SYSTEM.md` 与开发实施方案为准。

### V2 多规格交互补充提示词

```text
Reference interaction: use the supplied 1688 screenshot only for the B2B interaction model—select a color with product image, enter quantities for multiple sizes under that color, retain quantities while switching colors, and batch-add all selected SKUs. Do not copy 1688 orange or third-party branding.
Product detail: mature JD/Taobao-level information completeness—image carousel, product name, item code, 69 code, dealer price, MOQ, stock, shipping/service rules, parameters, detail images and fixed actions—while keeping a restrained B2B style without coupons or promotional clutter.
Cart hierarchy: SPU product → color → size SKU. Allow product-level and color-level selection, expand/collapse size rows, batch edit variants, merge duplicate SKUs, and surface inventory changes before checkout.
```

## 开发还原要求

- 所有颜色、字号、间距、圆角和阴影必须使用 `DESIGN_SYSTEM.md` 中的 Design Tokens。
- 不从 PNG 吸色后自行新增近似色。
- 不增加底部导航，也不把业务服务重新搬回首页。
- 订单、库存、授信、支付、退款等状态以接口枚举为准，并匹配状态文案。
- 商品只展示当前经销商专属价格；库存遵守保密展示规则。
- 关键弹窗必须说明影响和下一步；普通校验使用行内提示，避免弹窗堆叠。
- 正文对比度不低于 4.5:1，触控区域不小于 44×44px。
