# 标准业务页面宽度

以新增地址页为基准。当前应用于新增/编辑地址、账户资料、安全设置、订单列表和订单详情。

## 统一规则

- 手机（小于 600px）：左右各 16px。
- 平板（600–839px）：外层容器最多 720px，左右各 24px。
- 宽屏（840px 起）：外层容器最多 1120px，左右各 24px。
- 正文实际最大宽度统一 820px，并居中；字体、控件高度不随屏幕同比放大。
- 列表筛选条、底部操作区与正文对齐；卡片内部内边距、单个保存按钮和弹框尺寸按各自职责控制。

| 屏幕宽度 | 正文宽度 | 左边线 |
|---|---|---|
| 375px | 343px | 16px |
| 768px | 672px | 48px |
| 1024px | 820px | 102px |
| 1440px | 820px | 310px |

## 页面写法

```vue
<AppContent width-mode="standard">
  <view class="business-page">...</view>
</AppContent>

<FixedActionBar width-mode="standard">...</FixedActionBar>
```

页面根节点保持 `width: 100%`，不得再写 560/600/720 等局部限宽，也不得重复增加外层左右 padding。需要自定义上下留白时，`AppContent` 的 `padding` 水平方向统一使用 `var(--page-padding-x, 16px)`。

自定义页头中的业务筛选区，外层使用 `.page-width-container` 并增加统一水平边距，内层使用 `.page-content-frame`。数值由 `uni.scss`、`variable.scss` 和 `responsive.scss` 维护，页面不另建尺寸表。

`AppContent` 与 `FixedActionBar` 默认仍为原响应式模式；标准模式显式启用，避免隐式改变其他未迁移页面。`AppContent no-max-width` 保留现有全宽语义。页面数据、表单和写操作不应依赖宽度或横竖屏变化。
