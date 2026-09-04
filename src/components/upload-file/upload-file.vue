<!--
  文件上传组件
  用途：签约资质上传、售后凭证上传复用
  支持多图上传、预览、删除
  v-model 绑定图片URL数组
-->
<template>
  <view class="upload-file">
    <!-- 已上传图片列表 -->
    <view class="img-list">
      <view 
        class="img-item" 
        v-for="(url, index) in fileList" 
        :key="index"
      >
        <image class="preview-img" :src="url" mode="aspectFill" @click="previewImage(index)" />
        <view class="delete-btn" v-if="!disabled" @click.stop="removeFile(index)">
          <uni-icons type="clear" size="16" color="#fff" />
        </view>
      </view>
      
      <!-- 上传按钮 -->
      <view
        class="upload-btn" 
        v-if="fileList.length < maxCount && !disabled"
        :class="{ 'is-uploading': uploading }"
        @click="chooseImage"
      >
        <uni-icons :type="uploading ? 'spinner-cycle' : 'plusempty'" size="28" color="#989BA3" />
        <text class="btn-text">{{ uploading ? '上传中' : '上传图片' }}</text>
      </view>
    </view>
    
    <!-- 提示文字 -->
    <text class="tips" v-if="tips">{{ tips }}</text>
  </view>
</template>

<script setup>
import { computed, ref } from 'vue'
import { uploadImage } from '@/api/file.js'

const props = defineProps({
  modelValue: { type: Array, default: () => [] },
  maxCount: { type: Number, default: 9 },
  tips: { type: String, default: '' },
  disabled: { type: Boolean, default: false },
  scene: { type: String, default: '' },
})

const emit = defineEmits(['update:modelValue'])
const uploading = ref(false)

// 双向绑定计算属性
const fileList = computed({
  get: () => props.modelValue,
  set: (val) => emit('update:modelValue', val)
})

/**
 * 选择图片
 */
function chooseImage() {
  if (uploading.value || props.disabled) return
  const remainCount = props.maxCount - fileList.value.length
  
  uni.chooseImage({
    count: remainCount,
    sizeType: ['compressed'],
    sourceType: ['album', 'camera'],
    success: async (res) => {
      uploading.value = true
      uni.showLoading({ title: '上传中...', mask: true })
      try {
        for (const filePath of res.tempFilePaths) {
          await uploadSingleFile(filePath)
        }
      } finally {
        uploading.value = false
        uni.hideLoading()
      }
    }
  })
}

/**
 * 上传单个文件
 * 通过 api/base.js 的 uploadFile 统一上传，自动携带 Token
 */
async function uploadSingleFile(filePath) {
  try {
    const res = await uploadImage(filePath, { scene: props.scene })
    const url = res?.url
    if (!url) {
      throw new Error('上传响应缺少 URL')
    }

    fileList.value = [...fileList.value, url]
  } catch (e) {
    console.error('[Upload] 上传失败:', e)
    // 使用 AppError 标准错误消息（如果 e 是 AppError 实例）
    const message = e?.message || e?.msg || '上传失败'
    uni.showToast({ title: message, icon: 'none' })
  }
}

/**
 * 预览图片
 */
function previewImage(index) {
  uni.previewImage({
    urls: fileList.value,
    current: index
  })
}

/**
 * 删除图片
 */
function removeFile(index) {
  fileList.value = fileList.value.filter((_, itemIndex) => itemIndex !== index)
}
</script>

<style lang="scss" scoped>
.upload-file {
  .img-list {
    display: flex;
    flex-wrap: wrap;
      gap: $space-3;
    
    .img-item {
      position: relative;
      width: 160rpx;
      height: 160rpx;
      
      .preview-img {
        width: 100%;
        height: 100%;
        border-radius: $radius-control;
      }
      
      .delete-btn {
        position: absolute;
        top: -12rpx;
        right: -12rpx;
        width: 36rpx;
        height: 36rpx;
        background: rgba(0, 0, 0, 0.6);
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
      }
    }
    
    .upload-btn {
      width: 160rpx;
      height: 160rpx;
      background: $color-gray-25;
      border: 2rpx dashed $color-gray-300;
      border-radius: $radius-control;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      transition: border-color $duration-normal $easing-standard,
        background-color $duration-normal $easing-standard;

      &:active {
        background: $color-brand-50;
        border-color: $color-brand-300;
      }

      &.is-uploading {
        opacity: 0.7;
        pointer-events: none;
      }

      .btn-text {
        font-size: $font-size-caption;
        color: $color-text-secondary;
        margin-top: $space-1;
      }
    }
  }
  
  .tips {
    display: block;
    font-size: $font-size-caption;
    line-height: $line-height-caption;
    color: $color-text-secondary;
    margin-top: $space-2;
  }
}
</style>
