<!--
  FileUploader - 统一文件上传组件
  用途：签约资质上传、售后凭证上传复用
  支持多图上传、预览、删除
  v-model 绑定图片URL数组

  使用方式：
    <FileUploader
      v-model="images"
      :maxCount="5"
      tips="请上传能反映问题的照片"
      scene="afterSale"
    />
-->
<template>
  <view class="file-uploader">
    <!-- 已上传图片列表 -->
    <view class="img-list">
      <view
        class="img-item"
        v-for="(url, index) in fileList"
        :key="index"
      >
        <image class="preview-img" :src="url" mode="aspectFill" @click="previewImage(index)" />
        <view class="delete-btn" v-if="!disabled" @click.stop="removeFile(index)">
          <view class="delete-icon">×</view>
        </view>
      </view>

      <!-- 上传按钮 -->
      <view
        class="upload-btn"
        v-if="fileList.length < maxCount && !disabled"
        :class="{ 'is-uploading': uploading }"
        @click="chooseImage"
      >
        <view class="upload-icon">+</view>
        <text class="btn-text">{{ uploading ? '上传中' : '上传图片' }}</text>
      </view>
    </view>

    <!-- 提示文字 -->
    <text class="tips" v-if="tips">{{ tips }}</text>
  </view>
</template>

<script setup>
import { computed, ref } from 'vue'
import { uploadFile as uploadFileApi } from '../../api/uploadClient.js'

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
 */
async function uploadSingleFile(filePath) {
  try {
    const res = await uploadFileApi(filePath, { scene: props.scene })
    const url = res?.url
    if (!url) {
      throw new Error('上传响应缺少 URL')
    }

    fileList.value = [...fileList.value, url]
  } catch (e) {
    console.error('[FileUploader] 上传失败:', e)
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
.file-uploader {
  .img-list {
    display: flex;
    flex-wrap: wrap;
    gap: 12rpx;

    .img-item {
      position: relative;
      width: 160rpx;
      height: 160rpx;

      .preview-img {
        width: 100%;
        height: 100%;
        border-radius: 8rpx;
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

        .delete-icon {
          color: #fff;
          font-size: 24rpx;
          line-height: 1;
        }
      }
    }

    .upload-btn {
      width: 160rpx;
      height: 160rpx;
      background: var(--surface-subtle, #F7F7F8);
      border: 2rpx dashed var(--border-color, #DCDFE6);
      border-radius: 8rpx;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      transition: all 0.2s ease;

      &:active {
        background: var(--brand-light, #FFF5F5);
        border-color: var(--brand-primary, #D7192D);
      }

      &.is-uploading {
        opacity: 0.7;
        pointer-events: none;
      }

      .upload-icon {
        font-size: 48rpx;
        color: var(--text-tertiary, #989BA3);
        line-height: 1;
      }

      .btn-text {
        font-size: 22rpx;
        color: var(--text-secondary, #62666F);
        margin-top: 8rpx;
      }
    }
  }

  .tips {
    display: block;
    font-size: 24rpx;
    color: var(--text-tertiary, #989BA3);
    margin-top: 12rpx;
  }
}
</style>
