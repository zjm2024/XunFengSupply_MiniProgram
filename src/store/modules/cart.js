/**
 * 购物车状态管理 - 多规格支持
 * 数据结构：
 * - 商品(SPU) → 颜色(Color) → 尺码(Size) SKU
 * 
 * SKU 唯一键: `${productId}_${colorId}_${sizeId}`
 * 
 * 支持功能：
 * - 同一个 SPU 多个颜色
 * - 一个颜色多个尺码
 * - SKU 合并
 * - 数量更新 / 库存状态更新
 * - 商品级选中 / 颜色级选中 / SKU 级选中
 * - 10 万元金额上限
 */

import { defineStore } from 'pinia'

// 购物车上限（元）
const MAX_CART_AMOUNT = 100000

export const useCartStore = defineStore('cart', {
  state: () => ({
    // 购物车商品列表 (SPU 维度)
    // 每个商品包含: { productId, name, code, price, image, unit, moq, colors: [{ colorId, colorName, image, sizes: [{ sizeId, quantity, stock }] }] }
    products: [],
    
    // 已选中的 SKU key 列表（使用数组而非 Set，确保可序列化/持久化）
    selectedSKUKeys: [],
    
    // 展开的颜色 ID 列表
    expandedColorIds: [],
    
    // 加载状态
    loading: false,
    
    // Mock 数据标记
    _isMockData: false
  }),

  getters: {
    // 是否为空
    isEmpty: (state) => state.products.length === 0,

    // 所有 SKU 列表（扁平化）
    allSKUs: (state) => {
      const skus = []
      state.products.forEach(product => {
        product.colors?.forEach(color => {
          color.sizes?.forEach(size => {
            if (size.quantity > 0) {
              skus.push({
                ...size,
                productId: product.productId,
                productName: product.name,
                productCode: product.code,
                productImage: product.image,
                productPrice: product.price,
                productUnit: product.unit,
                colorId: color.colorId,
                colorName: color.colorName,
                colorImage: color.image,
                skuKey: `${product.productId}_${color.colorId}_${size.sizeId}`
              })
            }
          })
        })
      })
      return skus
    },

    // 已选中的 SKU 列表
    selectedSKUs: (state) => {
      const selected = []
      state.products.forEach(product => {
        product.colors?.forEach(color => {
          color.sizes?.forEach(size => {
            const skuKey = `${product.productId}_${color.colorId}_${size.sizeId}`
            if (size.quantity > 0 && state.selectedSKUKeys.includes(skuKey)) {
              selected.push({
                ...size,
                productId: product.productId,
                productName: product.name,
                productCode: product.code,
                productImage: product.image,
                productPrice: product.price,
                productUnit: product.unit,
                colorId: color.colorId,
                colorName: color.colorName,
                colorImage: color.image,
                skuKey
              })
            }
          })
        })
      })
      return selected
    },

    // 统计数据
    summary: (state) => {
      let totalQuantity = 0
      let totalAmount = 0
      let skuCount = 0
      let colorCountSet = new Set()

      state.products.forEach(product => {
        product.colors?.forEach(color => {
          let hasSelectedInColor = false
          color.sizes?.forEach(size => {
            if (size.quantity > 0) {
              const skuKey = `${product.productId}_${color.colorId}_${size.sizeId}`
              const isSelected = state.selectedSKUKeys.includes(skuKey)
              
              totalQuantity += size.quantity
              totalAmount += size.quantity * product.price
              
              if (size.quantity > 0) skuCount++
              if (isSelected) hasSelectedInColor = true
            }
          })
          if (hasSelectedInColor) colorCountSet.add(`${product.productId}_${color.colorId}`)
        })
      })

      return {
        totalQuantity,
        totalAmount,
        skuCount,
        colorCount: colorCountSet.size,
        isOverLimit: totalAmount > MAX_CART_AMOUNT,
        remainingLimit: Math.max(0, MAX_CART_AMOUNT - totalAmount)
      }
    },

    // 是否全选
    isSelectAll: (state) => {
      const allKeys = []
      state.products.forEach(product => {
        product.colors?.forEach(color => {
          color.sizes?.forEach(size => {
            if (size.quantity > 0) {
              allKeys.push(`${product.productId}_${color.colorId}_${size.sizeId}`)
            }
          })
        })
      })
      if (allKeys.length === 0) return false
      return allKeys.every(key => state.selectedSKUKeys.includes(key))
    },

    // 格式化总金额
    formattedTotalAmount() {
      return this.formatMoney(this.summary.totalAmount)
    },

    // 格式化剩余额度
    formattedRemainingLimit() {
      return this.formatMoney(this.summary.remainingLimit)
    },

    // 首页购物车角标文案
    cartBadgeText: (state) => {
      const { skuCount } = state.summary || { skuCount: 0 }
      return skuCount > 0 ? `${skuCount} 款` : '购物车为空'
    }
  },

  actions: {
    /**
     * 格式化金额
     */
    formatMoney(value) {
      return `¥${value.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
    },

    /**
     * 生成 SKU Key
     */
    buildSKUKey(productId, colorId, sizeId) {
      return `${productId}_${colorId}_${sizeId}`
    },

    /**
     * 检查 SKU 是否被选中
     */
    _isSelected(skuKey) {
      return this.selectedSKUKeys.includes(skuKey)
    },

    /**
     * 添加选中 SKU
     */
    _addSelected(skuKey) {
      if (!this._isSelected(skuKey)) {
        this.selectedSKUKeys.push(skuKey)
      }
    },

    /**
     * 移除选中 SKU
     */
    _removeSelected(skuKey) {
      const idx = this.selectedSKUKeys.indexOf(skuKey)
      if (idx !== -1) {
        this.selectedSKUKeys.splice(idx, 1)
      }
    },

    /**
     * [已废弃] 初始化 Mock 数据
     * @deprecated 生产代码不应调用此方法
     */
    initMockData() {
      if (this._isMockData) return
      
      this.products = [{
        productId: 'T-100',
        name: '薰风专业比赛服 T-100',
        code: 'XF-T100',
        price: 168,
        image: '/static/images/jersey-red.png',
        unit: '件',
        moq: 20,
        colors: [
          {
            colorId: 'red',
            colorName: '赤焰红',
            image: '/static/images/jersey-red.png',
            sizes: [
              { sizeId: 'S', quantity: 10, stock: 200 },
              { sizeId: 'M', quantity: 10, stock: 180 },
              { sizeId: 'L', quantity: 10, stock: 36 },
              { sizeId: 'XL', quantity: 10, stock: 80 },
              { sizeId: '2XL', quantity: 0, stock: 0 }
            ]
          },
          {
            colorId: 'black',
            colorName: '曜石黑',
            image: '/static/images/jersey-black.png',
            sizes: [
              { sizeId: 'S', quantity: 6, stock: 160 },
              { sizeId: 'M', quantity: 6, stock: 142 },
              { sizeId: 'L', quantity: 6, stock: 96 },
              { sizeId: 'XL', quantity: 6, stock: 28 },
              { sizeId: '2XL', quantity: 0, stock: 40 }
            ]
          },
          {
            colorId: 'white',
            colorName: '冰川白',
            image: '/static/images/jersey-white.png',
            sizes: [
              { sizeId: 'S', quantity: 0, stock: 120 },
              { sizeId: 'M', quantity: 0, stock: 118 },
              { sizeId: 'L', quantity: 0, stock: 88 },
              { sizeId: 'XL', quantity: 0, stock: 56 },
              { sizeId: '2XL', quantity: 0, stock: 20 }
            ]
          }
        ]
      }]

      // 默认选中所有有数量的 SKU
      this.selectAll(true)
      this._isMockData = true
    },

    /**
     * 批量加入购物车（从批量选规格页）
     * @param {Object} productInfo - 商品基本信息
     * @param {Object} quantities - { colorId: { sizeId: quantity } }
     */
    batchAddToCart(productInfo, quantities) {
      // 查找或创建商品
      let product = this.products.find(p => p.productId === productInfo.productId)
      
      if (!product) {
        product = {
          productId: productInfo.productId,
          name: productInfo.name,
          code: productInfo.code || '',
          price: productInfo.price,
          image: productInfo.image,
          unit: productInfo.unit || '件',
          moq: productInfo.moq || 1,
          colors: []
        }
        this.products.push(product)
      } else {
        // 更新商品信息
        Object.assign(product, {
          name: productInfo.name,
          price: productInfo.price,
          image: productInfo.image
        })
      }

      // 合并数量到各颜色尺码
      Object.entries(quantities).forEach(([colorId, sizes]) => {
        let color = product.colors.find(c => c.colorId === colorId)
        
        if (!color) {
          // 从 mock 颜色信息中获取
          const colorInfo = productInfo.colors?.find(c => c.id === colorId)
          color = {
            colorId,
            colorName: colorInfo?.name || colorId,
            image: colorInfo?.image || '',
            sizes: []
          }
          product.colors.push(color)
        }

        Object.entries(sizes).forEach(([sizeId, qty]) => {
          if (qty <= 0) return
          
          let size = color.sizes.find(s => s.sizeId === sizeId)
          
          if (!size) {
            const stockInfo = productInfo.inventory?.[colorId]?.[sizeId]
            size = {
              sizeId,
              quantity: 0,
              stock: stockInfo ?? 999
            }
            color.sizes.push(size)
          }

          // 合并数量
          size.quantity = Math.min(size.quantity + qty, size.stock)
          
          // 默认选中新加入的 SKU
          const skuKey = this.buildSKUKey(product.productId, colorId, sizeId)
          this._addSelected(skuKey)
        })

        // 移除空颜色的尺码
        color.sizes = color.sizes.filter(s => s.quantity > 0 || s.stock > 0)
      })

      // 移除空颜色
      product.colors = product.colors.filter(c => c.sizes.length > 0)
    },

    /**
     * 更新单个 SKU 数量
     */
    updateSKUQuantity(productId, colorId, sizeId, quantity) {
      const product = this.products.find(p => p.productId === productId)
      if (!product) return

      const color = product.colors?.find(c => c.colorId === colorId)
      if (!color) return

      const size = color.sizes?.find(s => s.sizeId === sizeId)
      if (!size) return

      size.quantity = Math.max(0, Math.min(quantity, size.stock))
    },

    /**
     * 切换单个 SKU 选中状态
     */
    toggleSKUSelect(productId, colorId, sizeId) {
      const skuKey = this.buildSKUKey(productId, colorId, sizeId)
      if (this._isSelected(skuKey)) {
        this._removeSelected(skuKey)
      } else {
        this._addSelected(skuKey)
      }
    },

    /**
     * 切换整个颜色选中状态
     */
    toggleColorSelect(productId, colorId) {
      const product = this.products.find(p => p.productId === productId)
      if (!product) return

      const color = product.colors?.find(c => c.colorId === colorId)
      if (!color) return

      // 检查该颜色下是否所有有数量的 SKU 都已选中
      const allSelected = color.sizes
        .filter(s => s.quantity > 0)
        .every(s => this._isSelected(this.buildSKUKey(productId, colorId, s.sizeId)))

      if (allSelected) {
        // 取消选中该颜色所有 SKU（使用 Array 方法，因为 selectedSKUKeys 是数组）
        const keysToRemove = []
        color.sizes.forEach(s => {
          if (s.quantity > 0) {
            keysToRemove.push(this.buildSKUKey(productId, colorId, s.sizeId))
          }
        })
        this.selectedSKUKeys = this.selectedSKUKeys.filter(
          key => !keysToRemove.includes(key)
        )
      } else {
        // 选中该颜色所有有数量的 SKU
        color.sizes.forEach(s => {
          if (s.quantity > 0) {
            const skuKey = this.buildSKUKey(productId, colorId, s.sizeId)
            if (!this.selectedSKUKeys.includes(skuKey)) {
              this.selectedSKUKeys.push(skuKey)
            }
          }
        })
      }
    },

    /**
     * 切换整个商品选中状态
     */
    toggleProductSelect(productId) {
      const product = this.products.find(p => p.productId === productId)
      if (!product) return

      const allSelected = this.isProductFullySelected(productId)

      product.colors?.forEach(color => {
        color.sizes?.forEach(size => {
          if (size.quantity > 0) {
            const skuKey = this.buildSKUKey(productId, color.colorId, size.sizeId)
            if (allSelected) {
              this._removeSelected(skuKey)
            } else {
              this._addSelected(skuKey)
            }
          }
        })
      })
    },

    /**
     * 检查商品是否完全选中
     */
    isProductFullySelected(productId) {
      const product = this.products.find(p => p.productId === productId)
      if (!product) return false

      let hasAny = false
      const allSelected = product.colors?.every(color =>
        color.sizes?.every(size => {
          if (size.quantity > 0) {
            hasAny = true
            return this._isSelected(this.buildSKUKey(productId, color.colorId, size.sizeId))
          }
          return true
        })
      )
      return hasAny && allSelected
    },

    /**
     * 全选 / 取消全选
     */
    selectAll(selected) {
      if (selected) {
        this.products.forEach(product => {
          product.colors?.forEach(color => {
            color.sizes?.forEach(size => {
              if (size.quantity > 0) {
                this._addSelected(this.buildSKUKey(product.productId, color.colorId, size.sizeId))
              }
            })
          })
        })
      } else {
        this.selectedSKUKeys = []
      }
    },

    /**
     * 切换颜色展开/收起
     */
    toggleColorExpand(colorId) {
      if (this.expandedColorIds.includes(colorId)) {
        const idx = this.expandedColorIds.indexOf(colorId)
        if (idx !== -1) {
          this.expandedColorIds.splice(idx, 1)
        }
      } else {
        this.expandedColorIds.push(colorId)
      }
    },

    /**
     * 移除商品
     */
    removeProduct(productId) {
      // 先移除相关选中状态
      this.products
        .find(p => p.productId === productId)
        ?.colors?.forEach(color => {
          color.sizes?.forEach(size => {
            this._removeSelected(this.buildSKUKey(productId, color.colorId, size.sizeId))
          })
        })
      
      this.products = this.products.filter(p => p.productId !== productId)
    },

    /**
     * 清空购物车
     */
    clearCart() {
      this.products = []
      this.selectedSKUKeys = []
      this.expandedColorIds = []
      this._isMockData = false
    },

    /**
     * 设置加载状态
     */
    setLoading(loading) {
      this.loading = loading
    }
  }
})
