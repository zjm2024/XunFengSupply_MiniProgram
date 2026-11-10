<template>
  <view class="pdf-document">
    <!-- #ifdef H5 -->
    <iframe class="pdf-document-frame" :src="readerUrl" :title="title" />
    <!-- #endif -->
    <!-- #ifdef APP-PLUS -->
    <view class="pdf-document-native" :config="nativeConfig" :change:config="pdfFrame.update" />
    <!-- #endif -->
    <!-- #ifdef MP-WEIXIN -->
    <view class="pdf-document-mini">
      <text>{{ error || language.messages.preparing }}</text>
      <AppButton :loading="opening" :disabled="opening" @tap="openMiniDocument">{{ title }}</AppButton>
    </view>
    <!-- #endif -->
  </view>
</template>
<script setup>
import { computed, ref, onMounted } from 'vue'
import AppButton from '@/shared/ui/AppButton/AppButton.vue'
const props = defineProps({ src: { type: String, required: true }, title: { type: String, default: 'PDF' }, language: { type: Object, required: true } })
const readerUrl = computed(() => './subPackages/content/static/pdf-viewer/index.html?embedded=1&document=1&url=' + encodeURIComponent(props.src) + '&ui=' + encodeURIComponent(JSON.stringify(props.language)))
const nativeConfig = computed(() => ({ reader: readerUrl.value, title: props.title }))
const opening = ref(false), error = ref('')
// 小程序没有内嵌DOM，文件由官方文档阅读组件展示，不进行页面路由跳转。
async function openMiniDocument() {
  // #ifdef MP-WEIXIN
  if (opening.value) return
  opening.value = true; error.value = ''
  let filePath = ''
  try {
    const file = await new Promise((resolve,reject) => uni.downloadFile({ url: props.src, success: resolve, fail: reject }))
    filePath = file.tempFilePath || ''
    if (file.statusCode !== 200 || !filePath) throw new Error(props.language.messages.previewFailed)
    await new Promise((resolve,reject) => uni.openDocument({ filePath, fileType: 'pdf', showMenu: false, success: resolve, fail: reject }))
  } catch (cause) { error.value = props.language.messages.previewFailed }
  finally {
    opening.value = false
    if (filePath) uni.getFileSystemManager().unlink({ filePath, fail: () => {} })
  }
  // #endif
}
onMounted(() => { openMiniDocument() })
</script>
<!-- #ifdef APP-PLUS -->
<script module="pdfFrame" lang="renderjs">
export default {
  mounted() { if (this.pendingConfig) this.update(this.pendingConfig) },
  beforeUnmount() { this.frame?.remove(); this.frame = null },
  methods: {
    update(config) {
      this.pendingConfig = config
      if (!config?.reader || !this.$el) return
      // 以打包页面为基址读取本地HTML，不把静态路径交给UniApp路由。
      const source = new URL(config.reader, document.baseURI).href
      if (this.frame?.src === source) return
      this.frame?.remove()
      const frame = document.createElement('iframe')
      frame.src = source; frame.title = config.title
      frame.style.cssText = 'display:block;border:0;width:100%;height:100%;background:#f3f4f6'
      this.$el.appendChild(frame); this.frame = frame
    },
  },
}
</script>
<!-- #endif -->
<style scoped>
.pdf-document { width: 100%; height: 100%; min-height: 0; background: #f3f4f6; }
.pdf-document-frame, .pdf-document-native { display: block; width: 100%; height: 100%; border: 0; }
.pdf-document-mini { display: grid; gap: 16px; padding: 24px; font-size: 14px; line-height: 1.6; }
</style>
