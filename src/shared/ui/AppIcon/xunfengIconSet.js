import tabHomeSvg from '../../assets/illustrations/tab-home.svg?raw'
import tabHomeActiveSvg from '../../assets/illustrations/tab-home-active.svg?raw'
import tabCategorySvg from '../../assets/illustrations/tab-category.svg?raw'
import tabCategoryActiveSvg from '../../assets/illustrations/tab-category-active.svg?raw'
import tabNewsSvg from '../../assets/illustrations/tab-news.svg?raw'
import tabNewsActiveSvg from '../../assets/illustrations/tab-news-active.svg?raw'
import tabCartSvg from '../../assets/illustrations/tab-cart.svg?raw'
import tabCartActiveSvg from '../../assets/illustrations/tab-cart-active.svg?raw'
import tabAccountSvg from '../../assets/illustrations/tab-account.svg?raw'
import tabAccountActiveSvg from '../../assets/illustrations/tab-account-active.svg?raw'

/**
 * 薰风商城图标集。
 * 统一规范：24 × 24 画布、圆角线条、默认 1.8px、单色 currentColor。
 */
const coreIconPaths = Object.freeze({
  home: '<path fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" d="M3.5 10.2 12 3l8.5 7.2v9.3A1.5 1.5 0 0 1 19 21H5a1.5 1.5 0 0 1-1.5-1.5zm5.5 4.3V21h6v-6.5z"/>',
  product: '<path d="m4 7.4 8-4.4 8 4.4v9.2L12 21l-8-4.4z"/><path d="m4 7.4 8 4.5 8-4.5M12 11.9V21"/><path d="m8 5.2 8 4.5"/>',
  category: '<rect x="3" y="3" width="7" height="7" rx="2"/><rect x="14" y="3" width="7" height="7" rx="2"/><rect x="3" y="14" width="7" height="7" rx="2"/><path d="m17.5 14 3.5 3.5-3.5 3.5-3.5-3.5z"/>',
  cart: '<path d="M3 4h2.2l1.6 10.1a2 2 0 0 0 2 1.7h8.9a2 2 0 0 0 1.9-1.4L21 8H6"/><circle cx="9" cy="20" r="1.2"/><circle cx="18" cy="20" r="1.2"/>',
  order: '<path d="M7 3.5h8l4 4V20a1 1 0 0 1-1 1H7a2 2 0 0 1-2-2V5.5a2 2 0 0 1 2-2z"/><path d="M14.5 3.5V8H19M8.5 12h3M8.5 16h2.5M14 15.5l1.4 1.4 2.7-3"/>',
  'batch-order': '<path d="M8 3h8.5A1.5 1.5 0 0 1 18 4.5V17H8a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z"/><path d="M6 7H4.5A1.5 1.5 0 0 0 3 8.5V19a2 2 0 0 0 2 2h9.5A1.5 1.5 0 0 0 16 19.5V18M10 9h4M12 7v4"/>',
  inventory: '<path d="M3 20h18M4.5 10h15v10h-15z"/><path d="M6 4h5v6H6zM13 4h5v6h-5zM8.5 15.5h7M12 10v10"/>',
  shipping: '<path d="M3 5h11v11H3zM14 9h3.5l3.5 4v3h-7z"/><circle cx="7" cy="18.5" r="1.5"/><circle cx="18" cy="18.5" r="1.5"/><path d="M14 13h7"/>',
  'after-sales': '<path d="M20.2 8.2A8.5 8.5 0 0 0 5.4 5.4L3 8M3 4v4h4M3.8 15.8a8.5 8.5 0 0 0 14.8 2.8L21 16M21 20v-4h-4"/><path d="m9.4 14.6 5.2-5.2M9.1 9.1l1.8 1.8M13.1 13.1l1.8 1.8"/>',
  news: '<path d="M5 4h14a2 2 0 0 1 2 2v13a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8h2z"/><path d="M5 4v14a3 3 0 0 1-2 2.8M9 8h8M9 12h8M9 16h5"/>',
  announcement: '<path d="M4 10v4a2 2 0 0 0 2 2h2l7 3V5L8 8H6a2 2 0 0 0-2 2zM15 8l4-2v12l-4-2M8 16l1.5 4"/>',
  message: '<path d="M5 4h14a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2h-7l-5 3v-3H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z"/><circle cx="8" cy="11" r=".8"/><circle cx="12" cy="11" r=".8"/><circle cx="16" cy="11" r=".8"/>',
  dealer: '<path d="M4 9h16v11H4zM3 9l2-5h14l2 5M8 20v-6h5v6"/><path d="M3 9a3 3 0 0 0 5 2 3 3 0 0 0 4 0 3 3 0 0 0 4 0 3 3 0 0 0 5-2"/>',
  account: '<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>',
  address: '<path d="M20 10c0 5.4-8 11-8 11S4 15.4 4 10a8 8 0 1 1 16 0z"/><circle cx="12" cy="10" r="2.5"/>',
  invoice: '<path d="M6 3h12v18l-2-1.3L14 21l-2-1.3L10 21l-2-1.3L6 21z"/><path d="M9 8h6M9 12h6M9 16h3"/>',
  wallet: '<path d="M4 6.5h14a2 2 0 0 1 2 2V19H5a2 2 0 0 1-2-2V6a3 3 0 0 1 3-3h11"/><path d="M16 11h5v5h-5a2.5 2.5 0 0 1 0-5z"/>',
  voucher: '<path d="M4 5h16a1 1 0 0 1 1 1v3a3 3 0 0 0 0 6v3a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1v-3a3 3 0 0 0 0-6V6a1 1 0 0 1 1-1z"/><path d="M12 8v2M12 14v2"/>',
  search: '<circle cx="10.5" cy="10.5" r="6.5"/><path d="m15.5 15.5 4.5 4.5"/>',
  filter: '<path d="M4 5h16l-6.2 7v5.5L10 20v-8z"/>',
  settings: '<circle cx="12" cy="12" r="3"/><path d="M19.4 14.8l1.1 1.9-2.8 2.8-1.9-1.1a7.7 7.7 0 0 1-2 .8L13.2 21H9.3l-.5-1.8a7.7 7.7 0 0 1-2-.8l-1.9 1.1-2.8-2.8 1.1-1.9a7.7 7.7 0 0 1-.8-2L.6 12l1.8-.6a7.7 7.7 0 0 1 .8-2L2.1 7.5l2.8-2.8 1.9 1.1a7.7 7.7 0 0 1 2-.8l.5-2h3.9l.6 2a7.7 7.7 0 0 1 2 .8l1.9-1.1 2.8 2.8-1.1 1.9a7.7 7.7 0 0 1 .8 2l1.8.6-1.8.8a7.7 7.7 0 0 1-.8 2z"/>',
  help: '<circle cx="12" cy="12" r="9"/><path d="M9.5 9a2.7 2.7 0 1 1 4.3 2.2c-1.1.8-1.8 1.3-1.8 2.8M12 17.5h.01"/>',
  logout: '<path d="M10 4H5a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h5M14 8l4 4-4 4M8 12h10"/>',
  alert: '<circle cx="12" cy="12" r="9"/><path d="M12 7.5v5.5M12 16.5h.01"/>',
  offline: '<path d="M5.2 9.2A10.5 10.5 0 0 1 20 10M2 6l20 14M8.5 12.5a5.2 5.2 0 0 1 7 1.2M11 16.8a1.5 1.5 0 0 1 2 .2"/>',
  tools: '<path d="M14.3 6.2a4.5 4.5 0 0 0-5.5 5.5l-5.3 5.3a2.1 2.1 0 0 0 3 3l5.3-5.3a4.5 4.5 0 0 0 5.5-5.5l-2.7 2.7-2.5-.6-.6-2.5z"/><path d="m14.5 15.5 5 5"/>',
  'wechat-pay': '<path d="M4 14.5a6.5 6.5 0 1 1 3.4-12A6.5 6.5 0 0 1 14.5 13H9l-3.5 2v-2.2A6.5 6.5 0 0 1 4 11"/><path d="M11.5 12.5a5 5 0 0 0 8 4V19l-2.8-1.5h-3.2a5 5 0 0 1-4.8-3.6M6.5 7.5h.01M10 7.5h.01M14.5 14h.01M17 14h.01"/>',
  info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 7.5h.01"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3.5 2"/>',
  lock: '<rect x="4" y="10" width="16" height="11" rx="2.5"/><path d="M8 10V7a4 4 0 0 1 8 0v3M12 14.5v2"/>',
  download: '<path d="M12 3v11M8 10l4 4 4-4M4 17v3h16v-3"/>',
  check: '<path d="m5 12.5 4.2 4.2L19 7"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  bell: '<path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path d="M13.73 21a2 2 0 0 1-3.46 0" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>',
  'chevron-right': '<path d="m9 5 7 7-7 7"/>',
  'chevron-down': '<path d="m5 9 7 7 7-7"/>',
  'arrow-right': '<path d="M4 12h15M14 7l5 5-5 5"/>',
  eye: '<path d="M3 12s3.5-6 9-6 9 6 9 6-3.5 6-9 6-9-6-9-6z"/><circle cx="12" cy="12" r="2.5"/>',
  'eye-off': '<path d="M5.2 7.2A12.8 12.8 0 0 0 3 12s3.5 6 9 6c1.4 0 2.6-.4 3.7-1M9.8 6.2c.7-.2 1.4-.2 2.2-.2 5.5 0 9 6 9 6a13.4 13.4 0 0 1-2 2.7M3 3l18 18"/><path d="M10.2 10.2a2.5 2.5 0 0 0 3.6 3.6"/>',
  shield: '<path d="M12 3 20 6v5.5c0 4.8-3.2 7.8-8 9.5-4.8-1.7-8-4.7-8-9.5V6z"/>',
  'shield-check': '<path d="M12 3 20 6v5.5c0 4.8-3.2 7.8-8 9.5-4.8-1.7-8-4.7-8-9.5V6z"/><path d="m8.5 12 2.2 2.2 4.8-4.8"/>',
  close: '<path d="m6 6 12 12M18 6 6 18"/>',
  refresh: '<path d="M20 8V4l-2 2a8 8 0 1 0 1.7 8.7M20 4h-4"/>',
  error: '<circle cx="12" cy="12" r="9"/><path d="m9 9 6 6M15 9l-6 6"/>',
  history: '<path d="M4 7V3M4 7h4M4.7 6a8.5 8.5 0 1 1-1 10"/><path d="M12 8v4l3 2"/>',
  upload: '<path d="M12 15V4M8 8l4-4 4 4M4 17v3h16v-3"/>',
  users: '<circle cx="9" cy="8" r="3.5"/><path d="M3 20a6 6 0 0 1 12 0M16 5.5a3 3 0 0 1 0 5.8M17 14a5 5 0 0 1 4 4.9"/>',
  globe: '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c2.3 2.5 3.5 5.5 3.5 9S14.3 18.5 12 21c-2.3-2.5-3.5-5.5-3.5-9S9.7 5.5 12 3z"/>',
  image: '<rect x="3" y="4" width="18" height="16" rx="2.5"/><circle cx="8.5" cy="9" r="1.5"/><path d="m5.5 18 4.5-4.5 3 3 2.5-2.5 3 4"/>',
  sparkles: '<path d="M12 2.8c.7 3.4 2.4 5.1 5.8 5.8-3.4.7-5.1 2.4-5.8 5.8-.7-3.4-2.4-5.1-5.8-5.8 3.4-.7 5.1-2.4 5.8-5.8z"/><path d="M18.2 14.2c.4 2 1.4 3 3.4 3.4-2 .4-3 1.4-3.4 3.4-.4-2-1.4-3-3.4-3.4 2-.4 3-1.4 3.4-3.4zM5 14.6c.3 1.4 1 2.1 2.4 2.4-1.4.3-2.1 1-2.4 2.4-.3-1.4-1-2.1-2.4-2.4 1.4-.3 2.1-1 2.4-2.4z"/>',
})

function createSvgAssetIcon(svg) {
  const viewBox = svg.match(/\bviewBox=["']([^"']+)["']/i)?.[1] || '0 0 24 24'
  const content = svg.match(/<svg\b[^>]*>([\s\S]*?)<\/svg>/i)?.[1]?.trim() || ''
  return Object.freeze({ viewBox, content })
}

const tabIconPaths = Object.freeze({
  'tab-home': createSvgAssetIcon(tabHomeSvg),
  'tab-home-active': createSvgAssetIcon(tabHomeActiveSvg),
  'tab-category': createSvgAssetIcon(tabCategorySvg),
  'tab-category-active': createSvgAssetIcon(tabCategoryActiveSvg),
  'tab-news': createSvgAssetIcon(tabNewsSvg),
  'tab-news-active': createSvgAssetIcon(tabNewsActiveSvg),
  'tab-cart': createSvgAssetIcon(tabCartSvg),
  'tab-cart-active': createSvgAssetIcon(tabCartActiveSvg),
  'tab-account': createSvgAssetIcon(tabAccountSvg),
  'tab-account-active': createSvgAssetIcon(tabAccountActiveSvg),
})

export const xunfengIconMap = Object.freeze({
  ...coreIconPaths,
  ...tabIconPaths,
  package: coreIconPaths.product,
  box: coreIconPaths.product,
  user: coreIconPaths.account,
  'account-center': coreIconPaths.account,
  'map-pin': coreIconPaths.address,
  receipt: coreIconPaths.invoice,
  service: coreIconPaths['after-sales'],
  truck: coreIconPaths.shipping,
  tool: coreIconPaths.tools,
  'alert-circle': coreIconPaths.alert,
  weixin: coreIconPaths['wechat-pay'],
  locked: coreIconPaths.lock,
  location: coreIconPaths.address,
  car: coreIconPaths.shipping,
  right: coreIconPaths['chevron-right'],
  bottom: coreIconPaths['chevron-down'],
  checkmarkempty: coreIconPaths.check,
  moon: '<path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>',
  trash: '<path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m3 0v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6h14zM10 11v6M14 11v6"/>',
})

export const xunfengCoreIconNames = Object.freeze(Object.keys(coreIconPaths))
