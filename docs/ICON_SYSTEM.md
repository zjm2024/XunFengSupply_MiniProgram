# 薰风商城图标系统

## 视觉规范

- 画布：24 × 24。
- 默认线宽：1.8px；小于 18px 时可使用 2px。
- 端点与转角：round。
- 安全边距：常规图标 3px，圆形图标 2px。
- 色彩：图标自身不写死颜色，统一继承 `currentColor`。
- 风格：克制、圆润、几何化；业务图标保留少量斜切结构呼应薰风 Logo。

## 首批业务图标

`home`、`product`、`category`、`cart`、`order`、`batch-order`、`inventory`、`shipping`、`after-sales`、`news`、`announcement`、`message`、`dealer`、`account`、`address`、`invoice`、`wallet`、`voucher`、`search`、`filter`、`settings`、`help`、`logout`、`alert`、`offline`、`tools`、`wechat-pay`、`info`、`clock`、`lock`、`download`、`check`、`plus`、`chevron-right`、`chevron-down`、`arrow-right`、`eye`、`eye-off`、`shield`、`shield-check`、`close`、`refresh`、`error`、`history`、`upload`、`users`、`globe`、`image`。

兼容别名：`package`、`box`、`user`、`account-center`、`map-pin`、`receipt`、`service`、`truck`、`tool`、`alert-circle`、`weixin`、`locked`、`location`、`car`、`right`、`bottom`、`checkmarkempty`。

## 使用方式

```vue
<AppIcon name="order" :size="24" color="#D7192D" :stroke-width="1.8" />
```

页面只允许使用业务语义名称，不直接写 `<svg>`，也不绑定具体字体编码。

项目不再加载旧 `iconfont.css`；历史字体文件仅作为未引用的归档资源保留。
